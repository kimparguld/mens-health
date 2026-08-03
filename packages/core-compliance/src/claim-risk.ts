import type { ClaimCategory, RiskLevel } from "@prisma/client";

const RISK_RANK: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

function maxRisk(...levels: RiskLevel[]): RiskLevel {
  return levels.reduce((max, level) =>
    RISK_RANK[level] > RISK_RANK[max] ? level : max,
  );
}

export type ClaimRiskConfig = {
  /**
   * Category floor: the LLM's own riskLevel suggestion can never classify a
   * claim in one of these categories below its floor — only at or above it.
   * A site fills in every ClaimCategory value from its own high-risk list
   * (AGENTS.md-style: TRT/hormones, medications, supplements, cancer, mental
   * health, ED, or whatever this site's own regulated categories are).
   */
  categoryRiskFloor: Record<ClaimCategory, RiskLevel>;
  /**
   * Safety net for claims the LLM miscategorizes (e.g. a TRT claim tagged
   * OTHER). Escalates risk to HIGH when any pattern matches; never
   * de-escalates.
   */
  highRiskTextPatterns: RegExp[];
};

/**
 * Binds the deterministic risk classifier to this site's own category floor
 * and keyword safety net, so callers keep calling
 * `classifyDeterministicRisk(category, llmSuggestedRisk, text)` exactly as
 * before (see apps/menhealth/lib/ai/claim-risk.ts).
 */
export function createClaimRiskClassifier(config: ClaimRiskConfig) {
  function matchesHighRiskPattern(text: string): boolean {
    return config.highRiskTextPatterns.some((pattern) => pattern.test(text));
  }

  // Computes the risk level actually persisted for a claim. Takes the max of
  // the category floor, the LLM's own suggestion, and a keyword safety net —
  // the LLM can push risk up but never down from what the category/keywords
  // warrant.
  function classifyDeterministicRisk(
    category: ClaimCategory,
    llmSuggestedRisk: RiskLevel,
    text: string,
  ): RiskLevel {
    const categoryFloor = config.categoryRiskFloor[category];
    const keywordFloor: RiskLevel = matchesHighRiskPattern(text)
      ? "HIGH"
      : "LOW";
    return maxRisk(categoryFloor, llmSuggestedRisk, keywordFloor);
  }

  return { classifyDeterministicRisk };
}
