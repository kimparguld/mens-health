export { createAiClient } from "./client";
export type { AiClient, AiClientConfig, AiMessage } from "./client";

export { createAiPipeline } from "./pipeline";
export type {
  AiPipelineOptions,
  SummaryOutput,
  SummaryInput,
  ExtractedClaim,
  ClaimExtractionInput,
  FactCheckResult,
  FactCheckClaimInput,
  EditorialTitleInput,
  FaqOutput,
  FaqGenerationInput,
} from "./pipeline";

export type { Result } from "./result";
