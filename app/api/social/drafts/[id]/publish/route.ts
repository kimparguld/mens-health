import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { YouTubeShortsAdapter } from "@/lib/social/adapters/youtube";

/**
 * POST /api/social/drafts/[id]/publish
 *
 * Publishes an approved post to its target platform.
 * Every attempt is logged in SocialPublishAttempt.
 *
 * For YouTube Shorts the caller must supply a video file as multipart/form-data.
 * Other platform adapters are not yet implemented (stub).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const post = await db.socialPost.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.status !== "APPROVED" && post.status !== "SCHEDULED") {
    return NextResponse.json(
      { error: "Post must be APPROVED or SCHEDULED to publish" },
      { status: 409 },
    );
  }

  if (post.platform !== "YOUTUBE_SHORTS") {
    return NextResponse.json(
      { error: `Platform ${post.platform} publisher is not yet implemented` },
      { status: 501 },
    );
  }

  // Parse video file from multipart form
  let videoBuffer: Buffer | undefined;
  let mimeType: string | undefined;
  try {
    const formData = await req.formData();
    const file = formData.get("video");
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      videoBuffer = Buffer.from(arrayBuffer);
      mimeType = file.type || "video/mp4";
    }
  } catch {
    // No video in body — adapter will return an error
  }

  const adapter = new YouTubeShortsAdapter();
  const result = await adapter.publish(post, videoBuffer, mimeType);

  // Log every attempt
  await db.socialPublishAttempt.create({
    data: {
      postId: post.id,
      success: result.ok,
      errorCode: result.ok ? null : result.errorCode,
      errorMsg: result.ok ? null : result.errorMsg,
      response: result.ok
        ? {
            platformPostId: result.platformPostId,
            platformUrl: result.platformUrl,
          }
        : undefined,
    },
  });

  if (!result.ok) {
    await db.socialPost.update({
      where: { id },
      data: { status: "FAILED" },
    });
    return NextResponse.json(
      { error: result.errorMsg, errorCode: result.errorCode },
      { status: 502 },
    );
  }

  await db.socialPost.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      platformPostId: result.platformPostId,
      platformUrl: result.platformUrl,
    },
  });

  return NextResponse.json({
    postId: post.id,
    platformPostId: result.platformPostId,
    platformUrl: result.platformUrl,
  });
}
