import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { generateSummaryAndClaims } from "@/lib/videos/process-video-pipeline";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const video = await db.video.findUnique({
    where: { id },
    include: { channel: true },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const pipelineResult = await generateSummaryAndClaims(
    video,
    video.channel.title,
    { modelUsed: "llama-3.3-70b-versatile" },
  );

  if (!pipelineResult.ok) {
    return NextResponse.json(
      { error: pipelineResult.error.message },
      { status: 500 },
    );
  }

  await db.video.update({
    where: { id: video.id },
    data: { claimExtractionFailed: pipelineResult.value.claimExtractionFailed },
  });

  revalidateTag("videos", "max");
  revalidateTag(`video:${video.slug}`, "max");

  return NextResponse.json({ ok: true });
}
