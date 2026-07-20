import type { SocialPost } from "@prisma/client";

export type PublishResult =
  | { ok: true; platformPostId: string; platformUrl: string }
  | { ok: false; errorCode: string; errorMsg: string };

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

/**
 * Every social platform adapter must implement this interface.
 * Adapters are server-only — they must never be imported in client components.
 */
export interface SocialPublisher {
  readonly platform: SocialPost["platform"];

  /** Publish an approved post directly to the platform. */
  publish(post: SocialPost): Promise<PublishResult>;

  /** Create a draft on platforms that support draft creation. */
  createDraft(post: SocialPost): Promise<PublishResult>;

  /** Validate the post against platform-specific rules before submitting. */
  validate(post: SocialPost): Promise<ValidationResult>;
}
