import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { Prisma } from "@/app/generated/prisma";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { submitUrlsToIndexNow } from "@menhealth/core-seo";
import { notifyCreatorIfApplicable } from "@/lib/creators/notify";
import { env } from "@/env";
import { INDEXNOW_KEY } from "@/lib/site-brand";

const ReviewBodySchema = z.object({
  action: z.enum([
    "APPROVED",
    "REJECTED",
    "FLAGGED_HIGH_RISK",
    "PUBLISHED",
    "UNPUBLISHED",
  ]),
  note: z.string().max(500).optional(),
  acknowledgeHighRisk: z.boolean().optional(),
});

const STATUS_FOR_ACTION = {
  PUBLISHED: "PUBLISHED",
  UNPUBLISHED: "REVIEW",
  REJECTED: "ARCHIVED",
  APPROVED: "REVIEW",
  FLAGGED_HIGH_RISK: "REVIEW",
} as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = ReviewBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { action, note, acknowledgeHighRisk } = parsed.data;

  const subject = await db.subject.findUnique({
    where: { id },
    include: {
      sourceVideos: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { summaries: { take: 1, orderBy: { createdAt: "desc" } } },
      },
    },
  });
  if (!subject) {
    return Response.json({ error: "Video not found" }, { status: 404 });
  }

  const hasSummary = (subject.sourceVideos[0]?.summaries.length ?? 0) > 0;

  if (action === "PUBLISHED" && !hasSummary) {
    return Response.json(
      {
        error:
          "Cannot publish a video without a summary. Generate a summary first.",
      },
      { status: 422 },
    );
  }

  // Server-side deny-list for HIGH-risk publish: an admin can still publish
  // a HIGH-risk video, but only by explicitly acknowledging it with a note —
  // this replaces the old client-side-only confirm() dialog with a check
  // that's actually enforced.
  if (
    action === "PUBLISHED" &&
    subject.riskLevel === "HIGH" &&
    (!acknowledgeHighRisk || !note?.trim())
  ) {
    return Response.json(
      {
        error:
          "This video is HIGH risk and requires explicit acknowledgment (acknowledgeHighRisk) plus a note before publishing.",
      },
      { status: 422 },
    );
  }

  const newStatus = STATUS_FOR_ACTION[action];
  const isHighRiskAck =
    action === "PUBLISHED" &&
    subject.riskLevel === "HIGH" &&
    acknowledgeHighRisk === true;

  const ops: Prisma.PrismaPromise<unknown>[] = [
    db.subject.update({ where: { id }, data: { status: newStatus } }),
    db.adminReview.create({
      data: {
        subjectId: id,
        action,
        note,
        acknowledgedHighRisk: isHighRiskAck,
        acknowledgedBy: isHighRiskAck ? session?.user?.email : null,
      },
    }),
  ];

  // When a video is published by an admin, mark unchecked claims as MIXED
  // so they no longer appear as "Not reviewed" to site visitors.
  if (action === "PUBLISHED") {
    ops.push(
      db.claim.updateMany({
        where: { subjectId: id, evidenceStatus: "NOT_CHECKED" },
        data: { evidenceStatus: "MIXED" },
      }),
    );
  }

  await db.$transaction(ops);

  revalidateTag("videos", "max");
  if (subject.slug) revalidateTag(`video:${subject.slug}`, "max");

  if (action === "PUBLISHED") {
    await submitUrlsToIndexNow(
      [`${env.NEXT_PUBLIC_APP_URL}/videos/${subject.slug}`],
      env.NEXT_PUBLIC_APP_URL,
      INDEXNOW_KEY,
    );
    await notifyCreatorIfApplicable(subject.id);
  }

  return Response.json({ ok: true, status: newStatus });
}
