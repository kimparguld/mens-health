export type ForbiddenPatternMatch = {
  matched: boolean;
  violations: Array<{ pattern: string; reason: string }>;
};

/**
 * Check caption or script text against a site's forbidden-patterns list
 * (fear-based, misleading, or personal-condition copy). Returns all
 * violations found. `patterns` is the site's own list — see
 * apps/menhealth/lib/social/platform-rules.ts for the men's-health set.
 */
export function checkForbiddenPatterns(
  text: string,
  patterns: Array<{ pattern: RegExp; reason: string }>,
): ForbiddenPatternMatch {
  const violations = patterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ pattern, reason }) => ({ pattern: pattern.toString(), reason }));

  return { matched: violations.length > 0, violations };
}

/**
 * Determine whether the given topic/summary text contains high-risk subject
 * keywords that always force requiresReview = true regardless of riskLevel.
 * `keywords` is the site's own list.
 */
export function detectHighRiskTopic(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}
