import { db } from "@/lib/db/prisma";

export type WidgetVideo = {
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  evidenceLabel: string;
  riskLevel: string;
  channelTitle: string;
};

function evidenceLabel(evidenceScore: number | null): string {
  if (evidenceScore == null) return "Not yet rated";
  if (evidenceScore >= 0.7) return "Strong evidence";
  if (evidenceScore >= 0.4) return "Mixed evidence";
  return "Weak evidence";
}

const MAX_COUNT = 10;

export async function getTrendingWidgetVideos(
  topicSlug: string | null,
  count: number,
): Promise<WidgetVideo[]> {
  const take = Math.min(Math.max(1, count), MAX_COUNT);
  const videos = await db.video.findMany({
    where: {
      status: "PUBLISHED",
      ...(topicSlug
        ? { topics: { some: { topic: { slug: topicSlug } } } }
        : {}),
    },
    orderBy: [{ trendScore: "desc" }],
    take,
    include: { channel: true },
  });

  return videos.map((v) => ({
    title: v.title,
    slug: v.slug,
    thumbnailUrl: v.thumbnailUrl,
    evidenceLabel: evidenceLabel(v.evidenceScore),
    riskLevel: v.riskLevel,
    channelTitle: v.channel.title,
  }));
}
