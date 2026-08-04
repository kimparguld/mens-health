import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const VerdictBodySchema = z.object({
  verdict: z.enum(["LEGIT", "MISLEADING", "OVERPRICED", "RISKY", "SCAM"]),
  rationale: z.string().max(2000).optional(),
  confidence: z.number().min(0).max(1).optional(),
  acknowledgeHighRisk: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = VerdictBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { verdict, rationale, confidence, acknowledgeHighRisk } = parsed.data;

  const subject = await db.subject.findUnique({ where: { id } });
  if (!subject) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // A SCAM verdict is the most consequential thing this app can say about a
  // subject — mirrors the existing HIGH-risk-claim publish gate: an admin
  // can still publish it, but only by explicitly acknowledging with a
  // rationale, not through a dismissible client-side confirm().
  if (
    verdict === "SCAM" &&
    (!acknowledgeHighRisk || !rationale?.trim())
  ) {
    return NextResponse.json(
      {
        error:
          "A SCAM verdict requires explicit acknowledgment (acknowledgeHighRisk) plus a rationale before it can be published.",
      },
      { status: 422 },
    );
  }

  const isScamAck = verdict === "SCAM" && acknowledgeHighRisk === true;

  await db.$transaction([
    db.verdict.upsert({
      where: { subjectId: id },
      create: {
        subjectId: id,
        verdict,
        internalVerdict: verdict,
        rationale,
        confidence,
        acknowledgedHighRisk: isScamAck,
        acknowledgedBy: isScamAck ? session?.user?.email : null,
        publishedAt: new Date(),
      },
      update: {
        verdict,
        internalVerdict: verdict,
        rationale,
        confidence,
        acknowledgedHighRisk: isScamAck,
        acknowledgedBy: isScamAck ? session?.user?.email : null,
        publishedAt: new Date(),
      },
    }),
    db.verdictHistory.create({
      data: {
        subjectId: id,
        verdict,
        internalVerdict: verdict,
        rationale,
        changedBy: session?.user?.email,
      },
    }),
    ...(isScamAck
      ? [
          db.adminReview.create({
            data: {
              subjectId: id,
              action: "SCAM_VERDICT_ACKNOWLEDGED" as const,
              note: rationale,
              acknowledgedHighRisk: true,
              acknowledgedBy: session?.user?.email,
            },
          }),
        ]
      : []),
  ]);

  revalidateTag("videos", "max");
  if (subject.slug) revalidateTag(`video:${subject.slug}`, "max");

  return NextResponse.json({ ok: true });
}
