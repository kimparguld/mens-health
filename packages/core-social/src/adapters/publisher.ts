export type PublishResult =
  | { ok: true; platformPostId: string; platformUrl: string }
  | { ok: false; errorCode: string; errorMsg: string };

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

/**
 * Minimal structural type covering the fields every adapter actually reads.
 * Defined here rather than imported from a Prisma client so this package
 * type-checks against any site's generated schema, not just one.
 */
export interface SocialPostBase {
  caption: string;
  hashtags: string[];
  script: string;
  hook: string;
  utmUrl: string;
  status: string;
}

/**
 * Every social platform adapter must implement this interface.
 * Adapters are server-only — they must never be imported in client components.
 */
export interface SocialPublisher {
  readonly platform: string;

  /** Publish an approved post directly to the platform. */
  publish(post: SocialPostBase): Promise<PublishResult>;

  /** Create a draft on platforms that support draft creation. */
  createDraft(post: SocialPostBase): Promise<PublishResult>;

  /** Validate the post against platform-specific rules before submitting. */
  validate(post: SocialPostBase): Promise<ValidationResult>;
}
