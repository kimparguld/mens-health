import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import type { NextRequest } from "next/server";

// Lets an admin accept an AI-suggested fact-check verdict as-is (used for
// MEDIUM-risk claims, which are pre-filled by the AI but never auto-applied).
// Does not alter evidenceStatus/explanation — the admin is confirming what's
// already displayed, not editing it. To change the verdict, use the PATCH
// route via the claim edit form instead.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const claim = await db.claim.findUnique({ where: { id } });
  if (!claim) {
    return Response.json({ error: "Claim not found" }, { status: 404 });
  }

  await db.claim.update({
    where: { id },
    data: { humanConfirmedAt: new Date() },
  });

  await db.adminReview.create({
    data: {
      subjectId: claim.subjectId,
      action: "APPROVED",
      note: `Confirmed AI fact-check suggestion for claim: "${claim.text.slice(0, 100)}"`,
    },
  });

  return Response.json({ ok: true });
}
