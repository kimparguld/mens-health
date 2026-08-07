import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { generateSocialVideo } from "@/lib/social/generate-social-video";
import { supportsVideoGeneration } from "@/lib/social/platform-rules";

export const runtime = "nodejs";
// TTS synthesis + ffmpeg render for a short clip can take up to ~2 minutes.
export const maxDuration = 120;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const draft = await db.socialPost.findUnique({ where: { id } });
  if (!draft) {
    return NextResponse.json(
      { error: "Social draft not found" },
      { status: 404 },
    );
  }

  if (!supportsVideoGeneration(draft.platform)) {
    return NextResponse.json(
      { error: "Video generation is not supported for this platform" },
      { status: 422 },
    );
  }

  try {
    await db.socialPost.update({
      where: { id },
      data: { videoStatus: "GENERATING", videoError: null },
    });

    const result = await generateSocialVideo({
      hook: draft.hook,
      script: draft.script,
      platform: draft.platform,
    });

    if (!result.ok) {
      await db.socialPost.update({
        where: { id },
        data: { videoStatus: "FAILED", videoError: result.error.message },
      });
      return NextResponse.json(
        { error: "Video generation failed" },
        { status: 500 },
      );
    }

    await db.socialPost.update({
      where: { id },
      data: {
        videoUrl: result.value.videoUrl,
        videoStatus: "READY",
        videoError: null,
      },
    });

    return NextResponse.json({
      videoUrl: result.value.videoUrl,
      videoStatus: "READY",
    });
  } catch {
    // Defends against the process being killed mid-render (function
    // timeout), or an unexpected throw from generateSocialVideo/db calls —
    // without this, the row would stay stuck at GENERATING forever.
    try {
      await db.socialPost.update({
        where: { id },
        data: {
          videoStatus: "FAILED",
          videoError: "Video generation failed unexpectedly",
        },
      });
    } catch {
      // Best effort only — nothing more we can do if this also fails.
    }
    return NextResponse.json(
      { error: "Video generation failed" },
      { status: 500 },
    );
  }
}
