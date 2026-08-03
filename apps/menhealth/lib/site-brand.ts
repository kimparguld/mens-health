import { siteConfig } from "@/site.config";

// Single source of truth for this site's brand strings used across SEO
// metadata/schema builders and the newsletter. A new site fills these in via
// site.config.ts — this file just re-exports the pieces most callers want by
// name for a shorter import.
export const SITE_NAME = siteConfig.name;
export const SITE_DESCRIPTION = siteConfig.description;
export const INDEXNOW_KEY = siteConfig.indexNowKey;
