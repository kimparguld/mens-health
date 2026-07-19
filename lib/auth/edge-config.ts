/**
 * Edge-safe Auth.js config — no Node.js-only modules (e.g. Prisma, env.ts).
 * Used exclusively by middleware.ts which runs in the Edge Runtime.
 * Server components and route handlers use the full config in config.ts.
 */
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
// Read process.env directly — @t3-oss/env-nextjs createEnv is not Edge-compatible.
const adminEmails = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export const edgeAuthConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
    // Resend is intentionally omitted here — the edge runtime has no DB adapter.
    // The full config in config.ts handles email sign-in in Node.js route handlers.
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.email
          ? adminEmails.has(user.email.toLowerCase())
          : false;
        token.isPremium = (user as { isPremium?: boolean }).isPremium ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const u = session.user as typeof session.user & {
          id: string;
          isAdmin: boolean;
          isPremium: boolean;
        };
        u.id = token.id as string;
        u.isAdmin = token.isAdmin as boolean;
        u.isPremium = token.isPremium as boolean;
      }
      return session;
    },
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
    signIn: "/admin/login",
    error: "/admin/login",
  },
};
