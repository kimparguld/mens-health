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
  claimCategories: [
    "NUTRITION",
    "EXERCISE",
    "HORMONES",
    "MENTAL_HEALTH",
    "SUPPLEMENTS",
    "MEDICATIONS",
    "CANCER",
    "LONGEVITY",
    "SEXUAL_HEALTH",
    "OTHER",
  ],
  claimTypeLabel: "health claims",
  riskLevelGuide:
    "- HIGH: Claims about medications, TRT, hormones, sexual health, mental health treatment, cancer, supplements as cures\n" +
    "- MEDIUM: Diet claims, specific supplement dosages, training frequency claims with quantified outcomes\n" +
    "- LOW: General lifestyle advice, widely accepted recommendations",
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
