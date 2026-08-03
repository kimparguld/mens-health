export type TopicSeed = {
  slug: string;
  name: string;
  query: string;
  isHighRisk: boolean;
  description: string;
};

export type CreatorSeed = {
  slug: string;
  name: string;
  youtubeChannelId: string;
  description: string;
  specialty: string;
  credentials?: string;
  /**
   * Public business-contact email for this creator, if known. Only set this
   * once you have a real, verified address — creator notification emails
   * are only ever sent when this field is populated.
   */
  contactEmail?: string;
};

export type ForbiddenPattern = { pattern: RegExp; reason: string };

/**
 * The single config a new site fills in: brand identity, the topics/creators
 * it curates, and the compliance data (high-risk categories, forbidden
 * copy patterns, high-risk keywords) that drive the admin-approval gate and
 * social-content safety checks. See apps/menhealth/site.config.ts for the
 * reference implementation — copy it as the starting point for a new site.
 *
 * What's deliberately NOT here: the admin-approval gate mechanism itself,
 * the "no Reddit auto-post" rule, the disclaimer requirement, and the rest
 * of AGENTS.md's non-negotiables — those are hardcoded into packages/core-*
 * and are not something a site can configure away.
 */
export type SiteConfig = {
  /** Display name, e.g. "MenHealth Digest". */
  name: string;
  /** Short tagline shown in newsletter header etc, e.g. "Your weekly men's health briefing". */
  tagline: string;
  /** One-sentence description used in Organization JSON-LD and metadata. */
  description: string;
  /** Canonical production domain, e.g. "menhealth-digest.com" (no protocol). */
  domain: string;
  /** Canonical production URL, e.g. "https://www.menhealth-digest.com". */
  appUrl: string;
  /** IndexNow key matching the key file hosted at `${appUrl}/<key>.txt`. */
  indexNowKey: string;

  /** Topics this site discovers/curates content for. */
  topics: TopicSeed[];
  /** Well-known creators this site tracks by YouTube channel ID. */
  creators: CreatorSeed[];

  /**
   * Site-specific forbidden caption/script phrasing for AI-generated social
   * content, on top of the universal set built into core-compliance.
   */
  forbiddenContentPatterns: ForbiddenPattern[];
  /**
   * Safety-net keyword patterns that force a claim's risk to HIGH regardless
   * of what the LLM suggested (e.g. drug names, "TRT", "cancer").
   */
  highRiskTextPatterns: RegExp[];
  /**
   * Keywords that force `requiresReview = true` on generated social content
   * regardless of the computed risk level.
   */
  highRiskTopicKeywords: string[];
};

/** Derives the high-risk topic slugs from `topics[].isHighRisk` — a single source of truth. */
export function getHighRiskTopicSlugs(config: SiteConfig): string[] {
  return config.topics.filter((t) => t.isHighRisk).map((t) => t.slug);
}
