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
