import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { env } from "@/env";
import { cookies } from "next/headers";
import crypto from "crypto";

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  if (!env.X_CLIENT_ID || !env.X_REDIRECT_URI) {
    return NextResponse.redirect(
      new URL("/admin/social/accounts?error=x_not_configured", req.url),
    );
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const state = crypto.randomBytes(32).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set("x_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  cookieStore.set("oauth_state_x", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.X_CLIENT_ID,
    redirect_uri: env.X_REDIRECT_URI,
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return NextResponse.redirect(
    `https://twitter.com/i/oauth2/authorize?${params.toString()}`,
  );
}
