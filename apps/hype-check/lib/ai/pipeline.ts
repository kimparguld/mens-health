import { createAiPipeline } from "@menhealth/core-ai";
import { SITE_NAME } from "@/lib/site-brand";
import { aiClient } from "./client";

export const {
  summarizeVideo,
  extractClaims,
  factCheckClaim,
  generateEditorialTitle,
  generateTopicFaq,
} = createAiPipeline(aiClient, {
  siteName: SITE_NAME,
  domainDescription:
    "a platform that reviews trending products, courses, side hustles, and investment apps for hype vs. reality",
  audienceDescription:
    "people trying to figure out whether a trending product, course, or money-making opportunity is worth their money",
  claimCategories: [
    "SAFETY",
    "LEGITIMACY",
    "REGULATION",
    "GUARANTEE",
    "INCOME",
    "PRICING",
    "ENDORSEMENT",
    "PERFORMANCE",
    "POPULARITY",
    "SCARCITY",
    "OTHER",
  ],
  claimTypeLabel: "claims about products, courses, and money-making opportunities",
  riskLevelGuide:
    "- HIGH: Claims about safety/injury risk, whether the company or product is legitimate, regulatory compliance (SEC/FTC), or guaranteed returns/income\n" +
    "- MEDIUM: Specific income or pricing figures, endorsements that may be paid but undisclosed\n" +
    "- LOW: General product performance claims, popularity/social-proof claims, urgency or scarcity language",
});

export type {
  Result,
  SummaryOutput,
  SummaryInput,
  ExtractedClaim,
  ClaimExtractionInput,
  FactCheckResult,
  FactCheckClaimInput,
  EditorialTitleInput,
  FaqOutput,
  FaqGenerationInput,
} from "@menhealth/core-ai";
