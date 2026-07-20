import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { env } from "@/env";

const YOUTUBE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
].join(" ");

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  const params = new URLSearchParams({
    client_id: env.YOUTUBE_OAUTH_CLIENT_ID ?? "",
    redirect_uri: env.YOUTUBE_OAUTH_REDIRECT_URI ?? "",
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: "youtube_oauth",
  });

  return NextResponse.redirect(`${YOUTUBE_AUTH_URL}?${params.toString()}`);
}
