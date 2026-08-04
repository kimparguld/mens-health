import { siteConfig } from "@/site.config";

// Single source of truth for this site's brand strings used across SEO
// metadata/schema builders and the newsletter. A new site fills these in via
// site.config.ts — this file just re-exports the pieces most callers want by
// name for a shorter import.
export const SITE_NAME = siteConfig.name;
export const SITE_DESCRIPTION = siteConfig.description;
export const INDEXNOW_KEY = siteConfig.indexNowKey;

// Passed to the shared <Disclaimer> component, which takes no default text —
// each site owns its own regulatory copy.
export const DISCLAIMER_TEXT =
  "Educational content only. This page summarizes publicly available video content and public sources for informational purposes. It is not financial, legal, or professional advice, and no verdict here is a guarantee about any product, company, or individual. Do your own research before making any purchase or investment decision.";
