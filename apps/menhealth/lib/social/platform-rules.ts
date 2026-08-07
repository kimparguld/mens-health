import {
  checkForbiddenPatterns as baseCheckForbiddenPatterns,
  detectHighRiskTopic as baseDetectHighRiskTopic,
  type ForbiddenPatternMatch,
} from "@menhealth/core-compliance";
import type { Platform } from "@prisma/client";
import { siteConfig } from "@/site.config";

export type { ForbiddenPatternMatch } from "@menhealth/core-compliance";

export {
  PLATFORM_CONSTRAINTS,
  validatePlatformConstraints,
} from "@menhealth/core-social";
export type { PlatformConstraints } from "@menhealth/core-social";

export const FORBIDDEN_PATTERNS = siteConfig.forbiddenContentPatterns;
export const HIGH_RISK_TOPIC_KEYWORDS = siteConfig.highRiskTopicKeywords;

/**
 * Check caption or script text against the forbidden patterns list.
 * Returns all violations found.
 */
export function checkForbiddenPatterns(text: string): ForbiddenPatternMatch {
  return baseCheckForbiddenPatterns(text, FORBIDDEN_PATTERNS);
}

/**
 * Determine whether the given topic/summary text contains high-risk health subjects.
 */
export function detectHighRiskTopic(text: string): boolean {
  return baseDetectHighRiskTopic(text, HIGH_RISK_TOPIC_KEYWORDS);
}

export const VIDEO_CAPABLE_PLATFORMS: readonly Platform[] = [
  "TIKTOK",
  "YOUTUBE_COMMUNITY",
];

/**
 * Both platforms publish a 9:16 video-shaped asset — TikTok directly,
 * YouTube Community by the admin uploading it as a Short. Reddit and X
 * stay text-only.
 */
export function supportsVideoGeneration(platform: Platform): boolean {
  return VIDEO_CAPABLE_PLATFORMS.includes(platform);
}
