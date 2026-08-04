import { db } from "@/lib/db/prisma";
import { XAdapter } from "@/lib/social/adapters/x";
import type { SocialPublisher } from "@/lib/social/adapters/publisher";
import type { Platform } from "@/app/generated/prisma";
import { env } from "@/env";

/**
 * Processes all SCHEDULED social posts whose scheduledAt time has passed.
 *
 * Platform behaviour:
 * - X — the only platform that actually auto-publishes, via the X adapter.
 * - YOUTUBE_COMMUNITY, REDDIT — manual-only (no public API / policy);
 *   reverts to APPROVED with an attempt record explaining the manual workflow.
 * - TIKTOK — adapter not yet implemented; marked FAILED.
 */

const MANUAL_ONLY_PLATFORMS: Partial<Record<Platform, string>> = {
  YOUTUBE_COMMUNITY:
    "YouTube Community Posts must be published manually — the post has been returned to Approved.",
  REDDIT:
    "Reddit posts must be submitted manually. The post has been returned to Approved.",
};

const ADAPTERS: Partial<Record<Platform, SocialPublisher>> = {
  X: new XAdapter({
    clientId: env.X_CLIENT_ID,
    clientSecret: env.X_CLIENT_SECRET,
    db,
  }),
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
    // Manual-only platforms (YouTube Community, Reddit) — revert to APPROVED
    // and record why, instead of ever attempting to auto-publish them.
    const manualReason = MANUAL_ONLY_PLATFORMS[post.platform];
    if (manualReason) {
      await db.$transaction([
        db.socialPublishAttempt.create({
          data: {
            postId: post.id,
            success: false,
            errorCode: "MANUAL_PUBLISH_REQUIRED",
            errorMsg: manualReason,
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

    const adapter = ADAPTERS[post.platform];

    // No adapter yet (TikTok) — mark as FAILED
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
