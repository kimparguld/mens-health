import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

// Blind bulk-approve for MEDIUM-risk claims: applies the AI-suggested
// verdict (already pre-filled by /backfill-auto-review) to every pending
// MEDIUM-risk claim at once, with no per-claim look. This is an explicit
// admin choice to skip the one-click-per-claim confirm step for MEDIUM risk
// only — AGENTS.md requires admin approval before publishing for HIGH-risk
// categories (TRT/testosterone, medications, supplements, cancer, mental
// health, ED), not MEDIUM, so this is compliant. HIGH-risk claims are
// structurally excluded: they're never given evidenceStatus by the backfill
// route (see backfill-auto-review/route.ts), so this query can never match
// one, and the query below double-checks riskLevel === "MEDIUM" regardless.
export async function POST(_request: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const pending = await db.claim.findMany({
    where: {
      riskLevel: "MEDIUM",
      autoReviewed: false,
      humanConfirmedAt: null,
      evidenceStatus: { not: "NOT_CHECKED" },
    },
    select: { id: true, videoId: true, text: true },
  });

  if (pending.length === 0) {
    return Response.json({ ok: true, confirmed: 0 });
  }

  const now = new Date();
  await db.$transaction([
    db.claim.updateMany({
      where: { id: { in: pending.map((claim) => claim.id) } },
      data: { humanConfirmedAt: now },
    }),
    db.adminReview.createMany({
      data: pending.map((claim) => ({
        videoId: claim.videoId,
        action: "APPROVED" as const,
        note: `Bulk-confirmed AI fact-check suggestion for claim: "${claim.text.slice(0, 100)}"`,
      })),
    }),
  ]);

  revalidateTag("videos", "max");

  return Response.json({ ok: true, confirmed: pending.length });
}
