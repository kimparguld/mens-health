import { MetadataRoute } from "next";
import { db } from "@/lib/db/prisma";
import { TOPIC_SEEDS } from "@/lib/youtube/topics";
import { CREATOR_SEEDS } from "@/lib/youtube/creators";

// Serve at request time so the build doesn't need a DB connection.

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://menhealth-digest.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let videos: { slug: string; updatedAt: Date }[] = [];
  let claims: { slug: string | null; id: string; createdAt: Date }[] = [];
  try {
    [videos, claims] = await Promise.all([
      db.video.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true },
      }),
      db.claim.findMany({
        where: { video: { status: "PUBLISHED" } },
        select: { slug: true, id: true, createdAt: true },
      }),
    ]);
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

  const rankingUrls: MetadataRoute.Sitemap = TOPIC_SEEDS.map((topic) => ({
    url: `${BASE_URL}/rankings/${topic.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const creatorUrls: MetadataRoute.Sitemap = CREATOR_SEEDS.map((creator) => ({
    url: `${BASE_URL}/creators/${creator.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const claimUrls: MetadataRoute.Sitemap = claims
    .filter((c) => c.slug != null)
    .map((c) => ({
      url: `${BASE_URL}/claims/${c.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));

  return [
    {
      url: BASE_URL,
      changeFrequency: "daily",
      priority: 1.0,
    },
    ...topicUrls,
    ...rankingUrls,
    ...creatorUrls,
    ...videoUrls,
    ...claimUrls,
  ];
}
