import { unstable_cache } from "next/cache";
import { db } from "@/lib/db/prisma";

// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------

export const getFeaturedVideo = unstable_cache(
  async () =>
    db.video.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { trendScore: "desc" },
      include: {
        summaries: { take: 1, orderBy: { createdAt: "desc" } },
        claims: { take: 1, orderBy: { riskLevel: "desc" } },
        topics: { include: { topic: true } },
      },
    }),
  ["featured-video"],
  { revalidate: 60, tags: ["videos"] },
);

// Module-level cache: excludeId is threaded as an argument so that
// unstable_cache is created once and its tags are reliably registered.
const _getTrendingVideosCached = unstable_cache(
  async (excludeId?: string) =>
    db.video.findMany({
      where: {
        status: "PUBLISHED",
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      orderBy: [{ publishedAt: "desc" }, { trendScore: "desc" }],
      take: 13,
      include: {
        channel: true,
        summaries: { take: 1, orderBy: { createdAt: "desc" } },
        topics: { include: { topic: true } },
      },
    }),
  ["trending-videos"],
  { revalidate: 60, tags: ["videos"] },
);
export const getTrendingVideos = (excludeId?: string) =>
  _getTrendingVideosCached(excludeId);

const _getVideoBySlugCached = unstable_cache(
  async (slug: string) =>
    db.video.findUnique({
      where: { slug, status: "PUBLISHED" },
      include: {
        channel: true,
        summaries: { take: 1, orderBy: { createdAt: "desc" } },
        claims: {
          include: { sources: true },
          orderBy: { riskLevel: "desc" },
        },
        topics: { include: { topic: true } },
      },
    }),
  ["video"],
  { revalidate: 60, tags: ["videos"] },
);
export const getVideoBySlug = (slug: string) => _getVideoBySlugCached(slug);

const _getVideoBySlugForMetaCached = unstable_cache(
  async (slug: string) =>
    db.video.findUnique({
      where: { slug, status: "PUBLISHED" },
      include: { summaries: { take: 1, orderBy: { createdAt: "desc" } } },
    }),
  ["video-meta"],
  { revalidate: 60, tags: ["videos"] },
);
export const getVideoBySlugForMeta = (slug: string) =>
  _getVideoBySlugForMetaCached(slug);

const TOPIC_PAGE_SIZE = 18;

const _getTopicVideosCached = unstable_cache(
  async (topicId: string, topicSlug: string, page: number) => {
    const skip = (page - 1) * TOPIC_PAGE_SIZE;
    const where = {
      status: "PUBLISHED" as const,
      topics: { some: { topicId } },
    };
    const [videos, total] = await Promise.all([
      db.video.findMany({
        where,
        orderBy: [{ publishedAt: "desc" }, { trendScore: "desc" }],
        skip,
        take: TOPIC_PAGE_SIZE,
        include: {
          channel: true,
          summaries: { take: 1, orderBy: { createdAt: "desc" } },
          topics: { include: { topic: true } },
        },
      }),
      db.video.count({ where }),
    ]);
    return {
      videos,
      total,
      page,
      totalPages: Math.ceil(total / TOPIC_PAGE_SIZE),
    };
  },
  ["topic-videos"],
  { revalidate: 60, tags: ["videos"] },
);
export function getTopicVideos(topicId: string, topicSlug: string, page = 1) {
  return _getTopicVideosCached(topicId, topicSlug, page);
}

const _getWeeklyRankingVideosCached = unstable_cache(
  async (topicId: string) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const videos = await db.video.findMany({
      where: {
        status: "PUBLISHED",
        topics: { some: { topicId } },
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { trendScore: "desc" },
      take: 10,
      include: {
        channel: true,
        summaries: { take: 1, orderBy: { createdAt: "desc" } },
        topics: { include: { topic: true } },
      },
    });

    if (videos.length === 0) {
      return db.video.findMany({
        where: {
          status: "PUBLISHED",
          topics: { some: { topicId } },
        },
        orderBy: { trendScore: "desc" },
        take: 10,
        include: {
          channel: true,
          summaries: { take: 1, orderBy: { createdAt: "desc" } },
          topics: { include: { topic: true } },
        },
      });
    }

    return videos;
  },
  ["weekly-ranking"],
  { revalidate: 3600, tags: ["videos"] },
);
export function getWeeklyRankingVideos(topicId: string, topicSlug: string) {
  return _getWeeklyRankingVideosCached(topicId);
}

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

const _getTopicBySlugCached = unstable_cache(
  async (slug: string) => db.topic.findUnique({ where: { slug } }),
  ["topic"],
  { revalidate: 60, tags: ["topics"] },
);
export const getTopicBySlug = (slug: string) => _getTopicBySlugCached(slug);
