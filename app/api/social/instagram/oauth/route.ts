import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { env } from "@/env";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  if (!env.META_CLIENT_ID || !env.META_REDIRECT_URI) {
    return NextResponse.redirect(
      new URL("/admin/social/accounts?error=instagram_not_configured", req.url),
    );
  }

  const params = new URLSearchParams({
    client_id: env.META_CLIENT_ID,
    redirect_uri: env.META_REDIRECT_URI,
    scope:
      "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement",
    response_type: "code",
    state: "instagram_oauth",
  });

  return NextResponse.redirect(
    `https://www.facebook.com/dialog/oauth?${params.toString()}`,
  );
}
