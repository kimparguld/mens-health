import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";
import type { NextRequest } from "next/server";

const BulkReviewBodySchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
  action: z.enum(["PUBLISHED", "REJECTED"]),
  note: z.string().max(500).optional(),
});

const STATUS_FOR_ACTION = {
  PUBLISHED: "PUBLISHED",
  REJECTED: "REJECTED",
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

  const { ids, action, note } = parsed.data;
  const newStatus = STATUS_FOR_ACTION[action];

  await db.$transaction([
    db.video.updateMany({
      where: { id: { in: ids } },
      data: { status: newStatus },
    }),
    ...ids.map((videoId) =>
      db.adminReview.create({ data: { videoId, action, note } }),
    ),
  ]);

  return Response.json({ ok: true, count: ids.length, status: newStatus });
}
