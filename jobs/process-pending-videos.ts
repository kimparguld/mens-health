import { db } from "@/lib/db/prisma";
import { summarizeVideo } from "@/lib/ai/summarize-video";
import { extractClaims } from "@/lib/ai/extract-claims";

function generateClaimSlug(text: string, id: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
    .replace(/-+$/, "");
  return `${base}-${id.slice(-6)}`;
}

const BATCH_SIZE = 5;

export async function processPendingVideos(): Promise<{
  processed: number;
  failed: number;
}> {
  let processed = 0;
  let failed = 0;

  const jobs = await db.processingJob.findMany({
    where: { status: "QUEUED" },
    take: BATCH_SIZE,
    include: { video: true },
  });

  for (const job of jobs) {
    try {
      await db.processingJob.update({
        where: { id: job.id },
        data: { status: "RUNNING", startedAt: new Date() },
      });

      const { video } = job;

      // --- Generate summary ---
      const summaryResult = await summarizeVideo({
        title: video.title,
        description: video.description ?? "",
        channelTitle:
          (await db.channel.findUnique({ where: { id: video.channelId } }))
            ?.title ?? "",
        durationSeconds: video.durationSeconds ?? 0,
      });

      if (!summaryResult.ok) {
        throw new Error(`Summary failed: ${summaryResult.error.message}`);
      }

      const summary = await db.summary.create({
        data: {
          videoId: video.id,
          shortSummary: summaryResult.value.shortSummary,
          longSummary: summaryResult.value.longSummary,
          takeaways: summaryResult.value.takeaways,
          warnings: summaryResult.value.warnings ?? [],
          targetAudience: summaryResult.value.targetAudience,
          redFlags: summaryResult.value.redFlags ?? [],
          modelUsed: "claude-sonnet-4-5",
        },
      });

      // --- Extract claims ---
      const claimsResult = await extractClaims({
        title: video.title,
        description: video.description ?? "",
        shortSummary: summary.shortSummary,
      });

      if (!claimsResult.ok) {
        console.warn(
          `Claim extraction failed for video ${video.id}: ${claimsResult.error.message}`,
        );
        // Non-fatal — continue without claims
      } else {
        const hasHighRiskClaims = claimsResult.value.some(
          (c) => c.riskLevel === "HIGH",
        );

        // Create claims individually so we can generate a human-readable slug
        // from the claim text + a short id suffix for uniqueness.
        for (const claim of claimsResult.value) {
          const created = await db.claim.create({
            data: {
              videoId: video.id,
              text: claim.text,
              category: claim.category,
              riskLevel: claim.riskLevel,
              evidenceStatus: "NOT_CHECKED",
              explanation: claim.explanation,
            },
          });
          await db.claim.update({
            where: { id: created.id },
            data: { slug: generateClaimSlug(claim.text, created.id) },
          });
        }

        // Escalate risk level if high-risk claims found
        if (hasHighRiskClaims && video.riskLevel === "LOW") {
          await db.video.update({
            where: { id: video.id },
            data: { riskLevel: "HIGH" },
          });
        }
      }

      // Re-fetch the video to get the latest riskLevel (may have been escalated above)
      const latestVideo = await db.video.findUnique({
        where: { id: video.id },
        select: { riskLevel: true },
      });

      // LOW risk videos auto-publish; anything else requires admin review
      const finalStatus =
        latestVideo?.riskLevel === "LOW" ? "PUBLISHED" : "PROCESSED";

      await db.video.update({
        where: { id: video.id },
        data: { status: finalStatus },
      });

      if (finalStatus === "PUBLISHED") {
        await db.adminReview.create({
          data: {
            videoId: video.id,
            action: "PUBLISHED",
            note: "Auto-published: no high-risk claims detected (risk level LOW)",
          },
        });
      }

      await db.processingJob.update({
        where: { id: job.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      processed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Processing job ${job.id} failed:`, message);

      await db.processingJob.update({
        where: { id: job.id },
        data: { status: "FAILED", errorMessage: message },
      });

      failed++;
    }
  }

  return { processed, failed };
}
