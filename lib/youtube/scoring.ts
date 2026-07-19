// ---------------------------------------------------------------------------
// Video scoring — pure functions, no side effects, fully unit-testable
// ---------------------------------------------------------------------------

export type ScoreInput = {
  viewCount: number;
  likeCount: number | undefined;
  commentCount: number | undefined;
  publishedAt: Date;
  channelTrustScore: number; // 0.0 – 1.0
  titleRelevance: number; // 0.0 – 1.0
  topicMatch: number; // 0.0 – 1.0
  containsHighRiskClaims: boolean;
};

export type ScoreOutput = {
  trendScore: number;
  relevanceScore: number;
};

const WEIGHTS = {
  recency: 0.25,
  viewVelocity: 0.2,
  engagement: 0.15,
  channelAuthority: 0.2,
  topicRelevance: 0.2,
} as const;

const PENALTIES = {
  clickbait: 0.15,
  highRisk: 0.2,
} as const;

// Decay score for recency: full score within 3 days, half score at 7 days, zero at 30 days
function recencyScore(publishedAt: Date): number {
  const ageInDays =
    (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays <= 3) return 1.0;
  if (ageInDays >= 30) return 0.0;
  return Math.max(0, 1 - (ageInDays - 3) / 27);
}

// Like ratio as a proxy for engagement quality
function engagementScore(
  viewCount: number,
  likeCount: number | undefined,
  commentCount: number | undefined,
): number {
  if (viewCount === 0) return 0;
  const likeRatio = likeCount != null ? likeCount / viewCount : 0;
  const commentRatio = commentCount != null ? commentCount / viewCount : 0;
  // Typical healthy like ratio is 2–8%. Normalize to 0–1 with ceiling at 10%.
  const normalizedLikes = Math.min(likeRatio / 0.1, 1);
  const normalizedComments = Math.min(commentRatio / 0.02, 1);
  return normalizedLikes * 0.7 + normalizedComments * 0.3;
}

// View count score — log-normalized. 1M views → ~1.0, 1k views → ~0.5
function viewVelocityScore(viewCount: number): number {
  if (viewCount <= 0) return 0;
  return Math.min(Math.log10(viewCount) / 6, 1);
}

const CLICKBAIT_PATTERNS = [
  /doctor\s+hates/i,
  /secret\s+(they|doctors?)\s+(don't|do not|won't)\s+tell/i,
  /miracle\s+cure/i,
  /\d+x\s+(testosterone|growth|muscle)/i,
  /overnight\s+(results?|transformation)/i,
  /one\s+weird\s+trick/i,
  /big\s+pharma\s+(doesn't|does not|won't)/i,
];

export function detectsClickbait(title: string): boolean {
  return CLICKBAIT_PATTERNS.some((pattern) => pattern.test(title));
}

export function scoreVideo(input: ScoreInput, title: string): ScoreOutput {
  const isClickbait = detectsClickbait(title);

  const rawTrendScore =
    WEIGHTS.recency * recencyScore(input.publishedAt) +
    WEIGHTS.viewVelocity * viewVelocityScore(input.viewCount) +
    WEIGHTS.engagement *
      engagementScore(input.viewCount, input.likeCount, input.commentCount) +
    WEIGHTS.channelAuthority * input.channelTrustScore +
    WEIGHTS.topicRelevance * input.topicMatch;

  const clickbaitPenalty = isClickbait ? PENALTIES.clickbait : 0;
  const riskPenalty = input.containsHighRiskClaims ? PENALTIES.highRisk : 0;

  const trendScore = Math.max(
    0,
    rawTrendScore - clickbaitPenalty - riskPenalty,
  );
  const relevanceScore = input.titleRelevance * input.topicMatch;

  return {
    trendScore: parseFloat(trendScore.toFixed(4)),
    relevanceScore: parseFloat(relevanceScore.toFixed(4)),
  };
}
