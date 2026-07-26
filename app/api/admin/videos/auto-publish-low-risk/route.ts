import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

export async function POST(_request: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find all PROCESSED videos with LOW risk that haven't been published and have a summary
  const [videos, pendingLowRiskCount] = await Promise.all([
    db.video.findMany({
      where: { status: "PROCESSED", riskLevel: "LOW", summaries: { some: {} } },
      select: { id: true },
    }),
    db.video.count({ where: { status: "PENDING", riskLevel: "LOW" } }),
  ]);

  if (videos.length === 0) {
    const hint =
      pendingLowRiskCount > 0
        ? ` (${pendingLowRiskCount} low-risk video(s) are still PENDING — run "Generate summaries" first to process them)`
        : "";
    return Response.json({
      ok: true,
      published: 0,
      message: `No eligible videos found${hint}`,
    });
  }

  const ids = videos.map((v) => v.id);

  await db.$transaction([
    db.video.updateMany({
      where: { id: { in: ids } },
      data: { status: "PUBLISHED" },
    }),
    ...ids.map((videoId) =>
      db.adminReview.create({
        data: {
          videoId,
          action: "PUBLISHED",
          note: "Auto-published: low risk level, no high-risk claims",
        },
      }),
    ),
  ]);

  revalidateTag("videos", "max");

  return Response.json({ ok: true, published: videos.length });
}
