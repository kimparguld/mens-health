import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { RejectPostSchema } from "@/lib/social/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // body is optional for reject
  }

  const parsed = RejectPostSchema.safeParse({
    postId: id,
    ...(body as object),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const post = await db.socialPost.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const updated = await db.socialPost.update({
    where: { id },
    data: { status: "REJECTED" },
  });

  return NextResponse.json({ postId: updated.id, status: updated.status });
}
