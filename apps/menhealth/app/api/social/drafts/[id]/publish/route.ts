import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { env } from "@/env";
import { TikTokAdapter } from "@/lib/social/adapters/tiktok";
import type { SocialPublisher } from "@/lib/social/adapters/publisher";
import type { Platform } from "@prisma/client";

export const runtime = "nodejs";
// TikTok's publish/upload/status-poll round trip can take a while.
export const maxDuration = 60;

const ADAPTERS: Partial<Record<Platform, SocialPublisher>> = {
  TIKTOK: new TikTokAdapter({
    clientId: env.TIKTOK_CLIENT_ID,
    clientSecret: env.TIKTOK_CLIENT_SECRET,
    db,
  }),
};

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

  const adapter = ADAPTERS[post.platform];
  if (!adapter) {
    return NextResponse.json(
      {
        error: `Direct publish is not available for ${post.platform}. Use Schedule (X) or the manual posting workflow.`,
      },
      { status: 422 },
    );
  }

  const validation = await adapter.validate(post);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.errors.join("; ") },
      { status: 422 },
    );
  }

  const result = await adapter.publish(post);

  if (result.ok) {
    await db.$transaction([
      db.socialPublishAttempt.create({
        data: {
          postId: post.id,
          success: true,
          response: {
            platformPostId: result.platformPostId,
            platformUrl: result.platformUrl,
          },
        },
      }),
      db.socialPost.update({
        where: { id: post.id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          platformPostId: result.platformPostId,
          platformUrl: result.platformUrl,
        },
      }),
    ]);

    return NextResponse.json({
      id: post.id,
      status: "PUBLISHED",
      platformPostId: result.platformPostId,
      platformUrl: result.platformUrl,
    });
  }

  await db.$transaction([
    db.socialPublishAttempt.create({
      data: {
        postId: post.id,
        success: false,
        errorCode: result.errorCode,
        errorMsg: result.errorMsg,
      },
    }),
    db.socialPost.update({
      where: { id: post.id },
      data: { status: "FAILED" },
    }),
  ]);

  return NextResponse.json({ error: result.errorMsg }, { status: 502 });
}
