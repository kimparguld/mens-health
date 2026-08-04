import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";
import type { NextRequest } from "next/server";

const WarningSignCreateSchema = z.object({
  subjectId: z.string().min(1),
  text: z.string().min(1).max(500),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  source: z.string().max(200).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = WarningSignCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { subjectId, text, severity, source } = parsed.data;

  const subject = await db.subject.findUnique({ where: { id: subjectId } });
  if (!subject) {
    return Response.json({ error: "Subject not found" }, { status: 404 });
  }

  const warningSign = await db.warningSign.create({
    data: { subjectId, text, severity, source: source ?? null },
  });

  return Response.json({ ok: true, warningSign });
}
