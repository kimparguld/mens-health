import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  const isAdmin = (session?.user as { isAdmin?: boolean } | null)?.isAdmin;
  return isAdmin ? session : null;
}

const PatchSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "SKIPPED"]).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

type Params = Promise<{ id: string }>;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Params },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body: unknown = await request.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { status, notes } = parsed.data;

  const updateData: Record<string, unknown> = {};
  if (status !== undefined) {
    updateData.status = status;
    updateData.completedAt = status === "DONE" ? new Date() : null;
  }
  if (notes !== undefined) {
    updateData.notes = notes;
  }

  const task = await db.growthPlanTask.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ task });
}
