export {
  createDigestBuilder,
  withNewsletterUtm,
} from "./digest";
export type {
  DigestClaim,
  DigestVideo,
  WeeklyDigestMeta,
  DigestContent,
  DigestBrandConfig,
} from "./digest";

export { createWelcomeEmailBuilder } from "./welcome";
export type { WelcomeEmailLink, WelcomeEmailBrandConfig } from "./welcome";

export { createResendClient } from "./resend";
