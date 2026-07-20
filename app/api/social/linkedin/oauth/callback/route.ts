import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { env } from "@/env";
import { z } from "zod";

const TokenResponse = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
  token_type: z.string(),
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

  const tokenRes = await fetch(
    "https://www.linkedin.com/oauth/v2/accessToken",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: env.LINKEDIN_REDIRECT_URI ?? "",
        client_id: env.LINKEDIN_CLIENT_ID ?? "",
        client_secret: env.LINKEDIN_CLIENT_SECRET ?? "",
      }).toString(),
    },
  );

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error("[linkedin-oauth-callback] token exchange failed", body);
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

  const { access_token, refresh_token, expires_in } = parsed.data;
  const tokenExpiry = new Date(Date.now() + expires_in * 1000);

  // Fetch LinkedIn profile
  let handle = "LinkedIn account";
  try {
    const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (meRes.ok) {
      const me = (await meRes.json()) as {
        name?: string;
        email?: string;
      };
      handle = me.name ?? me.email ?? handle;
    }
  } catch {
    // non-fatal
  }

  await db.socialAccount.upsert({
    where: { platform: "LINKEDIN" },
    create: {
      platform: "LINKEDIN",
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
    new URL("/admin/social/accounts?connected=linkedin", req.url),
  );
}
