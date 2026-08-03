import type { ClaimCategory, RiskLevel } from "@prisma/client";

// Category floor: the LLM's own riskLevel suggestion can never classify a
// claim in one of these categories below its floor — only at or above it.
// This closes the gap where category and riskLevel were previously
// independent, uncross-checked LLM outputs (AGENTS.md names TRT/testosterone,
// medications, supplements, cancer, mental health, and ED as high-risk).
export const CATEGORY_RISK_FLOOR: Record<ClaimCategory, RiskLevel> = {
  HORMONES: "HIGH",
  SEXUAL_HEALTH: "HIGH",
  MENTAL_HEALTH: "HIGH",
  SUPPLEMENTS: "HIGH",
  MEDICATIONS: "HIGH",
  CANCER: "HIGH",
  NUTRITION: "LOW",
  EXERCISE: "LOW",
  LONGEVITY: "LOW",
  OTHER: "LOW",
};

const RISK_RANK: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

// Safety net for claims the LLM miscategorizes (e.g. a TRT claim tagged
// OTHER) — same style as detectsClickbait in lib/youtube/scoring.ts.
// Escalates risk when it fires; never de-escalates.
const HIGH_RISK_TEXT_PATTERNS: RegExp[] = [
  /testosterone/i,
  /\btrt\b/i,
  /\banabolic\b|\bsteroids?\b/i,
  /finasteride|minoxidil|dutasteride/i,
  /viagra|cialis|sildenafil|tadalafil/i,
  /\bcancer\b|tumou?r|oncolog/i,
  /antidepressant|\bssri\b|\bmedication\b|prescription/i,
  /\bdosage\b.*\d+\s*(mg|mcg|iu)\b/i,
];

function matchesHighRiskPattern(text: string): boolean {
  return HIGH_RISK_TEXT_PATTERNS.some((pattern) => pattern.test(text));
}

function maxRisk(...levels: RiskLevel[]): RiskLevel {
  return levels.reduce((max, level) =>
    RISK_RANK[level] > RISK_RANK[max] ? level : max,
  );
}

// Computes the risk level actually persisted for a claim. Takes the max of
// the category floor, the LLM's own suggestion, and a keyword safety net —
// the LLM can push risk up but never down from what the category/keywords
// warrant.
export function classifyDeterministicRisk(
  category: ClaimCategory,
  llmSuggestedRisk: RiskLevel,
  text: string,
): RiskLevel {
  const categoryFloor = CATEGORY_RISK_FLOOR[category];
  const keywordFloor: RiskLevel = matchesHighRiskPattern(text)
    ? "HIGH"
    : "LOW";
  return maxRisk(categoryFloor, llmSuggestedRisk, keywordFloor);
}
