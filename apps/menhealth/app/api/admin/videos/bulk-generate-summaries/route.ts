import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { generateSummaryAndClaims } from "@/lib/videos/process-video-pipeline";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import type { NextRequest } from "next/server";

const BulkGenerateBodySchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = BulkGenerateBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { ids } = parsed.data;

  const videos = await db.video.findMany({
    where: {
      id: { in: ids },
      summaries: { none: {} },
    },
    include: { channel: true },
  });

  if (videos.length === 0) {
    return Response.json({
      ok: true,
      processed: 0,
      failed: 0,
      message: "All selected videos already have a summary.",
    });
  }

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const video of videos) {
    const pipelineResult = await generateSummaryAndClaims(
      video,
      video.channel.title,
      { modelUsed: "claude-sonnet-4-5" },
    );

    if (!pipelineResult.ok) {
      failed++;
      errors.push(`"${video.title}": ${pipelineResult.error.message}`);
      continue;
    }

    await db.video.update({
      where: { id: video.id },
      data: { claimExtractionFailed: pipelineResult.value.claimExtractionFailed },
    });

    processed++;
  }

  revalidateTag("videos", "max");

  const message =
    failed === 0
      ? `Generated summaries for ${processed} video(s).`
      : `Generated ${processed} summary(s). ${failed} failed: ${errors.join("; ")}`;

  return Response.json({ ok: true, processed, failed, message });
}
