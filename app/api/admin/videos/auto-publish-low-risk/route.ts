import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

export async function POST(_request: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find all PROCESSED videos with LOW risk that haven't been published
  const videos = await db.video.findMany({
    where: { status: "PROCESSED", riskLevel: "LOW" },
    select: { id: true },
  });

  if (videos.length === 0) {
    return Response.json({
      ok: true,
      published: 0,
      message: "No eligible videos found",
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
