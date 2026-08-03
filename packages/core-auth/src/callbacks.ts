import type { NextAuthConfig } from "next-auth";

export function buildAdminEmailSet(adminEmailsCsv: string): Set<string> {
  return new Set(
    adminEmailsCsv
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * jwt/session callbacks shared by both the full (Node) and edge Auth.js
 * configs — they stamp isAdmin/isPremium onto the token/session the same
 * way in either runtime.
 */
export function createSharedCallbacks(
  adminEmails: Set<string>,
): Pick<NonNullable<NextAuthConfig["callbacks"]>, "jwt" | "session"> {
  return {
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
  };
}
