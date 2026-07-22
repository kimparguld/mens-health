import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { env } from "@/env";
import { z } from "zod";
import { cookies } from "next/headers";

const TokenResponse = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  token_type: z.string(),
  scope: z.string().optional(),
});

function errorRedirect(req: NextRequest, error: string): NextResponse {
  const url = new URL("/admin/social/accounts", req.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const stateParam = searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("oauth_state_reddit")?.value;
  cookieStore.delete("oauth_state_reddit");

  if (!expectedState || stateParam !== expectedState) {
    return errorRedirect(req, "invalid_state");
  }

  if (error || !code) {
    return errorRedirect(req, error ?? "missing_code");
  }

  // Reddit uses HTTP Basic auth: base64(client_id:client_secret)
  const credentials = Buffer.from(
    `${env.REDDIT_CLIENT_ID ?? ""}:${env.REDDIT_CLIENT_SECRET ?? ""}`,
  ).toString("base64");

  const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "MenHealthDigest/1.0",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.REDDIT_REDIRECT_URI ?? "",
    }).toString(),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error("[reddit-oauth-callback] token exchange failed", body);
    return errorRedirect(req, "token_exchange_failed");
  }

  const raw = (await tokenRes.json()) as unknown;
  const parsed = TokenResponse.safeParse(raw);
  if (!parsed.success) {
    return errorRedirect(req, "invalid_token_response");
  }

  const { access_token, refresh_token, expires_in } = parsed.data;
  const tokenExpiry = expires_in
    ? new Date(Date.now() + expires_in * 1000)
    : null;

  // Fetch Reddit username
  let handle = "Reddit account";
  try {
    const meRes = await fetch("https://oauth.reddit.com/api/v1/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "User-Agent": "MenHealthDigest/1.0",
      },
    });
    if (meRes.ok) {
      const me = (await meRes.json()) as { name?: string };
      if (me.name) handle = `u/${me.name}`;
    }
  } catch {
    // non-fatal
  }

  await db.socialAccount.upsert({
    where: { platform: "REDDIT" },
    create: {
      platform: "REDDIT",
      handle,
      accessToken: access_token,
      refreshToken: refresh_token ?? null,
      tokenExpiry,
    },
    update: {
      handle,
      accessToken: access_token,
      ...(refresh_token ? { refreshToken: refresh_token } : {}),
      tokenExpiry,
    },
  });

  return NextResponse.redirect(
    new URL("/admin/social/accounts?connected=reddit", req.url),
  );
}
