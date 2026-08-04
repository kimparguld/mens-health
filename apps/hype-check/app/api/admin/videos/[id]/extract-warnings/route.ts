import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { extractWarningsCostsDisclosures } from "@/lib/ai/extract-warnings-costs-disclosures";
import {
  highestRiskLevel,
  RISK_RANK,
} from "@/lib/videos/process-video-pipeline";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const AI_EXTRACTION_SOURCE = "ai-extraction";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const subject = await db.subject.findUnique({
    where: { id },
    include: {
      sourceVideos: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { summaries: { take: 1, orderBy: { createdAt: "desc" } } },
      },
    },
  });

  if (!subject) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const sourceVideo = subject.sourceVideos[0];
  const summary = sourceVideo?.summaries[0];
  if (!sourceVideo || !summary) {
    return NextResponse.json(
      { error: "Generate a summary for this video first" },
      { status: 400 },
    );
  }

  const result = await extractWarningsCostsDisclosures({
    title: sourceVideo.title,
    description: sourceVideo.description ?? "",
    shortSummary: summary.shortSummary,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  const { warningSigns, costItems, disclosures } = result.value;

  if (warningSigns.length > 0) {
    await db.warningSign.createMany({
      data: warningSigns.map((w) => ({
        subjectId: subject.id,
        text: w.text,
        severity: w.severity,
        source: AI_EXTRACTION_SOURCE,
      })),
    });
  }
  if (costItems.length > 0) {
    await db.costItem.createMany({
      data: costItems.map((c) => ({
        subjectId: subject.id,
        label: c.label,
        amount: c.amount,
        isHidden: c.isHidden,
        notes: c.notes ?? null,
      })),
    });
  }
  if (disclosures.length > 0) {
    await db.disclosure.createMany({
      data: disclosures.map((d) => ({
        subjectId: subject.id,
        text: d.text,
        detected: d.detected,
        source: AI_EXTRACTION_SOURCE,
      })),
    });
  }

  // A HIGH-severity warning sign found by this backfill must escalate the
  // subject's risk level exactly like the main pipeline does — this is what
  // keeps the video behind the admin-approval gate (isEligibleForAutoPublish)
  // instead of silently remaining eligible for auto-publish.
  const highestWarningSeverity = highestRiskLevel(
    warningSigns.map((w) => w.severity),
  );
  if (RISK_RANK[highestWarningSeverity] > RISK_RANK[subject.riskLevel]) {
    await db.subject.update({
      where: { id: subject.id },
      data: { riskLevel: highestWarningSeverity },
    });
  }

  revalidateTag("videos", "max");
  revalidateTag(`video:${subject.slug}`, "max");

  return NextResponse.json({ ok: true });
}
