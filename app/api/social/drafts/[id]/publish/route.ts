import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { YouTubeCommunityAdapter } from "@/lib/social/adapters/youtube";

/**
 * POST /api/social/drafts/[id]/publish
 *
 * Publishes an approved post to its target platform.
 * Every attempt is logged in SocialPublishAttempt.
 *
 * YouTube Community posts require no video file — the text is posted directly.
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

  if (post.platform !== "YOUTUBE_COMMUNITY") {
    return NextResponse.json(
      { error: `Platform ${post.platform} publisher is not yet implemented` },
      { status: 501 },
    );
  }

  const adapter = new YouTubeCommunityAdapter();
  const result = await adapter.publish(post);

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
