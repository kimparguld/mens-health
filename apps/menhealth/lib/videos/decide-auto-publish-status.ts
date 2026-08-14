export type AutoPublishStatus = "PUBLISHED" | "PROCESSED";

// A claim-extraction failure must never be treated as "this video has no
// risky claims" — it means we don't know. Before this fix,
// generateSummaryAndClaims returned an empty claims array on extraction
// failure, which made isEligibleForAutoPublish's `claims.every(...)`
// trivially true and let the video auto-publish with zero human review.
export function decideAutoPublishStatus(
  claimExtractionFailed: boolean,
  eligibleForAutoPublish: boolean,
): AutoPublishStatus {
  if (claimExtractionFailed) return "PROCESSED";
  return eligibleForAutoPublish ? "PUBLISHED" : "PROCESSED";
}
