import { db } from '@/lib/db/prisma';
import { CREATOR_SEEDS } from '@/lib/youtube/creators';
import { TOPIC_SEEDS } from '@/lib/youtube/topics';
import { type MetadataRoute } from 'next';

// Serve at request time so the build doesn't need a DB connection.

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.menhealth-digest.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let videos: { slug: string; updatedAt: Date }[] = [];
  let claims: { slug: string | null; id: string; createdAt: Date }[] = [];
  try {
    [videos, claims] = await Promise.all([
      db.video.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true },
      }),
      db.claim.findMany({
        where: { video: { status: 'PUBLISHED' } },
        select: { slug: true, id: true, createdAt: true },
      }),
    ]);
  } catch {
    // DB unavailable — return static URLs only
  }

  const videoUrls: MetadataRoute.Sitemap = videos.map((video) => ({
    url: `${BASE_URL}/videos/${video.slug}`,
    lastModified: video.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const topicUrls: MetadataRoute.Sitemap = TOPIC_SEEDS.map((topic) => ({
    url: `${BASE_URL}/topics/${topic.slug}`,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const rankingUrls: MetadataRoute.Sitemap = TOPIC_SEEDS.map((topic) => ({
    url: `${BASE_URL}/rankings/${topic.slug}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const creatorUrls: MetadataRoute.Sitemap = CREATOR_SEEDS.map((creator) => ({
    url: `${BASE_URL}/creators/${creator.slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const claimUrls: MetadataRoute.Sitemap = claims
    .filter((c) => c.slug != null)
    .map((c) => ({
      url: `${BASE_URL}/claims/${c.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));

  const weeklyUrls: MetadataRoute.Sitemap = TOPIC_SEEDS.map((topic) => ({
    url: `${BASE_URL}/weekly/${topic.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/newsletter`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
    {
      url: `${BASE_URL}/editorial-process`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/medical-disclaimer`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/how-we-rate-evidence`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/affiliate-disclosure`,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'monthly', priority: 0.4 },
  ];

  return [
    {
      url: BASE_URL,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...staticUrls,
    ...topicUrls,
    ...weeklyUrls,
    ...rankingUrls,
    ...creatorUrls,
    ...videoUrls,
    ...claimUrls,
  ];
}
