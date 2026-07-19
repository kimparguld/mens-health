import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db/prisma";
import { env } from "@/env";

const adminEmails = new Set(
  env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()),
);

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  secret: env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: env.AUTH_GOOGLE_ID ?? "",
      clientSecret: env.AUTH_GOOGLE_SECRET ?? "",
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
