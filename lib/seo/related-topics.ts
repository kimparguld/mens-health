// Curated topic-to-topic relations for internal linking on topic hub pages.
// Small, fixed set (15 topics) — hand-curated reads better than a similarity
// heuristic at this scale.

export const RELATED_TOPICS: Record<string, string[]> = {
  testosterone: ["fertility", "erectile-dysfunction", "muscle-gain", "hair-loss", "prostate-health"],
  "fitness-over-40": ["muscle-gain", "longevity", "sleep", "weight-loss"],
  "muscle-gain": ["nutrition", "fitness-over-40", "supplements", "weight-loss"],
  longevity: ["fitness-over-40", "sleep", "nutrition", "biohacking"],
  sleep: ["mental-health", "longevity", "testosterone", "biohacking"],
  "mental-health": ["sleep", "longevity", "mens-health", "erectile-dysfunction"],
  nutrition: ["weight-loss", "muscle-gain", "supplements", "longevity"],
  "weight-loss": ["nutrition", "muscle-gain", "fitness-over-40", "biohacking"],
  "hair-loss": ["testosterone", "mens-health"],
  fertility: ["testosterone", "mens-health", "supplements"],
  "prostate-health": ["mens-health", "testosterone", "longevity"],
  "erectile-dysfunction": ["testosterone", "mental-health", "mens-health"],
  biohacking: ["longevity", "sleep", "supplements", "nutrition"],
  supplements: ["nutrition", "muscle-gain", "biohacking", "longevity"],
  "mens-health": ["longevity", "nutrition", "prostate-health", "mental-health"],
};

export function getRelatedTopicSlugs(slug: string): string[] {
  return RELATED_TOPICS[slug] ?? [];
}
