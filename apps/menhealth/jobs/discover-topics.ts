import { db } from "@/lib/db/prisma";
import { siteConfig } from "@/site.config";
import { searchAndEnrichVideos } from "@/lib/youtube/client";
import { discoverTopicCandidates } from "@/lib/topics/discover-candidates";
import { TOPIC_SEEDS } from "@/lib/youtube/topics";
import { scoreTopicPopularity, isHighRiskCandidate } from "@menhealth/core-youtube";

// Median views (last 90 days) across a candidate's top search results.
// Low enough to catch a genuinely emerging niche, high enough to filter out
// queries with no real audience on YouTube.
const MIN_POPULARITY_SCORE = 5_000;
const SEARCH_RESULTS_PER_CANDIDATE = 10;
const EVIDENCE_SAMPLE_SIZE = 3;

export async function discoverTopics(): Promise<{
  evaluated: number;
  created: number;
  errors: number;
}> {
  let evaluated = 0;
  let created = 0;
  let errors = 0;

  const existingSuggestions = await db.topicSuggestion.findMany({
    select: { slug: true },
  });
  const excludeSlugs = [
    ...TOPIC_SEEDS.map((topic) => topic.slug),
    ...existingSuggestions.map((suggestion) => suggestion.slug),
  ];

  const candidatesResult = await discoverTopicCandidates(excludeSlugs);
  if (!candidatesResult.ok) {
    console.error(
      "Topic candidate generation failed:",
      candidatesResult.error,
    );
    return { evaluated: 0, created: 0, errors: 1 };
  }

  for (const candidate of candidatesResult.value) {
    if (excludeSlugs.includes(candidate.slug)) continue;
    evaluated++;

    try {
      const videos = await searchAndEnrichVideos(
        candidate.query,
        SEARCH_RESULTS_PER_CANDIDATE,
      );

      const popularityScore = scoreTopicPopularity(
        videos.map((video) => ({
          viewCount: video.viewCount,
          publishedAt: video.publishedAt,
        })),
      );

      if (popularityScore < MIN_POPULARITY_SCORE) continue;

      const evidence = [...videos]
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, EVIDENCE_SAMPLE_SIZE)
        .map((video) => ({ title: video.title, viewCount: video.viewCount }));

      const suggestedIsHighRisk = isHighRiskCandidate(
        candidate,
        siteConfig.highRiskTopicKeywords,
      );

      await db.topicSuggestion.upsert({
        where: { slug: candidate.slug },
        create: {
          slug: candidate.slug,
          name: candidate.name,
          query: candidate.query,
          description: candidate.description,
          suggestedIsHighRisk,
          popularityScore,
          evidence,
        },
        update: {},
      });
      created++;
    } catch (error) {
      console.error(
        `Error evaluating topic candidate "${candidate.slug}":`,
        error,
      );
      errors++;
    }
  }

  return { evaluated, created, errors };
}
