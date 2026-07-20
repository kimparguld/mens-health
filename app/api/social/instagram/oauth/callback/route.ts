import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { env } from "@/env";
import { z } from "zod";

const TokenResponse = z.object({
  access_token: z.string(),
  expires_in: z.number().optional(),
  token_type: z.string().optional(),
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

  const tokenRes = await fetch(
    "https://graph.facebook.com/oauth/access_token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.META_CLIENT_ID ?? "",
        client_secret: env.META_CLIENT_SECRET ?? "",
        redirect_uri: env.META_REDIRECT_URI ?? "",
        code,
      }).toString(),
    },
  );

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error("[instagram-oauth-callback] token exchange failed", body);
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

  const { access_token, expires_in } = parsed.data;
  const tokenExpiry = expires_in
    ? new Date(Date.now() + expires_in * 1000)
    : null;

  // Fetch Instagram business account name via Graph API
  let handle = "Instagram account";
  try {
    const pagesRes = await fetch(
      `https://graph.facebook.com/me/accounts?access_token=${access_token}`,
    );
    if (pagesRes.ok) {
      const pages = (await pagesRes.json()) as {
        data?: Array<{
          access_token: string;
          id: string;
          instagram_business_account?: { id: string };
        }>;
      };
      const page = pages.data?.[0];
      if (page?.instagram_business_account?.id) {
        const igRes = await fetch(
          `https://graph.facebook.com/${page.instagram_business_account.id}?fields=username&access_token=${page.access_token}`,
        );
        if (igRes.ok) {
          const ig = (await igRes.json()) as { username?: string };
          if (ig.username) handle = `@${ig.username}`;
        }
      }
    }
  } catch {
    // non-fatal
  }

  await db.socialAccount.upsert({
    where: { platform: "INSTAGRAM_REELS" },
    create: {
      platform: "INSTAGRAM_REELS",
      handle,
      accessToken: access_token,
      refreshToken: null,
      tokenExpiry,
    },
    update: {
      handle,
      accessToken: access_token,
      tokenExpiry,
    },
  });

  return NextResponse.redirect(
    new URL("/admin/social/accounts?connected=instagram", req.url),
  );
}
