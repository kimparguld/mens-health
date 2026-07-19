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
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.email) {
        token.isAdmin = adminEmails.has(user.email.toLowerCase());
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as typeof session.user & { isAdmin: boolean }).isAdmin =
          token.isAdmin as boolean;
      }
      return session;
    },
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      if (!path.startsWith("/admin")) return true;
      // Allow unauthenticated access to the login page to prevent redirect loops.
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
