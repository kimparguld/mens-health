import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { ApprovePostSchema } from "@/lib/social/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = ApprovePostSchema.safeParse({ postId: id });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 422 });
  }

  const post = await db.socialPost.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // High-risk posts require explicit single-post approval — enforce here
  if (post.requiresReview && post.status !== "PENDING_REVIEW" && post.status !== "FAILED") {
    return NextResponse.json(
      { error: "Post must be in PENDING_REVIEW status to approve" },
      { status: 409 },
    );
  }

  const updated = await db.socialPost.update({
    where: { id },
    data: { status: "APPROVED" },
  });

  return NextResponse.json({ postId: updated.id, status: updated.status });
}
