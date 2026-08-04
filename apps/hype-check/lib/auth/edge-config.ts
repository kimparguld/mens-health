/**
 * Edge-safe Auth.js config — reads process.env directly (not @/env, which
 * isn't Edge-compatible) and delegates to the shared edge config factory.
 * Used exclusively by edge middleware/proxy, if/when it needs auth-gated
 * routing; the full config in config.ts handles server components/routes.
 */
import type { NextAuthConfig } from "next-auth";
import { createEdgeAuthConfig } from "@menhealth/core-auth";

export const edgeAuthConfig: NextAuthConfig = createEdgeAuthConfig({
  cookiePrefix: "hype-check",
  adminEmailsCsv: process.env.ADMIN_EMAILS ?? "",
  nextAuthSecret: process.env.NEXTAUTH_SECRET,
  googleClientId: process.env.AUTH_GOOGLE_ID,
  googleClientSecret: process.env.AUTH_GOOGLE_SECRET,
});
