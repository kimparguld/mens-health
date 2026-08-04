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
  domainDescription: "a men's health content curation platform",
  audienceDescription:
    "men aged 30–55 who are health-conscious but not medical professionals",
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
