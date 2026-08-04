import { z } from "zod";

export const TopicCandidateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be lowercase kebab-case"),
  name: z.string().min(1).max(80),
  query: z.string().min(1).max(200),
  description: z.string().min(1).max(400),
});

export type TopicCandidate = z.infer<typeof TopicCandidateSchema>;

export type TopicSeedLike = {
  slug: string;
  name: string;
  query: string;
  isHighRisk: boolean;
  description: string;
};

const POPULARITY_WINDOW_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Median view count among videos published within the last
 * `POPULARITY_WINDOW_DAYS` days — recency-filtered so a single old viral
 * video can't prop up a currently-dead niche. Returns 0 if no videos
 * qualify.
 */
export function scoreTopicPopularity(
  videos: { viewCount: number; publishedAt: Date }[],
  now: Date = new Date(),
): number {
  const cutoff = new Date(now.getTime() - POPULARITY_WINDOW_DAYS * MS_PER_DAY);
  const recentViewCounts = videos
    .filter((video) => video.publishedAt >= cutoff)
    .map((video) => video.viewCount)
    .sort((a, b) => a - b);

  if (recentViewCounts.length === 0) return 0;

  const mid = Math.floor(recentViewCounts.length / 2);
  return recentViewCounts.length % 2 === 0
    ? Math.round((recentViewCounts[mid - 1]! + recentViewCounts[mid]!) / 2)
    : recentViewCounts[mid]!;
}

/** Case-insensitive substring match of any keyword against the candidate's combined text. */
export function isHighRiskCandidate(
  candidate: { name: string; description: string; query: string },
  keywords: string[],
): boolean {
  const haystack =
    `${candidate.name} ${candidate.description} ${candidate.query}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

/** Dedupes by slug — the static seed list always wins over an approved suggestion. */
export function mergeTopicSeeds(
  seeds: TopicSeedLike[],
  approved: TopicSeedLike[],
): TopicSeedLike[] {
  const merged = new Map(seeds.map((seed) => [seed.slug, seed]));
  for (const candidate of approved) {
    if (!merged.has(candidate.slug)) {
      merged.set(candidate.slug, candidate);
    }
  }
  return Array.from(merged.values());
}
