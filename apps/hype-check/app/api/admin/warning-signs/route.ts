import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { RISK_RANK } from "@/lib/videos/process-video-pipeline";
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

  // A HIGH-severity warning sign must escalate the subject's risk level
  // exactly like the AI-extraction write paths do, whether it was typed in
  // by an admin or found by the pipeline — this is what keeps the video
  // behind the admin-approval gate (isEligibleForAutoPublish).
  if (RISK_RANK[severity] > RISK_RANK[subject.riskLevel]) {
    await db.subject.update({
      where: { id: subject.id },
      data: { riskLevel: severity },
    });
  }

  return Response.json({ ok: true, warningSign });
}
