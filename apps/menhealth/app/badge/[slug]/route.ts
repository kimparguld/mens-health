import { db } from "@/lib/db/prisma";
import { siteConfig } from "@/site.config";
import { buildBadgeSvg, evidenceLabelAndColor } from "@menhealth/core-seo";

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

export async function GET(
  _req: Request,
  { params }: { params: Params },
): Promise<Response> {
  const { slug } = await params;

  const video = await db.video.findUnique({
    where: { slug, status: "PUBLISHED" },
    select: { evidenceScore: true },
  });

  if (!video) {
    return new Response("Not found", { status: 404 });
  }

  const { label, color } = evidenceLabelAndColor(video.evidenceScore);
  const svg = buildBadgeSvg({ siteName: siteConfig.name, evidenceLabel: label, color });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
