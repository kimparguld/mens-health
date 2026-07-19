import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(32),
    AUTH_GOOGLE_ID: z.string().min(1).optional(),
    AUTH_GOOGLE_SECRET: z.string().min(1).optional(),
    ADMIN_EMAILS: z.string().min(1),
    YOUTUBE_API_KEY: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().min(1).optional(),
    RESEND_SEGMENT_ID: z.string().min(1).optional(),
    AUTH_FROM_EMAIL: z.string().min(1).optional(),
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    STRIPE_PRICE_ID: z.string().min(1).optional(),
    CRON_SECRET: z.string().min(32),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    RESEND_SEGMENT_ID: process.env.RESEND_SEGMENT_ID,
    AUTH_FROM_EMAIL: process.env.AUTH_FROM_EMAIL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
    CRON_SECRET: process.env.CRON_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  emptyStringAsUndefined: true,
});
