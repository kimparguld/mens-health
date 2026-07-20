import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { NextRequest } from "next/server";

const ReviewBodySchema = z.object({
  action: z.enum([
    "APPROVED",
    "REJECTED",
    "FLAGGED_HIGH_RISK",
    "PUBLISHED",
    "UNPUBLISHED",
  ]),
  note: z.string().max(500).optional(),
});

const STATUS_FOR_ACTION = {
  PUBLISHED: "PUBLISHED",
  UNPUBLISHED: "PROCESSED",
  REJECTED: "REJECTED",
  APPROVED: "PROCESSED",
  FLAGGED_HIGH_RISK: "PROCESSED",
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

  const { action, note } = parsed.data;

  const video = await db.video.findUnique({ where: { id } });
  if (!video) {
    return Response.json({ error: "Video not found" }, { status: 404 });
  }

  const newStatus = STATUS_FOR_ACTION[action];

  const ops: Prisma.PrismaPromise<unknown>[] = [
    db.video.update({ where: { id }, data: { status: newStatus } }),
    db.adminReview.create({ data: { videoId: id, action, note } }),
  ];

  // When a video is published by an admin, mark unchecked claims as MIXED
  // so they no longer appear as "Not reviewed" to site visitors.
  if (action === "PUBLISHED") {
    ops.push(
      db.claim.updateMany({
        where: { videoId: id, evidenceStatus: "NOT_CHECKED" },
        data: { evidenceStatus: "MIXED" },
      }),
    );
  }

  await db.$transaction(ops);

  return Response.json({ ok: true, status: newStatus });
}
