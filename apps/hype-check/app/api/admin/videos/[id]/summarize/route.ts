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

  const subject = await db.subject.findUnique({
    where: { id },
    include: {
      channel: true,
      sourceVideos: { take: 1, orderBy: { createdAt: "desc" } },
    },
  });

  if (!subject) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const sourceVideo = subject.sourceVideos[0];
  if (!sourceVideo) {
    return NextResponse.json(
      { error: "Source video not found" },
      { status: 404 },
    );
  }

  const pipelineResult = await generateSummaryAndClaims(
    {
      subjectId: subject.id,
      sourceVideoId: sourceVideo.id,
      title: sourceVideo.title,
      description: sourceVideo.description,
      durationSeconds: sourceVideo.durationSeconds,
      riskLevel: subject.riskLevel,
    },
    subject.channel?.title ?? "",
    { modelUsed: "llama-3.3-70b-versatile" },
  );

  if (!pipelineResult.ok) {
    return NextResponse.json(
      { error: pipelineResult.error.message },
      { status: 500 },
    );
  }

  await db.subject.update({
    where: { id: subject.id },
    data: { claimExtractionFailed: pipelineResult.value.claimExtractionFailed },
  });

  revalidateTag("videos", "max");
  revalidateTag(`video:${subject.slug}`, "max");

  return NextResponse.json({ ok: true });
}
