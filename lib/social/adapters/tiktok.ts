/**
 * TikTok adapter — STUB
 *
 * Requirements before implementation:
 * - Register a TikTok Developer app at https://developers.tiktok.com/
 * - Obtain CLIENT_KEY and CLIENT_SECRET (store server-only in env.ts)
 * - Implement OAuth 2.0 flow: /api/social/tiktok/oauth/callback
 * - Use the TikTok Content Posting API (v2): POST /v2/post/publish/video/init/
 * - Store access_token and refresh_token in SocialAccount (platform = TIKTOK)
 * - All tokens must be stored server-only; never sent to client bundles
 * - Videos must be user-created content; third-party footage is not permitted
 * - Respect TikTok's Community Guidelines for health content
 *
 * TODO: Implement when TikTok Developer credentials are available.
 */
import type { SocialPost } from "@prisma/client";
import type {
  PublishResult,
  SocialPublisher,
  ValidationResult,
} from "./publisher";

export class TikTokAdapter implements SocialPublisher {
  readonly platform = "TIKTOK" as const;

  async validate(_post: SocialPost): Promise<ValidationResult> {
    // TODO: implement TikTok-specific validation (60-char caption limit for description, etc.)
    return {
      ok: false,
      errors: ["TikTok adapter is not yet implemented"],
    };
  }

  async publish(_post: SocialPost): Promise<PublishResult> {
    // TODO: implement direct video upload via TikTok Content Posting API
    return {
      ok: false,
      errorCode: "NOT_IMPLEMENTED",
      errorMsg: "TikTok adapter is not yet implemented",
    };
  }

  async createDraft(_post: SocialPost): Promise<PublishResult> {
    // TODO: implement draft creation if TikTok API supports it
    return {
      ok: false,
      errorCode: "NOT_IMPLEMENTED",
      errorMsg: "TikTok adapter is not yet implemented",
    };
  }
}
