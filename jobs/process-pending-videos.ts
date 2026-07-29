import { db } from "@/lib/db/prisma";
import { summarizeVideo } from "@/lib/ai/summarize-video";
import { extractClaims, type ExtractedClaim } from "@/lib/ai/extract-claims";
import { generateEditorialTitle } from "@/lib/ai/generate-editorial-title";
import { submitUrlsToIndexNow } from "@/lib/seo/indexnow";
import { notifyCreatorIfApplicable } from "@/lib/creators/notify";
import { env } from "@/env";

// Heuristic evidence score (0–1) derived from extracted claim risk levels.
// Serves as a proxy until admin claim-checking is implemented.
// LOW claims → 0.8, MEDIUM → 0.5, HIGH → 0.2; null if no claims extracted.
function deriveEvidenceScore(claims: ExtractedClaim[]): number | null {
  if (claims.length === 0) return null;
  const RISK_SCORE: Record<string, number> = {
    LOW: 0.8,
    MEDIUM: 0.5,
    HIGH: 0.2,
  };
  const total = claims.reduce(
    (sum, c) => sum + (RISK_SCORE[c.riskLevel] ?? 0.5),
    0,
  );
  return parseFloat((total / claims.length).toFixed(4));
}

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

      // --- Generate an SEO-friendly editorial title (raw YouTube title is kept as-is) ---
      const channelForTitle = await db.channel.findUnique({
        where: { id: video.channelId },
      });
      const editorialTitleResult = await generateEditorialTitle({
        title: video.title,
        shortSummary: summary.shortSummary,
        channelTitle: channelForTitle?.title ?? "",
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

      // Derive a heuristic evidenceScore from extracted claim risk levels.
      // HIGH-risk claims drag the score down; LOW-risk claims push it up.
      // This is a proxy until admin claim-checking is implemented.
      const evidenceScore = deriveEvidenceScore(
        claimsResult.ok ? claimsResult.value : [],
      );

      await db.video.update({
        where: { id: video.id },
        data: { status: finalStatus, evidenceScore },
      });

      if (finalStatus === "PUBLISHED") {
        await db.adminReview.create({
          data: {
            videoId: video.id,
            action: "PUBLISHED",
            note: "Auto-published: no high-risk claims detected (risk level LOW)",
          },
        });
        await submitUrlsToIndexNow([
          `${env.NEXT_PUBLIC_APP_URL}/videos/${video.slug}`,
        ]);
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
