import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { env } from "@/env";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  if (!env.TIKTOK_CLIENT_ID || !env.TIKTOK_REDIRECT_URI) {
    return NextResponse.redirect(
      new URL("/admin/social/accounts?error=tiktok_not_configured", req.url),
    );
  }

  const params = new URLSearchParams({
    client_key: env.TIKTOK_CLIENT_ID,
    response_type: "code",
    scope: "user.info.basic,video.publish",
    redirect_uri: env.TIKTOK_REDIRECT_URI,
    state: "tiktok_oauth",
  });

  return NextResponse.redirect(
    `https://www.tiktok.com/v2/auth/authorize?${params.toString()}`,
  );
}
