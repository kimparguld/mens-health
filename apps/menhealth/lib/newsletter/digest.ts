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
    tagline: "Your weekly men's health briefing",
    introCopy:
      "This week's digest highlights one trending men's health video, three claims worth understanding, one practical takeaway, and one claim that may be getting more hype than the evidence supports.",
    healthDisclaimer:
      "This newsletter is for informational purposes only and does not constitute medical advice. Always consult a qualified healthcare professional before making health decisions.",
    subjects: {
      multiClaim: "3 men's health claims worth understanding this week",
      singleClaim: "Men's health claims worth understanding this week",
      noClaimsFallbackPrefix: "This week's men's health digest: ",
      empty: "Men's health claims worth understanding this week",
    },
  });
