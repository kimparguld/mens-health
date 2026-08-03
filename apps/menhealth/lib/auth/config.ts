import type { NextAuthConfig } from "next-auth";
import { db } from "@/lib/db/prisma";
import { env } from "@/env";
import { createAuthConfig } from "@menhealth/core-auth";

export const authConfig: NextAuthConfig = createAuthConfig({
  db,
  adminEmailsCsv: env.ADMIN_EMAILS,
  nextAuthSecret: env.NEXTAUTH_SECRET,
  googleClientId: env.AUTH_GOOGLE_ID,
  googleClientSecret: env.AUTH_GOOGLE_SECRET,
  resendApiKey: env.RESEND_API_KEY,
  authFromEmail:
    env.AUTH_FROM_EMAIL ?? "MenHealth Digest <no-reply@menhealth-digest.com>",
});
