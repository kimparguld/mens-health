import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { env } from "@/env";
import { z } from "zod";

const TokenResponse = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  open_id: z.string().optional(),
  scope: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(
        `/admin/social/accounts?error=${error ?? "missing_code"}`,
        req.url,
      ),
    );
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
    return NextResponse.redirect(
      new URL("/admin/social/accounts?error=token_exchange_failed", req.url),
    );
  }

  const raw = (await tokenRes.json()) as unknown;
  const parsed = TokenResponse.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.redirect(
      new URL("/admin/social/accounts?error=invalid_token_response", req.url),
    );
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
