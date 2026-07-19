import { MetadataRoute } from "next";
import { db } from "@/lib/db/prisma";
import { TOPIC_SEEDS } from "@/lib/youtube/topics";

// Serve at request time so the build doesn't need a DB connection.
export const dynamic = "force-dynamic";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://menhealthdigest.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let videos: { slug: string; updatedAt: Date }[] = [];
  try {
    videos = await db.video.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    });
  } catch {
    // DB unavailable — return static URLs only
  }

  const videoUrls: MetadataRoute.Sitemap = videos.map((video) => ({
    url: `${BASE_URL}/videos/${video.slug}`,
    lastModified: video.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const topicUrls: MetadataRoute.Sitemap = TOPIC_SEEDS.map((topic) => ({
    url: `${BASE_URL}/topics/${topic.slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      changeFrequency: "daily",
      priority: 1.0,
    },
    ...topicUrls,
    ...videoUrls,
  ];
}
