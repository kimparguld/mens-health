import { SiteConfigSchema } from "./schema";
import type { SiteConfig } from "./types";

export type {
  SiteConfig,
  TopicSeed,
  CreatorSeed,
  ForbiddenPattern,
} from "./types";
export { getHighRiskTopicSlugs } from "./types";

export {
  SiteConfigSchema,
  TopicSeedSchema,
  CreatorSeedSchema,
  ForbiddenPatternSchema,
} from "./schema";

/**
 * Identity function with type checking — gives editor autocomplete/type
 * errors while authoring a site.config.ts, with no runtime behavior.
 */
export function defineSiteConfig(config: SiteConfig): SiteConfig {
  return config;
}

/**
 * Validates a site config at build/startup time, so a new site with a
 * missing required field (e.g. no topics, no indexNowKey) fails fast
 * instead of silently shipping a broken or non-compliant site.
 */
export function validateSiteConfig(config: SiteConfig): SiteConfig {
  return SiteConfigSchema.parse(config) as SiteConfig;
}
