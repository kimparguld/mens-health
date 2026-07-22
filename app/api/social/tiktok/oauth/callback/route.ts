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
  open_id: z.string().optional(),
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
  const expectedState = cookieStore.get("oauth_state_tiktok")?.value;
  cookieStore.delete("oauth_state_tiktok");

  if (!expectedState || stateParam !== expectedState) {
    return errorRedirect(req, "invalid_state");
  }

  if (error || !code) {
    return errorRedirect(req, error ?? "missing_code");
  }

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: env.TIKTOK_CLIENT_ID ?? "",
      client_secret: env.TIKTOK_CLIENT_SECRET ?? "",
      code,
      grant_type: "authorization_code",
      redirect_uri: env.TIKTOK_REDIRECT_URI ?? "",
    }).toString(),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error("[tiktok-oauth-callback] token exchange failed", body);
    return errorRedirect(req, "token_exchange_failed");
  }

  const raw = (await tokenRes.json()) as unknown;
  const parsed = TokenResponse.safeParse(raw);
  if (!parsed.success) {
    return errorRedirect(req, "invalid_token_response");
  }

  const { access_token, refresh_token, expires_in, open_id } = parsed.data;
  const tokenExpiry = expires_in
    ? new Date(Date.now() + expires_in * 1000)
    : null;

  // Fetch TikTok display name
  let handle = open_id ? `tiktok:${open_id}` : "TikTok account";
  try {
    const meRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=display_name,username",
      { headers: { Authorization: `Bearer ${access_token}` } },
    );
    if (meRes.ok) {
      const me = (await meRes.json()) as {
        data?: { user?: { display_name?: string; username?: string } };
      };
      const user = me.data?.user;
      handle = user?.username ?? user?.display_name ?? handle;
    }
  } catch {
    // non-fatal
  }

  await db.socialAccount.upsert({
    where: { platform: "TIKTOK" },
    create: {
      platform: "TIKTOK",
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
    new URL("/admin/social/accounts?connected=tiktok", req.url),
  );
}
