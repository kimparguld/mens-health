export { PLATFORM_CONSTRAINTS, validatePlatformConstraints } from "./platform-constraints";
export type { PlatformConstraints } from "./platform-constraints";

export { buildUtmUrl } from "./utm";
export type { UtmOptions } from "./utm";

export {
  SocialPostAiOutputSchema,
  ApprovePostSchema,
  RejectPostSchema,
  SchedulePostSchema,
  GeneratePostSchema,
  UpdateDraftSchema,
} from "./validation";
export type {
  SocialPostAiOutput,
  GeneratePostInput,
  UpdateDraftInput,
} from "./validation";

export {
  buildXPrompt,
  buildRedditPrompt,
  buildYouTubeCommunityPrompt,
  buildTikTokPrompt,
  buildSocialPrompt,
} from "./prompts";
export type { PromptConfig } from "./prompts";

export {
  createSocialPostGenerator,
  isNotFoundError,
  isConflictError,
} from "./generate-social-post";
export type {
  Result,
  GenerateSocialPostInput,
  SocialAiClient,
  SocialPostGeneratorConfig,
  VideoContext,
} from "./generate-social-post";

export type {
  PublishResult,
  ValidationResult,
  SocialPublisher,
} from "./adapters/publisher";
export { RedditAdapter } from "./adapters/reddit";
export { TikTokAdapter } from "./adapters/tiktok";
export { YouTubeCommunityAdapter } from "./adapters/youtube";
export { XAdapter } from "./adapters/x";
export type { XAdapterConfig } from "./adapters/x";
export { getValidAccessToken } from "./adapters/refresh-token";
