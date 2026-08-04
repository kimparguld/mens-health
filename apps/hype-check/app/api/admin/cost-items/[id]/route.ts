import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";
import type { NextRequest } from "next/server";

const CostItemUpdateSchema = z.object({
  label: z.string().min(1).max(200),
  amount: z.string().min(1).max(100),
  isHidden: z.boolean(),
  notes: z.string().max(1000).nullable().optional(),
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
  const parsed = CostItemUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const existing = await db.costItem.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Cost item not found" }, { status: 404 });
  }

  const { label, amount, isHidden, notes } = parsed.data;
  const costItem = await db.costItem.update({
    where: { id },
    data: { label, amount, isHidden, notes: notes ?? null },
  });

  return Response.json({ ok: true, costItem });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await db.costItem.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Cost item not found" }, { status: 404 });
  }

  await db.costItem.delete({ where: { id } });

  return Response.json({ ok: true });
}
