import { db } from "@/lib/db/prisma";

/**
 * Processes all SCHEDULED social posts whose scheduledAt time has passed.
 *
 * YouTube Shorts cannot be auto-published via cron because they require a
 * user-created video file to be uploaded. These posts are transitioned back to
 * APPROVED so the admin receives them in the review queue with a reminder to
 * upload manually.
 *
 * Other platform adapters are stubs at this stage. They will be implemented
 * when the platform integrations are complete.
 */
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
    // YouTube requires a video file — return to APPROVED so admin can upload
    if (post.platform === "YOUTUBE_SHORTS") {
      await db.socialPost.update({
        where: { id: post.id },
        data: { status: "APPROVED" },
      });
      processed++;
      continue;
    }

    // Other platforms: mark as FAILED until adapters are implemented
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
  }

  return { processed, failed };
}
