import type {
  Claim,
  ClaimCategory,
  RiskLevel,
  Summary,
} from "@/app/generated/prisma";
import { db } from "@/lib/db/prisma";
import { summarizeVideo } from "@/lib/ai/summarize-video";
import { extractClaims } from "@/lib/ai/extract-claims";
import { classifyDeterministicRisk } from "@/lib/ai/claim-risk";
import type { Result } from "@/lib/ai/summarize-video";

export function generateClaimSlug(text: string, id: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
    .replace(/-+$/, "");
  return `${base}-${id.slice(-6)}`;
}

export type PipelineVideoInput = {
  subjectId: string;
  sourceVideoId: string;
  title: string;
  description: string | null;
  durationSeconds: number | null;
  riskLevel: RiskLevel;
};

export type GenerateSummaryAndClaimsResult = {
  summary: Summary;
  claims: Claim[];
};

const RISK_RANK: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

// Generates the AI summary and extracted claims for a video, persists both,
// and escalates the video's riskLevel to match the highest deterministic
// risk found among its claims (never de-escalates). Shared by the daily
// cron job and the manual "Generate summary" admin action so this logic —
// including the LOW/MEDIUM auto-review and HIGH lockout rules — only needs
// to be written once.
export async function generateSummaryAndClaims(
  video: PipelineVideoInput,
  channelTitle: string,
  opts: { modelUsed: string },
): Promise<Result<GenerateSummaryAndClaimsResult>> {
  const summaryResult = await summarizeVideo({
    title: video.title,
    description: video.description ?? "",
    channelTitle,
    durationSeconds: video.durationSeconds ?? 0,
  });

  if (!summaryResult.ok) {
    return { ok: false, error: summaryResult.error };
  }

  const summary = await db.summary.create({
    data: {
      sourceVideoId: video.sourceVideoId,
      shortSummary: summaryResult.value.shortSummary,
      longSummary: summaryResult.value.longSummary,
      takeaways: summaryResult.value.takeaways,
      warnings: summaryResult.value.warnings ?? [],
      targetAudience: summaryResult.value.targetAudience,
      redFlags: summaryResult.value.redFlags ?? [],
      modelUsed: opts.modelUsed,
    },
  });

  const claimsResult = await extractClaims({
    title: video.title,
    description: video.description ?? "",
    shortSummary: summary.shortSummary,
  });

  if (!claimsResult.ok) {
    console.warn(
      `Claim extraction failed for video ${video.sourceVideoId}: ${claimsResult.error.message}`,
    );
    return { ok: true, value: { summary, claims: [] } };
  }

  const claims: Claim[] = [];
  let highestClaimRisk: RiskLevel = "LOW";

  for (const extracted of claimsResult.value) {
    // Safe: extracted.category is validated at runtime against this site's
    // claimCategories list (see packages/core-ai/src/pipeline.ts) before we
    // ever get here — TS just can't narrow the literal union automatically.
    const category = extracted.category as ClaimCategory;
    const deterministicRisk = classifyDeterministicRisk(
      category,
      extracted.riskLevel,
      extracted.text,
    );

    if (RISK_RANK[deterministicRisk] > RISK_RANK[highestClaimRisk]) {
      highestClaimRisk = deterministicRisk;
    }

    // HIGH claims never get an automated verdict — discarded by
    // construction, not by a UI hint that could later be relaxed.
    const factCheck =
      deterministicRisk === "HIGH" ? undefined : extracted.factCheck;

    const created = await db.claim.create({
      data: {
        subjectId: video.subjectId,
        text: extracted.text,
        claimType: category,
        riskLevel: deterministicRisk,
        evidenceStatus: factCheck?.evidenceStatus ?? "NOT_CHECKED",
        explanation: factCheck?.rationale ?? extracted.explanation ?? null,
        // Only LOW-risk claims with an actual AI verdict are auto-reviewed;
        // MEDIUM claims get the verdict pre-filled but still need a human
        // one-click confirm, and HIGH claims never get a verdict at all.
        autoReviewed: deterministicRisk === "LOW" && factCheck != null,
      },
    });
    const withSlug = await db.claim.update({
      where: { id: created.id },
      data: { slug: generateClaimSlug(extracted.text, created.id) },
    });
    claims.push(withSlug);
  }

  if (RISK_RANK[highestClaimRisk] > RISK_RANK[video.riskLevel]) {
    await db.subject.update({
      where: { id: video.subjectId },
      data: { riskLevel: highestClaimRisk },
    });
  }

  return { ok: true, value: { summary, claims } };
}
