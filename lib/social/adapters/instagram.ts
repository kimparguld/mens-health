/**
 * Instagram adapter — STUB
 *
 * Requirements before implementation:
 * - Create a Meta Developer app at https://developers.facebook.com/
 * - Obtain access to the Instagram Graph API (requires Business/Creator account)
 * - Implement OAuth 2.0 flow for Instagram via Meta
 * - Use the Instagram Graph API media publishing endpoints:
 *   POST /{ig-user-id}/media         — upload video container
 *   POST /{ig-user-id}/media_publish  — publish the container
 * - Store long-lived access_token in SocialAccount (platform = INSTAGRAM_REELS)
 * - All tokens must be stored server-only; never sent to client bundles
 * - Videos must be user-created content; reposting third-party footage is not permitted
 * - Respect Meta's content policies for health and wellness content
 *
 * TODO: Implement when Instagram Graph API credentials are available.
 */
import type { SocialPost } from "@prisma/client";
import type {
  PublishResult,
  SocialPublisher,
  ValidationResult,
} from "./publisher";

export class InstagramReelsAdapter implements SocialPublisher {
  readonly platform = "INSTAGRAM_REELS" as const;

  async validate(_post: SocialPost): Promise<ValidationResult> {
    // TODO: implement Instagram-specific validation
    return {
      ok: false,
      errors: ["Instagram adapter is not yet implemented"],
    };
  }

  async publish(_post: SocialPost): Promise<PublishResult> {
    // TODO: implement via Instagram Graph API media publishing
    return {
      ok: false,
      errorCode: "NOT_IMPLEMENTED",
      errorMsg: "Instagram adapter is not yet implemented",
    };
  }

  async createDraft(_post: SocialPost): Promise<PublishResult> {
    // TODO: implement draft container creation
    return {
      ok: false,
      errorCode: "NOT_IMPLEMENTED",
      errorMsg: "Instagram adapter is not yet implemented",
    };
  }
}
