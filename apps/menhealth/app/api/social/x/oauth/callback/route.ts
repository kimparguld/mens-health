import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { env } from "@/env";
import { cookies } from "next/headers";
import { z } from "zod";

const TokenResponse = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
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
  const expectedState = cookieStore.get("oauth_state_x")?.value;
  const codeVerifier = cookieStore.get("x_code_verifier")?.value;
  cookieStore.delete("oauth_state_x");
  cookieStore.delete("x_code_verifier");

  if (!expectedState || stateParam !== expectedState) {
    return errorRedirect(req, "invalid_state");
  }

  if (error || !code) {
    return errorRedirect(req, error ?? "missing_code");
  }

  if (!codeVerifier) {
    return errorRedirect(req, "missing_code_verifier");
  }

  // X requires Basic auth with client_id:client_secret for confidential clients
  const credentials = Buffer.from(
    `${env.X_CLIENT_ID ?? ""}:${env.X_CLIENT_SECRET ?? ""}`,
  ).toString("base64");

  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.X_REDIRECT_URI ?? "",
      code_verifier: codeVerifier,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error("[x-oauth-callback] token exchange failed", body);
    return errorRedirect(req, "token_exchange_failed");
  }

  const raw = (await tokenRes.json()) as unknown;
  const parsed = TokenResponse.safeParse(raw);
  if (!parsed.success) {
    return errorRedirect(req, "invalid_token_response");
  }

  const { access_token, refresh_token, expires_in } = parsed.data;
  const tokenExpiry = new Date(Date.now() + expires_in * 1000);

  // Fetch X username
  let handle = "X account";
  try {
    const meRes = await fetch("https://api.twitter.com/2/users/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (meRes.ok) {
      const me = (await meRes.json()) as { data?: { username?: string } };
      if (me.data?.username) handle = `@${me.data.username}`;
    }
  } catch {
    // non-fatal
  }

  await db.socialAccount.upsert({
    where: { platform: "X" },
    create: {
      platform: "X",
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
    new URL("/admin/social/accounts?connected=x", req.url),
  );
}
