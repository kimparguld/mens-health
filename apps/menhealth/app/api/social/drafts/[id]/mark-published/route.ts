import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";

const MarkPublishedSchema = z.object({
  platformUrl: z.string().url().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = MarkPublishedSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const post = await db.socialPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (post.status === "PUBLISHED" || post.status === "REJECTED") {
    return NextResponse.json(
      { error: `Cannot mark a ${post.status} post as published` },
      { status: 400 },
    );
  }

  const updated = await db.socialPost.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      ...(body.data.platformUrl ? { platformUrl: body.data.platformUrl } : {}),
    },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
