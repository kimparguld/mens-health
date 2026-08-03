import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import type { PrismaClient } from "@prisma/client";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { buildAdminEmailSet, createSharedCallbacks } from "./callbacks";

export type AuthConfigOptions = {
  db: PrismaClient;
  adminEmailsCsv: string;
  nextAuthSecret: string;
  googleClientId?: string;
  googleClientSecret?: string;
  resendApiKey?: string;
  /** e.g. "MenHealth Digest <no-reply@menhealth-digest.com>" — site-specific. */
  authFromEmail: string;
  /** Defaults to "/admin/login" for both, matching the original config. */
  signInPage?: string;
  errorPage?: string;
};

/**
 * Full (Node runtime) Auth.js config — Prisma adapter + Google/email sign-in,
 * admin-only route gating. Used by server components and route handlers.
 * See apps/menhealth/lib/auth/config.ts for how a site wires this up.
 */
export function createAuthConfig(opts: AuthConfigOptions): NextAuthConfig {
  const adminEmails = buildAdminEmailSet(opts.adminEmailsCsv);

  return {
    adapter: PrismaAdapter(opts.db),
    session: { strategy: "jwt" },
    secret: opts.nextAuthSecret,
    providers: [
      Google({
        clientId: opts.googleClientId ?? "",
        clientSecret: opts.googleClientSecret ?? "",
      }),
      Resend({
        apiKey: opts.resendApiKey ?? "",
        from: opts.authFromEmail,
      }),
    ],
    callbacks: {
      ...createSharedCallbacks(adminEmails),
      authorized({ auth, request }) {
        const path = request.nextUrl.pathname;
        if (!path.startsWith("/admin")) return true;
        if (path === "/admin/login") return true;
        return (
          (auth?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true
        );
      },
    },
    pages: {
      signIn: opts.signInPage ?? "/admin/login",
      error: opts.errorPage ?? "/admin/login",
    },
  };
}
