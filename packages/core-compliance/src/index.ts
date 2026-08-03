export { isEligibleForAutoPublish } from "./auto-publish-gate";
export type { GateVideo, GateClaim } from "./auto-publish-gate";

export { createClaimRiskClassifier } from "./claim-risk";
export type { ClaimRiskConfig } from "./claim-risk";

export { checkForbiddenPatterns, detectHighRiskTopic } from "./content-safety";
export type { ForbiddenPatternMatch } from "./content-safety";
