export type AutoPublishStatus = "PUBLISHED" | "REVIEW";

// A claim-extraction failure must never be treated as "this subject has no
// risky claims" — it means we don't know. isEligibleForAutoPublish's
// `claims.every(...)` is trivially true on an empty array, so without this
// check a claims failure could silently auto-publish.
export function decideAutoPublishStatus(
  claimExtractionFailed: boolean,
  eligibleForAutoPublish: boolean,
): AutoPublishStatus {
  if (claimExtractionFailed) return "REVIEW";
  return eligibleForAutoPublish ? "PUBLISHED" : "REVIEW";
}
