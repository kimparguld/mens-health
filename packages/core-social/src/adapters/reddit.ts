import 'server-only';
import { validatePlatformConstraints } from '../platform-constraints';
import type { PublishResult, SocialPostBase, SocialPublisher, ValidationResult } from './publisher';

/**
 * Reddit adapter — manual-only by policy.
 *
 * Reddit auto-posting is intentionally prohibited. Health/regulated content
 * on Reddit must go through manual review, community context assessment,
 * and subreddit rule checks before posting.
 *
 * Workflow:
 *   1. Admin approves the generated draft
 *   2. Admin copies the post content and submits it manually on Reddit
 *   3. Admin records the live URL via "I've posted this manually" in the UI
 *
 * The validate() method still runs platform-constraint checks so the admin
 * can catch content issues before manually posting.
 */
export class RedditAdapter implements SocialPublisher {
  readonly platform = 'REDDIT' as const;

  async validate(post: SocialPostBase): Promise<ValidationResult> {
    const errors = validatePlatformConstraints('REDDIT', {
      caption: post.caption,
      hashtags: post.hashtags,
      script: post.script,
      hook: post.hook,
    });
    if (errors.length > 0) return { ok: false, errors };
    return { ok: true };
  }

  async publish(_post: SocialPostBase): Promise<PublishResult> {
    return {
      ok: false,
      errorCode: 'REDDIT_MANUAL_ONLY',
      errorMsg:
        "Reddit posts must be submitted manually. Copy the draft content, post it on Reddit, then record the URL via 'I've posted this manually'.",
    };
  }

  async createDraft(_post: SocialPostBase): Promise<PublishResult> {
    return {
      ok: false,
      errorCode: 'REDDIT_MANUAL_ONLY',
      errorMsg: "Reddit does not support remote draft creation. Use 'I've posted this manually' after posting.",
    };
  }
}
