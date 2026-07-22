import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { env } from "@/env";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  if (!env.LINKEDIN_CLIENT_ID || !env.LINKEDIN_REDIRECT_URI) {
    return NextResponse.redirect(
      new URL("/admin/social/accounts?error=linkedin_not_configured", req.url),
    );
  }

  const state = crypto.randomBytes(32).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set("oauth_state_linkedin", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.LINKEDIN_CLIENT_ID,
    redirect_uri: env.LINKEDIN_REDIRECT_URI,
    scope: "openid profile w_member_social",
    state,
  });

  return NextResponse.redirect(
    `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`,
  );
}
