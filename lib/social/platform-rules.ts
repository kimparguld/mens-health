import type { Platform } from "@prisma/client";

export type PlatformConstraints = {
  maxCaptionChars: number;
  maxHashtags: number;
  maxScriptWords: number;
  maxHookChars: number;
};

export const PLATFORM_CONSTRAINTS: Record<Platform, PlatformConstraints> = {
  YOUTUBE_COMMUNITY: {
    maxCaptionChars: 5000,
    maxHashtags: 15,
    maxScriptWords: 500,
    maxHookChars: 100,
  },
  TIKTOK: {
    maxCaptionChars: 2200,
    maxHashtags: 30,
    maxScriptWords: 200,
    maxHookChars: 100,
  },
  INSTAGRAM_REELS: {
    maxCaptionChars: 2200,
    maxHashtags: 30,
    maxScriptWords: 200,
    maxHookChars: 100,
  },
  REDDIT: {
    maxCaptionChars: 40000,
    maxHashtags: 0,
    maxScriptWords: 500,
    maxHookChars: 300,
  },
  LINKEDIN: {
    maxCaptionChars: 3000,
    maxHashtags: 5,
    maxScriptWords: 300,
    maxHookChars: 150,
  },
  X: {
    maxCaptionChars: 280,
    maxHashtags: 3,
    maxScriptWords: 50,
    maxHookChars: 280,
  },
};

/**
 * Forbidden caption patterns that must never appear in generated social content.
 * These patterns match fear-based, misleading, or personal-condition copy.
 */
const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /fix\s+your\s+(testosterone|energy|hormones|libido|ed)/i,
    reason: "Personal-condition directive language",
  },
  {
    pattern: /this\s+cures?/i,
    reason: "Unsubstantiated cure claim",
  },
  {
    pattern: /doctors?\s+don.t\s+want\s+you\s+to\s+know/i,
    reason: "Fear-based anti-establishment copy",
  },
  {
    pattern: /every\s+man\s+needs\s+this/i,
    reason: "Universal personal-condition targeting",
  },
  {
    pattern: /guaranteed\s+to/i,
    reason: "Unsubstantiated guarantee",
  },
  {
    pattern: /proven\s+to\s+(cure|reverse|fix|eliminate)/i,
    reason: "Unsubstantiated proof claim",
  },
  {
    pattern:
      /you\s+(have|might\s+have|could\s+have)\s+(low\s+testosterone|ed|depression|anxiety)/i,
    reason: "Implies the reader has a medical condition",
  },
  {
    pattern: /reverse\s+(aging|hair\s+loss|low\s+t)/i,
    reason: "Unsubstantiated reversal claim",
  },
];

export type ForbiddenPatternMatch = {
  matched: boolean;
  violations: Array<{ pattern: string; reason: string }>;
};

/**
 * Check caption or script text against the forbidden patterns list.
 * Returns all violations found.
 */
export function checkForbiddenPatterns(text: string): ForbiddenPatternMatch {
  const violations = FORBIDDEN_PATTERNS.filter(({ pattern }) =>
    pattern.test(text),
  ).map(({ pattern, reason }) => ({ pattern: pattern.toString(), reason }));

  return { matched: violations.length > 0, violations };
}

/**
 * Validate that generated content fits within platform constraints.
 */
export function validatePlatformConstraints(
  platform: Platform,
  content: {
    caption: string;
    hashtags: string[];
    script: string;
    hook: string;
  },
): Array<string> {
  const constraints = PLATFORM_CONSTRAINTS[platform];
  const errors: string[] = [];

  if (content.caption.length > constraints.maxCaptionChars) {
    errors.push(
      `Caption exceeds ${constraints.maxCaptionChars} chars for ${platform} (got ${content.caption.length})`,
    );
  }
  if (content.hashtags.length > constraints.maxHashtags) {
    errors.push(
      `Too many hashtags for ${platform}: max ${constraints.maxHashtags}, got ${content.hashtags.length}`,
    );
  }
  const wordCount = content.script.split(/\s+/).filter(Boolean).length;
  if (wordCount > constraints.maxScriptWords) {
    errors.push(
      `Script exceeds ${constraints.maxScriptWords} words for ${platform} (got ${wordCount})`,
    );
  }
  if (content.hook.length > constraints.maxHookChars) {
    errors.push(
      `Hook exceeds ${constraints.maxHookChars} chars for ${platform} (got ${content.hook.length})`,
    );
  }
  return errors;
}

/**
 * High-risk topic keywords that always force requiresReview = true regardless of riskLevel.
 */
const HIGH_RISK_TOPIC_KEYWORDS = [
  "testosterone",
  "trt",
  "trt therapy",
  "medications",
  "prescription",
  "ed treatment",
  "erectile dysfunction",
  "cancer",
  "depression",
  "anxiety",
  "mental health",
  "suicide",
  "supplement",
  "steroids",
  "hormone replacement",
];

/**
 * Determine whether the given topic/summary text contains high-risk health subjects.
 */
export function detectHighRiskTopic(text: string): boolean {
  const lower = text.toLowerCase();
  return HIGH_RISK_TOPIC_KEYWORDS.some((kw) => lower.includes(kw));
}
