import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { processPendingVideos } from "@/jobs/process-pending-videos";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

export async function POST(_request: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find all videos that are missing a summary
  const videosWithoutSummaries = await db.video.findMany({
    where: {
      summaries: { none: {} },
    },
    select: { id: true },
  });

  if (videosWithoutSummaries.length === 0) {
    return Response.json({
      ok: true,
      queued: 0,
      message: "All videos already have summaries",
    });
  }

  // Upsert processing jobs — reset any failed/completed jobs to QUEUED
  // so they are picked up by the processor below.
  for (const { id: videoId } of videosWithoutSummaries) {
    await db.processingJob.upsert({
      where: { videoId },
      create: { videoId, status: "QUEUED" },
      update: {
        status: "QUEUED",
        startedAt: null,
        completedAt: null,
        errorMessage: null,
      },
    });
  }

  // Immediately kick off processing instead of waiting for the daily cron
  const { processed, failed } = await processPendingVideos();

  revalidateTag("videos", "max");

  const remaining = videosWithoutSummaries.length - processed - failed;

  return Response.json({
    ok: true,
    queued: videosWithoutSummaries.length,
    processed,
    failed,
    message:
      remaining > 0
        ? `Processed ${processed} video(s). ${remaining} remaining — will continue on the next cron run.`
        : `All ${processed} video(s) processed successfully.`,
  });
}
