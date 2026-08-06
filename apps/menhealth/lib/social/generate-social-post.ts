import { env } from "@/env";
import { aiClient } from "@/lib/ai/client";
import { db } from "@/lib/db/prisma";
import {
  createSocialPostGenerator,
  isNotFoundError,
  isConflictError,
  type VideoContext,
} from "@menhealth/core-social";
import { FORBIDDEN_PATTERNS, HIGH_RISK_TOPIC_KEYWORDS } from "./platform-rules";
import { SITE_NAME } from "@/lib/site-brand";

export type {
  Result,
  GenerateSocialPostInput,
} from "@menhealth/core-social";

export { isNotFoundError, isConflictError };

async function fetchContext(videoId: string): Promise<VideoContext | null> {
  const video = await db.video.findUnique({
    where: { id: videoId },
    include: {
      summaries: { take: 1, orderBy: { createdAt: "desc" } },
      topics: { include: { topic: true } },
      claims: { take: 5, orderBy: { riskLevel: "desc" } },
    },
  });

  if (!video || video.status !== "PUBLISHED") return null;

  const summary = video.summaries[0];
  const takeaways = summary ? (summary.takeaways as string[]) : [];

  return {
    title: video.title,
    slug: video.slug,
    shortSummary: summary?.shortSummary ?? video.title,
    takeaways,
    riskLevel: video.riskLevel,
    evidenceScore: video.evidenceScore,
    topicNames: video.topics.map((vt) => vt.topic.name),
    claimTexts: video.claims.map((c) => c.text),
  };
}

export const { generateSocialPost, regenerateSocialPost, updateSocialPostDraft } =
  createSocialPostGenerator({
    db,
    fetchContext,
    aiClient,
    aiConfigured: Boolean(env.GROQ_API_KEY),
    siteName: SITE_NAME,
    contentTypeLabel: "men's health video summary",
    disclaimerLine: "Educational only. Not medical advice.",
    baseUrl: env.NEXT_PUBLIC_APP_URL,
    forbiddenPatterns: FORBIDDEN_PATTERNS,
    highRiskKeywords: HIGH_RISK_TOPIC_KEYWORDS,
  });
