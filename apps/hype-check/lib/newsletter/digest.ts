import { createDigestBuilder } from "@menhealth/core-newsletter";
import { SITE_NAME } from "@/lib/site-brand";

export type {
  DigestClaim,
  DigestVideo,
  WeeklyDigestMeta,
  DigestContent,
} from "@menhealth/core-newsletter";
export { withNewsletterUtm } from "@menhealth/core-newsletter";

export const { buildDigestSubject, buildDigestHtml, buildDigestText } =
  createDigestBuilder({
    siteName: SITE_NAME,
    tagline: "Legit, or just hype?",
    introCopy:
      "This week's digest highlights one trending product, three claims worth understanding, one practical takeaway, and one claim that may be getting more hype than the evidence supports.",
    healthDisclaimer:
      "This newsletter is for informational purposes only and does not constitute financial, legal, or investment advice. Always do your own research before making a purchase or investment decision.",
    subjects: {
      multiClaim: "3 claims worth understanding this week",
      singleClaim: "Claims worth understanding this week",
      noClaimsFallbackPrefix: "This week's hype check digest: ",
      empty: "Claims worth understanding this week",
    },
  });
