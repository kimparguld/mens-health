import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { isEligibleForAutoPublish } from "@/lib/publishing/auto-publish-gate";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

export async function POST(_request: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Sweep all REVIEW subjects with a summary through the same auto-publish
  // gate the daily cron uses — catches LOW-risk videos and, once every claim
  // has a real evidence verdict, clean MEDIUM-risk videos too. HIGH risk is
  // never eligible, enforced inside the gate itself.
  const [candidates, pendingLowRiskCount] = await Promise.all([
    db.subject.findMany({
      where: {
        status: "REVIEW",
        sourceVideos: { some: { summaries: { some: {} } } },
        claimExtractionFailed: false,
      },
      select: {
        id: true,
        riskLevel: true,
        claims: {
          select: { evidenceStatus: true, autoReviewed: true, humanConfirmedAt: true },
        },
      },
    }),
    db.subject.count({ where: { status: "DRAFT", riskLevel: "LOW" } }),
  ]);

  const eligible = candidates.filter((subject) =>
    isEligibleForAutoPublish(subject, subject.claims),
  );

  if (eligible.length === 0) {
    const hint =
      pendingLowRiskCount > 0
        ? ` (${pendingLowRiskCount} low-risk video(s) are still DRAFT — run "Generate summaries" first to process them)`
        : "";
    return Response.json({
      ok: true,
      published: 0,
      message: `No eligible videos found${hint}`,
    });
  }

  const ids = eligible.map((s) => s.id);

  await db.$transaction([
    db.subject.updateMany({
      where: { id: { in: ids } },
      data: { status: "PUBLISHED" },
    }),
    ...eligible.map((subject) =>
      db.adminReview.create({
        data: {
          subjectId: subject.id,
          action: "PUBLISHED",
          note: `Auto-published: risk level ${subject.riskLevel}, all claims evidence-checked`,
        },
      }),
    ),
  ]);

  revalidateTag("videos", "max");

  return Response.json({ ok: true, published: eligible.length });
}
