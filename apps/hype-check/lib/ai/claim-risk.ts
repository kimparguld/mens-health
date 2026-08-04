import type { ClaimCategory, RiskLevel } from "@/app/generated/prisma";
import { createClaimRiskClassifier } from "@menhealth/core-compliance";
import { siteConfig } from "@/site.config";

// Category floor — closes the gap where category and riskLevel were
// previously independent, uncross-checked LLM outputs. Keyed by the
// Prisma-schema ClaimCategory enum, so it stays here rather than in
// site.config.ts (which doesn't know this site's DB schema).
//
// Hype Check's own claim taxonomy: SAFETY/LEGITIMACY/REGULATION/GUARANTEE
// claims carry real financial/legal harm if wrong (e.g. "guaranteed 40%
// monthly returns", "SEC-registered") and never de-escalate below HIGH.
// INCOME/PRICING/ENDORSEMENT are misleading-but-recoverable claims (a
// specific dollar figure, a hidden fee, a paid-but-undisclosed endorsement).
// PERFORMANCE/POPULARITY/SCARCITY are the lowest-stakes claim types
// (product speed/quality, social proof, urgency language).
export const CATEGORY_RISK_FLOOR: Record<ClaimCategory, RiskLevel> = {
  SAFETY: "HIGH",
  LEGITIMACY: "HIGH",
  REGULATION: "HIGH",
  GUARANTEE: "HIGH",
  INCOME: "MEDIUM",
  PRICING: "MEDIUM",
  ENDORSEMENT: "MEDIUM",
  PERFORMANCE: "LOW",
  POPULARITY: "LOW",
  SCARCITY: "LOW",
  OTHER: "LOW",
};

export const { classifyDeterministicRisk } = createClaimRiskClassifier({
  categoryRiskFloor: CATEGORY_RISK_FLOOR,
  highRiskTextPatterns: siteConfig.highRiskTextPatterns,
});
