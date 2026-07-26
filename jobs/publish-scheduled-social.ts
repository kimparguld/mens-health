import { db } from "@/lib/db/prisma";
import { LinkedInAdapter } from "@/lib/social/adapters/linkedin";
import { XAdapter } from "@/lib/social/adapters/x";
import { RedditAdapter } from "@/lib/social/adapters/reddit";
import { YouTubeCommunityAdapter } from "@/lib/social/adapters/youtube";
import type { SocialPublisher } from "@/lib/social/adapters/publisher";
import type { Platform } from "@prisma/client";

/**
 * Processes all SCHEDULED social posts whose scheduledAt time has passed.
 *
 * Platform behaviour:
 * - YOUTUBE_COMMUNITY — auto-published as a text community post (no video required).
 * - LINKEDIN / X — auto-published via their respective adapters.
 * - REDDIT — manual-only by policy; reverts to APPROVED with an attempt record
 *   explaining the manual workflow.
 * - TIKTOK / INSTAGRAM_REELS — adapters not yet implemented; marked FAILED.
 */

const ADAPTERS: Partial<Record<Platform, SocialPublisher>> = {
  YOUTUBE_COMMUNITY: new YouTubeCommunityAdapter(),
  LINKEDIN: new LinkedInAdapter(),
  X: new XAdapter(),
  REDDIT: new RedditAdapter(),
};

export async function publishScheduledPosts(): Promise<{
  processed: number;
  failed: number;
}> {
  const now = new Date();

  const posts = await db.socialPost.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
    },
  });

  let processed = 0;
  let failed = 0;

  for (const post of posts) {
    const adapter = ADAPTERS[post.platform];

    // No adapter yet (TikTok, Instagram) — mark as FAILED
    if (!adapter) {
      await db.$transaction([
        db.socialPublishAttempt.create({
          data: {
            postId: post.id,
            success: false,
            errorCode: "NOT_IMPLEMENTED",
            errorMsg: `Auto-publish for ${post.platform} is not yet available`,
          },
        }),
        db.socialPost.update({
          where: { id: post.id },
          data: { status: "FAILED" },
        }),
      ]);
      failed++;
      continue;
    }

    // Reddit is manual-only — revert to APPROVED and record the reason
    if (post.platform === "REDDIT") {
      await db.$transaction([
        db.socialPublishAttempt.create({
          data: {
            postId: post.id,
            success: false,
            errorCode: "REDDIT_MANUAL_ONLY",
            errorMsg:
              "Reddit posts must be submitted manually. The post has been returned to Approved.",
          },
        }),
        db.socialPost.update({
          where: { id: post.id },
          data: { status: "APPROVED" },
        }),
      ]);
      processed++;
      continue;
    }

    // Validate before publishing
    const validation = await adapter.validate(post);
    if (!validation.ok) {
      await db.$transaction([
        db.socialPublishAttempt.create({
          data: {
            postId: post.id,
            success: false,
            errorCode: "VALIDATION_FAILED",
            errorMsg: validation.errors.join("; "),
          },
        }),
        db.socialPost.update({
          where: { id: post.id },
          data: { status: "FAILED" },
        }),
      ]);
      failed++;
      continue;
    }

    // Publish
    const result = await adapter.publish(post);

    if (result.ok) {
      await db.$transaction([
        db.socialPublishAttempt.create({
          data: {
            postId: post.id,
            success: true,
            response: {
              platformPostId: result.platformPostId,
              platformUrl: result.platformUrl,
            },
          },
        }),
        db.socialPost.update({
          where: { id: post.id },
          data: {
            status: "PUBLISHED",
            publishedAt: now,
            platformPostId: result.platformPostId,
            platformUrl: result.platformUrl,
          },
        }),
      ]);
      processed++;
    } else {
      await db.$transaction([
        db.socialPublishAttempt.create({
          data: {
            postId: post.id,
            success: false,
            errorCode: result.errorCode,
            errorMsg: result.errorMsg,
          },
        }),
        db.socialPost.update({
          where: { id: post.id },
          data: { status: "FAILED" },
        }),
      ]);
      failed++;
    }
  }

  return { processed, failed };
}
