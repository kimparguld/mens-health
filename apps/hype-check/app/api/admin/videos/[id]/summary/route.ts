import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

const ReviewerSchema = z.object({
  reviewerName: z.string().max(200).nullable(),
  reviewerCredentials: z.string().max(200).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = ReviewerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const subject = await db.subject.findUnique({
    where: { id },
    select: {
      slug: true,
      sourceVideos: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: {
          summaries: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { id: true },
          },
        },
      },
    },
  });

  const summary = subject?.sourceVideos[0]?.summaries[0];
  if (!summary) {
    return Response.json(
      { error: "No summary found for this video" },
      { status: 404 },
    );
  }

  await db.summary.update({
    where: { id: summary.id },
    data: {
      reviewerName: parsed.data.reviewerName,
      reviewerCredentials: parsed.data.reviewerCredentials ?? null,
      reviewedByHuman: Boolean(parsed.data.reviewerName),
    },
  });

  revalidateTag("videos", "max");
  if (subject?.slug) revalidateTag(`video:${subject.slug}`, "max");

  return Response.json({ ok: true });
}
