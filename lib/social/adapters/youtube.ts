import "server-only";
import { validatePlatformConstraints } from "@/lib/social/platform-rules";
import type { SocialPost } from "@prisma/client";
import type {
  PublishResult,
  SocialPublisher,
  ValidationResult,
} from "./publisher";

// ---------------------------------------------------------------------------
// YouTube Community Posts — Draft-only adapter
//
// The YouTube Data API v3 `POST /youtube/v3/posts` endpoint is NOT publicly
// available. It is restricted to YouTube first-party apps and select partners
// and returns 404 for standard OAuth clients.
//
// This adapter generates the post text for manual copy-paste into YouTube
// Studio (https://studio.youtube.com → Create → Community post).
// Admins mark the post as manually published after posting.
// ---------------------------------------------------------------------------

export class YouTubeCommunityAdapter implements SocialPublisher {
  readonly platform = "YOUTUBE_COMMUNITY" as const;

  async validate(post: SocialPost): Promise<ValidationResult> {
    const errors = validatePlatformConstraints("YOUTUBE_COMMUNITY", {
      caption: post.caption,
      hashtags: post.hashtags,
      script: post.script,
      hook: post.hook,
    });
    if (errors.length > 0) return { ok: false, errors };
    if (post.status !== "APPROVED") {
      return {
        ok: false,
        errors: ["Post must be APPROVED before publishing"],
      };
    }
    return { ok: true };
  }

  /**
   * YouTube Community Posts cannot be created via the public API.
   * Returns a draft result with the composed post text so admins can
   * copy-paste it into YouTube Studio manually.
   *
   * Workflow:
   * 1. Copy the post text shown in the admin UI.
   * 2. Go to https://studio.youtube.com → Create → Community post.
   * 3. Paste, review, and publish.
   * 4. Mark the post as manually published in the admin dashboard.
   */
  async publish(post: SocialPost): Promise<PublishResult> {
    const validation = await this.validate(post);
    if (!validation.ok) {
      return {
        ok: false,
        errorCode: "VALIDATION_FAILED",
        errorMsg: validation.errors.join("; "),
      };
    }

    return {
      ok: false,
      errorCode: "MANUAL_PUBLISH_REQUIRED",
      errorMsg:
        "YouTube Community Posts cannot be published via the public API. " +
        "Copy the post text and publish manually via YouTube Studio " +
        "(https://studio.youtube.com → Create → Community post), " +
        "then mark this post as manually published.",
    };
  }

  /**
   * Composes and returns the post text as a draft for manual publishing.
   * The platformPostId and platformUrl are placeholder values that the admin
   * should overwrite after manually publishing in YouTube Studio.
   */
  async createDraft(post: SocialPost): Promise<PublishResult> {
    const validation = await this.validate(post);
    if (!validation.ok) {
      return {
        ok: false,
        errorCode: "VALIDATION_FAILED",
        errorMsg: validation.errors.join("; "),
      };
    }

    // YouTube Community Posts have no API for draft creation.
    // Return a stable draft identifier so the admin UI can track the post
    // and surface the composed text for manual copy-paste into YouTube Studio.
    return {
      ok: true,
      platformPostId: `draft:${post.id}`,
      platformUrl: `https://studio.youtube.com`,
    };
  }
}
