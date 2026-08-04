import {
  isEligibleForAutoPublish as baseIsEligibleForAutoPublish,
  type GateVideo,
  type GateClaim,
} from "@menhealth/core-compliance";
import { mediumRiskAutoPublish } from "@/lib/flags/feature-flags";

export type { GateVideo, GateClaim } from "@menhealth/core-compliance";

export function isEligibleForAutoPublish(
  video: GateVideo,
  claims: GateClaim[],
): boolean {
  return baseIsEligibleForAutoPublish(
    video,
    claims,
    mediumRiskAutoPublish.isEnabled(),
  );
}
