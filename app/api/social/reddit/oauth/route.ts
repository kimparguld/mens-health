import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { env } from "@/env";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  if (!env.REDDIT_CLIENT_ID || !env.REDDIT_REDIRECT_URI) {
    return NextResponse.redirect(
      new URL("/admin/social/accounts?error=reddit_not_configured", req.url),
    );
  }

  const params = new URLSearchParams({
    client_id: env.REDDIT_CLIENT_ID,
    response_type: "code",
    state: "reddit_oauth",
    redirect_uri: env.REDDIT_REDIRECT_URI,
    duration: "permanent",
    scope: "submit read identity",
  });

  return NextResponse.redirect(
    `https://www.reddit.com/api/v1/authorize?${params.toString()}`,
  );
}
