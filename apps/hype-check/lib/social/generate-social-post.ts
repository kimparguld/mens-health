import { env } from '@/env';
import { aiClient } from '@/lib/ai/client';
import { db } from '@/lib/db/prisma';
import { SITE_NAME } from '@/lib/site-brand';
import {
  createSocialPostGenerator,
  isConflictError,
  isNotFoundError,
  type VideoContext,
} from '@menhealth/core-social';
import { FORBIDDEN_PATTERNS, HIGH_RISK_TOPIC_KEYWORDS } from './platform-rules';

export type { GenerateSocialPostInput, Result } from '@menhealth/core-social';

export { isConflictError, isNotFoundError };

async function fetchContext(subjectId: string): Promise<VideoContext | null> {
  const subject = await db.subject.findUnique({
    where: { id: subjectId },
    include: {
      sourceVideos: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        include: { summaries: { take: 1, orderBy: { createdAt: 'desc' } } },
      },
      topics: { include: { topic: true } },
      claims: { take: 5, orderBy: { riskLevel: 'desc' } },
    },
  });

  if (!subject || subject.status !== 'PUBLISHED') return null;

  const summary = subject.sourceVideos[0]?.summaries[0];
  const takeaways = summary ? (summary.takeaways as string[]) : [];

  return {
    title: subject.name,
    slug: subject.slug,
    shortSummary: summary?.shortSummary ?? subject.name,
    takeaways,
    riskLevel: subject.riskLevel,
    evidenceScore: subject.evidenceScore,
    topicNames: subject.topics.map((st) => st.topic.name),
    claimTexts: subject.claims.map((c) => c.text),
  };
}

export const {
  generateSocialPost,
  regenerateSocialPost,
  updateSocialPostDraft,
} = createSocialPostGenerator({
  db,
  fetchContext,
  aiClient,
  aiConfigured: Boolean(env.GROQ_API_KEY),
  siteName: SITE_NAME,
  contentTypeLabel: 'product/course/side-hustle review',
  disclaimerLine: 'Educational only. Not financial advice.',
  baseUrl: env.NEXT_PUBLIC_APP_URL,
  forbiddenPatterns: FORBIDDEN_PATTERNS,
  highRiskKeywords: HIGH_RISK_TOPIC_KEYWORDS,
});
