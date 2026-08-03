import type { EvidenceStatus, RiskLevel } from "@prisma/client";
import { mediumRiskAutoPublish } from "@/lib/flags/feature-flags";

export type GateVideo = { riskLevel: RiskLevel };
export type GateClaim = {
  evidenceStatus: EvidenceStatus;
  autoReviewed: boolean;
  humanConfirmedAt: Date | null;
};

// Decides whether a video can auto-publish without an admin click.
// HIGH-risk videos are a hard stop — no flag, no override, no exceptions.
// LOW-risk videos auto-publish as before. MEDIUM-risk videos may auto-publish
// (behind mediumRiskAutoPublish, an instant kill switch) but only once every
// one of their claims has a real evidence verdict — auto-reviewed (LOW claim)
// or human-confirmed — that isn't UNSUPPORTED or still NOT_CHECKED.
export function isEligibleForAutoPublish(
  video: GateVideo,
  claims: GateClaim[],
): boolean {
  if (video.riskLevel === "HIGH") return false;
  if (video.riskLevel === "MEDIUM" && !mediumRiskAutoPublish.isEnabled()) {
    return false;
  }

  return claims.every(
    (claim) =>
      claim.evidenceStatus !== "NOT_CHECKED" &&
      claim.evidenceStatus !== "UNSUPPORTED" &&
      (claim.autoReviewed || claim.humanConfirmedAt !== null),
  );
}
