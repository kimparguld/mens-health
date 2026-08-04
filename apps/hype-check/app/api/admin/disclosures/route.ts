import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";
import type { NextRequest } from "next/server";

const DisclosureCreateSchema = z.object({
  subjectId: z.string().min(1),
  text: z.string().min(1).max(500),
  detected: z.boolean(),
  source: z.string().max(200).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = DisclosureCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { subjectId, text, detected, source } = parsed.data;

  const subject = await db.subject.findUnique({ where: { id: subjectId } });
  if (!subject) {
    return Response.json({ error: "Subject not found" }, { status: 404 });
  }

  const disclosure = await db.disclosure.create({
    data: { subjectId, text, detected, source: source ?? null },
  });

  return Response.json({ ok: true, disclosure });
}
