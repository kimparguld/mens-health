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

  // Find all subjects that are missing a summary and resolve each to its
  // primary source video (ProcessingJob is keyed by sourceVideoId).
  const subjectsWithoutSummaries = await db.subject.findMany({
    where: {
      sourceVideos: { none: { summaries: { some: {} } } },
    },
    select: {
      sourceVideos: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { id: true },
      },
    },
  });

  const sourceVideoIds = subjectsWithoutSummaries
    .map((subject) => subject.sourceVideos[0]?.id)
    .filter((id): id is string => Boolean(id));

  if (sourceVideoIds.length === 0) {
    return Response.json({
      ok: true,
      queued: 0,
      message: "All videos already have summaries",
    });
  }

  // Upsert processing jobs — reset any failed/completed jobs to QUEUED
  // so they are picked up by the processor below.
  for (const sourceVideoId of sourceVideoIds) {
    await db.processingJob.upsert({
      where: { sourceVideoId },
      create: { sourceVideoId, status: "QUEUED" },
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

  const remaining = sourceVideoIds.length - processed - failed;

  return Response.json({
    ok: true,
    queued: sourceVideoIds.length,
    processed,
    failed,
    message:
      remaining > 0
        ? `Processed ${processed} video(s). ${remaining} remaining — will continue on the next cron run.`
        : `All ${processed} video(s) processed successfully.`,
  });
}
