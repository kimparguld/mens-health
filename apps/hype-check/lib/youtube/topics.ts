import { siteConfig } from "@/site.config";
import { db } from "@/lib/db/prisma";
import { mergeTopicSeeds, type TopicSeedLike } from "@menhealth/core-youtube";

export type { TopicSeed } from "@menhealth/site-kit";
export const TOPIC_SEEDS = siteConfig.topics;

// Static seeds from site.config.ts plus any admin-approved TopicSuggestion
// rows, merged at runtime. Approved suggestions never get written back into
// site.config.ts — this is how they reach sync-youtube and the admin
// topics table without a code change.
export async function getAllTopicSeeds(): Promise<TopicSeedLike[]> {
  const approved = await db.topicSuggestion.findMany({
    where: { status: "APPROVED" },
  });
  return mergeTopicSeeds(
    TOPIC_SEEDS,
    approved.map((suggestion) => ({
      slug: suggestion.slug,
      name: suggestion.name,
      query: suggestion.query,
      isHighRisk: suggestion.suggestedIsHighRisk,
      description: suggestion.description,
    })),
  );
}
