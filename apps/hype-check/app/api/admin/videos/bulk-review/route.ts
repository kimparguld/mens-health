import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

const BulkReviewBodySchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
  action: z.enum(["PUBLISHED", "REJECTED"]),
  note: z.string().max(500).optional(),
  acknowledgeHighRisk: z.boolean().optional(),
});

const STATUS_FOR_ACTION = {
  PUBLISHED: "PUBLISHED",
  REJECTED: "ARCHIVED",
} as const;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = BulkReviewBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { ids, action, note, acknowledgeHighRisk } = parsed.data;
  const newStatus = STATUS_FOR_ACTION[action];

  if (action === "PUBLISHED") {
    const withoutSummary = await db.subject.count({
      where: { id: { in: ids }, sourceVideos: { none: { summaries: { some: {} } } } },
    });
    if (withoutSummary > 0) {
      return Response.json(
        {
          error: `${withoutSummary} video(s) have no summary. Generate summaries before publishing.`,
        },
        { status: 422 },
      );
    }

    // Server-side deny-list for HIGH-risk publish — same rule as the
    // single-video review route: any HIGH-risk video in the batch requires
    // an explicit acknowledgment plus a note, not just a client-side confirm().
    const highRiskCount = await db.subject.count({
      where: { id: { in: ids }, riskLevel: "HIGH" },
    });
    if (highRiskCount > 0 && (!acknowledgeHighRisk || !note?.trim())) {
      return Response.json(
        {
          error: `${highRiskCount} selected video(s) are HIGH risk and require explicit acknowledgment (acknowledgeHighRisk) plus a note before publishing.`,
        },
        { status: 422 },
      );
    }
  }

  const highRiskIds =
    action === "PUBLISHED" && acknowledgeHighRisk
      ? new Set(
          (
            await db.subject.findMany({
              where: { id: { in: ids }, riskLevel: "HIGH" },
              select: { id: true },
            })
          ).map((s) => s.id),
        )
      : new Set<string>();

  await db.$transaction([
    db.subject.updateMany({
      where: { id: { in: ids } },
      data: { status: newStatus },
    }),
    ...ids.map((subjectId) =>
      db.adminReview.create({
        data: {
          subjectId,
          action,
          note,
          acknowledgedHighRisk: highRiskIds.has(subjectId),
          acknowledgedBy: highRiskIds.has(subjectId)
            ? session?.user?.email
            : null,
          reviewerEmail: session?.user?.email,
        },
      }),
    ),
  ]);

  revalidateTag("videos", "max");

  return Response.json({ ok: true, count: ids.length, status: newStatus });
}
