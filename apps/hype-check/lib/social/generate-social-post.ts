import { env } from "@/env";
import { aiClient } from "@/lib/ai/client";
import { db } from "@/lib/db/prisma";
import { createSocialPostGenerator } from "@menhealth/core-social";
import { FORBIDDEN_PATTERNS, HIGH_RISK_TOPIC_KEYWORDS } from "./platform-rules";
import { SITE_NAME } from "@/lib/site-brand";

export type {
  Result,
  GenerateSocialPostInput,
} from "@menhealth/core-social";

export const { generateSocialPost } = createSocialPostGenerator({
  db,
  aiClient,
  aiConfigured: Boolean(env.GROQ_API_KEY),
  siteName: SITE_NAME,
  baseUrl: env.NEXT_PUBLIC_APP_URL,
  forbiddenPatterns: FORBIDDEN_PATTERNS,
  highRiskKeywords: HIGH_RISK_TOPIC_KEYWORDS,
});
