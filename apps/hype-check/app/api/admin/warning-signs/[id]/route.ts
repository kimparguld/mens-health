import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";
import type { NextRequest } from "next/server";

const WarningSignUpdateSchema = z.object({
  text: z.string().min(1).max(500),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  source: z.string().max(200).nullable().optional(),
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
  const parsed = WarningSignUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const existing = await db.warningSign.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Warning sign not found" }, { status: 404 });
  }

  const { text, severity, source } = parsed.data;
  const warningSign = await db.warningSign.update({
    where: { id },
    data: { text, severity, source: source ?? null },
  });

  return Response.json({ ok: true, warningSign });
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

  const existing = await db.warningSign.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Warning sign not found" }, { status: 404 });
  }

  await db.warningSign.delete({ where: { id } });

  return Response.json({ ok: true });
}
