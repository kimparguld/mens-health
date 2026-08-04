import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { buildAdminEmailSet, createSharedCallbacks } from "./callbacks";

export type EdgeAuthConfigOptions = {
  adminEmailsCsv: string;
  nextAuthSecret: string | undefined;
  googleClientId?: string;
  googleClientSecret?: string;
  signInPage?: string;
  errorPage?: string;
  /** See AuthConfigOptions.cookiePrefix in node-config.ts — must match it. */
  cookiePrefix: string;
};

/**
 * Edge-safe Auth.js config — no Node.js-only modules (Prisma, an env.ts
 * built on @t3-oss/env-nextjs). Intended for edge middleware/proxy; the
 * caller must read its own env vars via raw `process.env` (edge-compatible)
 * and pass them in, since the validated env.ts wrapper isn't edge-safe.
 * Resend sign-in is intentionally omitted — the edge runtime has no DB
 * adapter. The full config in node-config.ts handles email sign-in.
 */
export function createEdgeAuthConfig(
  opts: EdgeAuthConfigOptions,
): NextAuthConfig {
  const adminEmails = buildAdminEmailSet(opts.adminEmailsCsv);

  return {
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
    ],
    callbacks: {
      ...createSharedCallbacks(adminEmails),
      authorized({ auth, request }) {
        const path = request.nextUrl.pathname;

        // /account requires any authenticated user.
        if (path.startsWith("/account")) {
          if (auth?.user) return true;
          const url = request.nextUrl.clone();
          url.pathname = "/signin";
          url.searchParams.set("callbackUrl", path);
          return Response.redirect(url);
        }

        // /admin requires an admin user.
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
