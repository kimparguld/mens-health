export { PLATFORM_CONSTRAINTS, validatePlatformConstraints } from './platform-constraints';
export type { PlatformConstraints } from './platform-constraints';

export { buildUtmUrl } from './utm';
export type { UtmOptions } from './utm';

export {
  ApprovePostSchema,
  GeneratePostSchema,
  RejectPostSchema,
  SchedulePostSchema,
  SocialPostAiOutputSchema,
  UpdateDraftSchema,
} from './validation';
export type { GeneratePostInput, SocialPostAiOutput, UpdateDraftInput } from './validation';

export {
  buildRedditPrompt,
  buildSocialPrompt,
  buildTikTokPrompt,
  buildXPrompt,
  buildYouTubeCommunityPrompt,
} from './prompts';
export type { PromptConfig } from './prompts';

export { createSocialPostGenerator, isConflictError, isNotFoundError } from './generate-social-post';
export type {
  GenerateSocialPostInput,
  Result,
  SocialAiClient,
  SocialPostGeneratorConfig,
  VideoContext,
} from './generate-social-post';

export type { PublishResult, SocialPostBase, SocialPublisher, ValidationResult } from './adapters/publisher';
export { RedditAdapter } from './adapters/reddit';
export { getValidAccessToken } from './adapters/refresh-token';
export { TikTokAdapter } from './adapters/tiktok';
export type { TikTokAdapterConfig } from './adapters/tiktok';
export { XAdapter } from './adapters/x';
export type { XAdapterConfig } from './adapters/x';
export { YouTubeCommunityAdapter } from './adapters/youtube';
