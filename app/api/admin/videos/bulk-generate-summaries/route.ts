import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { summarizeVideo } from "@/lib/ai/summarize-video";
import { extractClaims } from "@/lib/ai/extract-claims";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import type { NextRequest } from "next/server";

const BulkGenerateBodySchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
});

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

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = BulkGenerateBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { ids } = parsed.data;

  const videos = await db.video.findMany({
    where: {
      id: { in: ids },
      summaries: { none: {} },
    },
    include: { channel: true },
  });

  if (videos.length === 0) {
    return Response.json({
      ok: true,
      processed: 0,
      failed: 0,
      message: "All selected videos already have a summary.",
    });
  }

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const video of videos) {
    const summaryResult = await summarizeVideo({
      title: video.title,
      description: video.description ?? "",
      channelTitle: video.channel.title,
      durationSeconds: video.durationSeconds ?? 0,
    });

    if (!summaryResult.ok) {
      failed++;
      errors.push(`"${video.title}": ${summaryResult.error.message}`);
      continue;
    }

    const summary = await db.summary.create({
      data: {
        videoId: video.id,
        shortSummary: summaryResult.value.shortSummary,
        longSummary: summaryResult.value.longSummary,
        takeaways: summaryResult.value.takeaways,
        warnings: summaryResult.value.warnings ?? [],
        targetAudience: summaryResult.value.targetAudience,
        redFlags: summaryResult.value.redFlags ?? [],
        modelUsed: "claude-sonnet-4-5",
      },
    });

    const claimsResult = await extractClaims({
      title: video.title,
      description: video.description ?? "",
      shortSummary: summary.shortSummary,
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

    processed++;
  }

  revalidateTag("videos", "max");

  const message =
    failed === 0
      ? `Generated summaries for ${processed} video(s).`
      : `Generated ${processed} summary(s). ${failed} failed: ${errors.join("; ")}`;

  return Response.json({ ok: true, processed, failed, message });
}
