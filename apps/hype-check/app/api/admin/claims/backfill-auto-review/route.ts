import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { classifyDeterministicRisk } from "@/lib/ai/claim-risk";
import { factCheckClaim } from "@/lib/ai/fact-check-claim";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

// Bounded per request so this stays well within a serverless function
// timeout even with a large backlog — the admin UI calls this repeatedly,
// batch by batch, until there's no more forward progress to make.
const BATCH_SIZE = 20;

// Retroactively applies the same LOW/MEDIUM/HIGH auto-review rules used for
// newly extracted claims (see lib/videos/process-video-pipeline.ts) to
// claims created before that logic existed. LOW-risk claims get an AI
// verdict applied automatically; MEDIUM-risk claims get it pre-filled but
// still require a human one-click confirm; HIGH-risk claims are never
// touched — left NOT_CHECKED for full manual review, same as always.
export async function POST(_request: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Ordering by riskLevel ascending relies on Postgres native enum ordering
  // matching declaration order (LOW, MEDIUM, HIGH in schema.prisma) — sorts
  // auto-reviewable claims to the front so HIGH-risk claims that can never
  // be resolved here don't get stuck re-fetched at the head of every batch.
  const claims = await db.claim.findMany({
    where: { evidenceStatus: "NOT_CHECKED" },
    orderBy: [{ riskLevel: "asc" }, { createdAt: "asc" }],
    take: BATCH_SIZE,
  });

  let autoReviewed = 0;
  let prefilled = 0;
  let skippedHighRisk = 0;
  let failed = 0;

  for (const claim of claims) {
    const deterministicRisk = classifyDeterministicRisk(
      claim.category,
      claim.riskLevel,
      claim.text,
    );
    if (deterministicRisk !== claim.riskLevel) {
      await db.claim.update({
        where: { id: claim.id },
        data: { riskLevel: deterministicRisk },
      });
    }

    if (deterministicRisk === "HIGH") {
      skippedHighRisk++;
      continue;
    }

    const factCheckResult = await factCheckClaim({
      text: claim.text,
      category: claim.category,
    });

    if (!factCheckResult.ok) {
      failed++;
      continue;
    }

    await db.claim.update({
      where: { id: claim.id },
      data: {
        evidenceStatus: factCheckResult.value.evidenceStatus,
        explanation: factCheckResult.value.rationale,
        // Only LOW-risk claims are marked auto-reviewed; MEDIUM claims get
        // the verdict pre-filled but still need a human confirm click.
        autoReviewed: deterministicRisk === "LOW",
      },
    });

    if (deterministicRisk === "LOW") {
      autoReviewed++;
    } else {
      prefilled++;
    }
  }

  const remaining = await db.claim.count({
    where: { evidenceStatus: "NOT_CHECKED" },
  });

  revalidateTag("videos", "max");

  return Response.json({
    ok: true,
    processed: claims.length,
    autoReviewed,
    prefilled,
    skippedHighRisk,
    failed,
    remaining,
  });
}
