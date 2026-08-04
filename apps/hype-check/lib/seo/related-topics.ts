// Curated topic-to-topic relations for internal linking on topic hub pages.
// Small, fixed set (10 topics) — hand-curated reads better than a similarity
// heuristic at this scale.

export const RELATED_TOPICS: Record<string, string[]> = {
  "ai-tools": ["online-courses", "side-hustles", "viral-products"],
  "side-hustles": ["online-courses", "ai-tools", "remote-jobs"],
  "online-courses": ["side-hustles", "ai-tools", "remote-jobs"],
  "viral-products": ["marketplaces", "home-saving", "ai-tools"],
  marketplaces: ["viral-products", "side-hustles", "home-saving"],
  "investment-apps": ["giveaways", "side-hustles", "travel-hacks"],
  giveaways: ["investment-apps", "remote-jobs", "marketplaces"],
  "travel-hacks": ["home-saving", "investment-apps", "marketplaces"],
  "remote-jobs": ["online-courses", "giveaways", "side-hustles"],
  "home-saving": ["travel-hacks", "viral-products", "marketplaces"],
};

export function getRelatedTopicSlugs(slug: string): string[] {
  return RELATED_TOPICS[slug] ?? [];
}
