import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
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
    Resend({
      apiKey: env.RESEND_API_KEY ?? "",
      from:
        env.AUTH_FROM_EMAIL ??
        "MenHealth Digest <no-reply@menhealth-digest.com>",
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // Set on first sign-in; values come from the DB via PrismaAdapter.
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
