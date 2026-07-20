import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { summarizeVideo } from "@/lib/ai/summarize-video";
import { extractClaims } from "@/lib/ai/extract-claims";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function generateClaimSlug(text: string, id: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
    .replace(/-+$/, "");
  return `${base}-${id.slice(-6)}`;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const video = await db.video.findUnique({
    where: { id },
    include: { channel: true },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // Generate summary
  const summaryResult = await summarizeVideo({
    title: video.title,
    description: video.description ?? "",
    channelTitle: video.channel.title,
    durationSeconds: video.durationSeconds ?? 0,
  });

  if (!summaryResult.ok) {
    return NextResponse.json(
      { error: summaryResult.error.message },
      { status: 500 },
    );
  }

  await db.summary.create({
    data: {
      videoId: video.id,
      shortSummary: summaryResult.value.shortSummary,
      longSummary: summaryResult.value.longSummary,
      takeaways: summaryResult.value.takeaways,
      warnings: summaryResult.value.warnings ?? [],
      targetAudience: summaryResult.value.targetAudience,
      redFlags: summaryResult.value.redFlags ?? [],
      modelUsed: "llama-3.3-70b-versatile",
    },
  });

  // Extract claims (non-fatal)
  const claimsResult = await extractClaims({
    title: video.title,
    description: video.description ?? "",
    shortSummary: summaryResult.value.shortSummary,
  });

  if (claimsResult.ok) {
    const hasHighRiskClaims = claimsResult.value.some(
      (c) => c.riskLevel === "HIGH",
    );

    for (const claim of claimsResult.value) {
      const created = await db.claim.create({
        data: {
          videoId: video.id,
          text: claim.text,
          category: claim.category,
          riskLevel: claim.riskLevel,
          evidenceStatus: "NOT_CHECKED",
          explanation: claim.explanation,
        },
      });
      await db.claim.update({
        where: { id: created.id },
        data: { slug: generateClaimSlug(claim.text, created.id) },
      });
    }

    if (hasHighRiskClaims && video.riskLevel === "LOW") {
      await db.video.update({
        where: { id: video.id },
        data: { riskLevel: "HIGH" },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
