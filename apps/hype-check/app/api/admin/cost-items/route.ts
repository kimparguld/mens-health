import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";
import type { NextRequest } from "next/server";

const CostItemCreateSchema = z.object({
  subjectId: z.string().min(1),
  label: z.string().min(1).max(200),
  amount: z.string().min(1).max(100),
  isHidden: z.boolean(),
  notes: z.string().max(1000).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = CostItemCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { subjectId, label, amount, isHidden, notes } = parsed.data;

  const subject = await db.subject.findUnique({ where: { id: subjectId } });
  if (!subject) {
    return Response.json({ error: "Subject not found" }, { status: 404 });
  }

  const costItem = await db.costItem.create({
    data: { subjectId, label, amount, isHidden, notes: notes ?? null },
  });

  return Response.json({ ok: true, costItem });
}
