import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { buildAdminEmailSet, createSharedCallbacks } from "./callbacks";

export type AuthConfigOptions = {
  /**
   * Prisma's generated client types carry generic branding tied to their
   * own generation, so even structurally-identical schemas across sites
   * produce mutually-incompatible `PrismaClient` types — there's no shared
   * type here that stays satisfied for every site. `any` at this one
   * boundary is intentional: PrismaAdapter only needs the Auth.js delegates
   * (user/account/session/verificationToken) at runtime, which every site's
   * client has regardless of its own schema.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  adminEmailsCsv: string;
  nextAuthSecret: string;
  googleClientId?: string;
  googleClientSecret?: string;
  resendApiKey?: string;
  /** e.g. "MenHealth Digest <no-reply@menhealth-digest.com>" — site-specific. */
  authFromEmail: string;
  /**
   * Namespaces the session cookie per site, e.g. "hype-check". Every site in
   * this monorepo runs on `localhost` in dev, and cookies are scoped by host
   * only (not port) — without a distinct name, sites share Auth.js's default
   * cookie name and can decrypt each other's session tokens with the wrong
   * secret, producing "no matching decryption secret" errors.
   */
  cookiePrefix: string;
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
    cookies: {
      sessionToken: { name: `${opts.cookiePrefix}.session-token` },
    },
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
