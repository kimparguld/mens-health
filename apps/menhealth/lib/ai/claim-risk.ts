import type { ClaimCategory, RiskLevel } from "@prisma/client";
import { createClaimRiskClassifier } from "@menhealth/core-compliance";
import { siteConfig } from "@/site.config";

// Category floor — AGENTS.md names TRT/testosterone, medications,
// supplements, cancer, mental health, and ED as this site's high-risk
// categories. This closes the gap where category and riskLevel were
// previously independent, uncross-checked LLM outputs. Keyed by the
// Prisma-schema ClaimCategory enum, so it stays here rather than in
// site.config.ts (which doesn't know this site's DB schema).
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

export const { classifyDeterministicRisk } = createClaimRiskClassifier({
  categoryRiskFloor: CATEGORY_RISK_FLOOR,
  highRiskTextPatterns: siteConfig.highRiskTextPatterns,
});
