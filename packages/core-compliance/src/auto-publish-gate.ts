import type { EvidenceStatus, RiskLevel } from "@prisma/client";

export type GateVideo = { riskLevel: RiskLevel };
export type GateClaim = {
  evidenceStatus: EvidenceStatus;
  autoReviewed: boolean;
  humanConfirmedAt: Date | null;
};

// Decides whether a video can auto-publish without an admin click.
// HIGH-risk videos are a hard stop — no flag, no override, no exceptions,
// regardless of what `mediumRiskAutoPublishEnabled` is set to. LOW-risk
// videos auto-publish as before. MEDIUM-risk videos may auto-publish (behind
// mediumRiskAutoPublishEnabled, an instant kill switch controlled by the
// site's own feature flag) but only once every one of their claims has a
// real evidence verdict — auto-reviewed (LOW claim) or human-confirmed —
// that isn't UNSUPPORTED or still NOT_CHECKED.
export function isEligibleForAutoPublish(
  video: GateVideo,
  claims: GateClaim[],
  mediumRiskAutoPublishEnabled: boolean,
): boolean {
  if (video.riskLevel === "HIGH") return false;
  if (video.riskLevel === "MEDIUM" && !mediumRiskAutoPublishEnabled) {
    return false;
  }

  return claims.every(
    (claim) =>
      claim.evidenceStatus !== "NOT_CHECKED" &&
      claim.evidenceStatus !== "UNSUPPORTED" &&
      (claim.autoReviewed || claim.humanConfirmedAt !== null),
  );
}
