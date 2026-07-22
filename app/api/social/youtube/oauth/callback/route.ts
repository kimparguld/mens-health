import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { env } from "@/env";
import { z } from "zod";
import { cookies } from "next/headers";

const TokenResponse = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
  token_type: z.string(),
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
  const expectedState = cookieStore.get("oauth_state_youtube")?.value;
  cookieStore.delete("oauth_state_youtube");

  if (!expectedState || stateParam !== expectedState) {
    return errorRedirect(req, "invalid_state");
  }

  if (error || !code) {
    return errorRedirect(req, error ?? "missing_code");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.YOUTUBE_OAUTH_CLIENT_ID ?? "",
      client_secret: env.YOUTUBE_OAUTH_CLIENT_SECRET ?? "",
      redirect_uri: env.YOUTUBE_OAUTH_REDIRECT_URI ?? "",
      grant_type: "authorization_code",
    }).toString(),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error("[youtube-oauth-callback] token exchange failed", body);
    return errorRedirect(req, "token_exchange_failed");
  }

  const raw = (await tokenRes.json()) as unknown;
  const parsed = TokenResponse.safeParse(raw);
  if (!parsed.success) {
    console.error("[youtube-oauth-callback] unexpected token shape", raw);
    return errorRedirect(req, "invalid_token_response");
  }

  const { access_token, refresh_token, expires_in } = parsed.data;
  const tokenExpiry = new Date(Date.now() + expires_in * 1000);

  // Fetch the channel handle for display purposes
  let handle = "YouTube channel";
  try {
    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      { headers: { Authorization: `Bearer ${access_token}` } },
    );
    if (channelRes.ok) {
      const data = (await channelRes.json()) as {
        items?: Array<{ snippet?: { title?: string; customUrl?: string } }>;
      };
      const snippet = data.items?.[0]?.snippet;
      handle = snippet?.customUrl ?? snippet?.title ?? handle;
    }
  } catch {
    // non-fatal — handle stays as default
  }

  await db.socialAccount.upsert({
    where: { platform: "YOUTUBE_SHORTS" },
    create: {
      platform: "YOUTUBE_SHORTS",
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
    new URL("/admin/social/accounts?connected=youtube", req.url),
  );
}
