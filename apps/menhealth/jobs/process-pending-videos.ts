import type { RiskLevel } from "@prisma/client";
import { db } from "@/lib/db/prisma";
import { generateSummaryAndClaims } from "@/lib/videos/process-video-pipeline";
import { generateEditorialTitle } from "@/lib/ai/generate-editorial-title";
import { isEligibleForAutoPublish } from "@/lib/publishing/auto-publish-gate";
import { decideAutoPublishStatus } from "@/lib/videos/decide-auto-publish-status";
import { submitUrlsToIndexNow } from "@menhealth/core-seo";
import { notifyCreatorIfApplicable } from "@/lib/creators/notify";
import { env } from "@/env";
import { INDEXNOW_KEY } from "@/lib/site-brand";

// Heuristic evidence score (0–1) derived from persisted claim risk levels.
// Serves as a proxy until every claim has a real evidence verdict.
// LOW claims → 0.8, MEDIUM → 0.5, HIGH → 0.2; null if no claims extracted.
function deriveEvidenceScore(claims: { riskLevel: RiskLevel }[]): number | null {
  if (claims.length === 0) return null;
  const RISK_SCORE: Record<RiskLevel, number> = {
    LOW: 0.8,
    MEDIUM: 0.5,
    HIGH: 0.2,
  };
  const total = claims.reduce((sum, c) => sum + RISK_SCORE[c.riskLevel], 0);
  return parseFloat((total / claims.length).toFixed(4));
}

const BATCH_SIZE = 5;

// A job stuck in RUNNING this long almost certainly means the previous
// invocation crashed or timed out mid-run (e.g. a serverless function
// timeout) without ever reaching the try/catch's success or failure path.
// findMany() below only ever selects QUEUED jobs, so without this recovery
// step an orphaned RUNNING row would stay stuck forever.
const STALE_RUNNING_THRESHOLD_MS = 20 * 60 * 1000; // 20 minutes

export async function processPendingVideos(options?: {
  videoIds?: string[];
}): Promise<{
  processed: number;
  failed: number;
}> {
  let processed = 0;
  let failed = 0;

  await db.processingJob.updateMany({
    where: {
      status: "RUNNING",
      startedAt: { lt: new Date(Date.now() - STALE_RUNNING_THRESHOLD_MS) },
    },
    data: { status: "QUEUED", startedAt: null },
  });

  const jobs = await db.processingJob.findMany({
    where: {
      status: "QUEUED",
      ...(options?.videoIds ? { videoId: { in: options.videoIds } } : {}),
    },
    take: options?.videoIds ? options.videoIds.length : BATCH_SIZE,
    include: { video: true },
  });

  for (const job of jobs) {
    try {
      await db.processingJob.update({
        where: { id: job.id },
        data: { status: "RUNNING", startedAt: new Date() },
      });

      const { video } = job;

      const channel = await db.channel.findUnique({
        where: { id: video.channelId },
      });

      const pipelineResult = await generateSummaryAndClaims(
        video,
        channel?.title ?? "",
        { modelUsed: "claude-sonnet-4-5" },
      );

      if (!pipelineResult.ok) {
        throw new Error(`Summary failed: ${pipelineResult.error.message}`);
      }

      const { claims, claimExtractionFailed } = pipelineResult.value;

      // --- Generate an SEO-friendly editorial title (raw YouTube title is kept as-is) ---
      const editorialTitleResult = await generateEditorialTitle({
        title: video.title,
        shortSummary: pipelineResult.value.summary.shortSummary,
        channelTitle: channel?.title ?? "",
      });
      if (editorialTitleResult.ok) {
        await db.video.update({
          where: { id: video.id },
          data: { editorialTitle: editorialTitleResult.value },
        });
      } else {
        console.warn(
          `Editorial title generation failed for video ${video.id}: ${editorialTitleResult.error.message}`,
        );
      }

      // Re-fetch the video to get the latest riskLevel (may have been escalated by the pipeline)
      const latestVideo = await db.video.findUnique({
        where: { id: video.id },
        select: { riskLevel: true },
      });

      const finalStatus = decideAutoPublishStatus(
        claimExtractionFailed,
        isEligibleForAutoPublish(
          { riskLevel: latestVideo?.riskLevel ?? video.riskLevel },
          claims,
        ),
      );

      const evidenceScore = deriveEvidenceScore(claims);

      await db.video.update({
        where: { id: video.id },
        data: { status: finalStatus, evidenceScore },
      });

      if (finalStatus === "PUBLISHED") {
        await db.adminReview.create({
          data: {
            videoId: video.id,
            action: "PUBLISHED",
            note: `Auto-published: risk level ${latestVideo?.riskLevel ?? video.riskLevel}, all claims evidence-checked`,
          },
        });
        await submitUrlsToIndexNow(
          [`${env.NEXT_PUBLIC_APP_URL}/videos/${video.slug}`],
          env.NEXT_PUBLIC_APP_URL,
          INDEXNOW_KEY,
        );
        await notifyCreatorIfApplicable(video.id);
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
