import { db } from "@/lib/db/prisma";
import { summarizeVideo } from "@/lib/ai/summarize-video";
import { extractClaims } from "@/lib/ai/extract-claims";

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

        await db.claim.createMany({
          data: claimsResult.value.map((claim) => ({
            videoId: video.id,
            text: claim.text,
            category: claim.category,
            riskLevel: claim.riskLevel,
            evidenceStatus: "NOT_CHECKED",
            explanation: claim.explanation,
          })),
        });

        // Escalate risk level if high-risk claims found
        if (hasHighRiskClaims && video.riskLevel === "LOW") {
          await db.video.update({
            where: { id: video.id },
            data: { riskLevel: "HIGH" },
          });
        }
      }

      // Mark as PROCESSED — admin must explicitly publish
      await db.video.update({
        where: { id: video.id },
        data: { status: "PROCESSED" },
      });

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
