import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import type { NextRequest } from "next/server";

export async function POST(_request: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find all videos that have no existing processing job
  const videosWithoutJobs = await db.video.findMany({
    where: {
      processingJob: null,
    },
    select: { id: true },
  });

  if (videosWithoutJobs.length === 0) {
    return Response.json({
      ok: true,
      queued: 0,
      message: "No videos need processing",
    });
  }

  await db.processingJob.createMany({
    data: videosWithoutJobs.map((v) => ({
      videoId: v.id,
      status: "QUEUED",
    })),
    skipDuplicates: true,
  });

  return Response.json({ ok: true, queued: videosWithoutJobs.length });
}
