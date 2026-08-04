import { unstable_cache } from "next/cache";
import { db } from "@/lib/db/prisma";

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export const getFeaturedVideo = unstable_cache(
  async () =>
    db.subject.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { trendScore: "desc" },
      include: {
        sourceVideos: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: { summaries: { take: 1, orderBy: { createdAt: "desc" } } },
        },
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
    db.subject.findMany({
      where: {
        status: "PUBLISHED",
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      orderBy: [{ publishedAt: "desc" }, { trendScore: "desc" }],
      take: 13,
      include: {
        channel: true,
        sourceVideos: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: { summaries: { take: 1, orderBy: { createdAt: "desc" } } },
        },
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
    db.subject.findUnique({
      where: { slug, status: "PUBLISHED" },
      include: {
        channel: true,
        sourceVideos: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: { summaries: { take: 1, orderBy: { createdAt: "desc" } } },
        },
        claims: {
          include: { evidenceItems: true },
          orderBy: { riskLevel: "desc" },
        },
        topics: { include: { topic: true } },
        warningSigns: true,
        costItems: true,
        disclosures: true,
        verdict: true,
      },
    }),
  ["video"],
  { revalidate: 60, tags: ["videos"] },
);
export const getVideoBySlug = (slug: string) => _getVideoBySlugCached(slug);

/**
 * Fallback: look up a published subject by its YouTube video ID.
 * Used when a slug has changed (e.g. after the clean-video-titles migration)
 * so old social/SEO URLs can redirect to the current canonical slug.
 */
export async function getPublishedVideoSlugByYouTubeId(
  youtubeVideoId: string,
): Promise<string | null> {
  const subject = await db.subject.findUnique({
    where: { youtubeVideoId, status: "PUBLISHED" },
    select: { slug: true },
  });
  return subject?.slug ?? null;
}

const _getVideoBySlugForMetaCached = unstable_cache(
  async (slug: string) =>
    db.subject.findUnique({
      where: { slug, status: "PUBLISHED" },
      include: {
        sourceVideos: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: { summaries: { take: 1, orderBy: { createdAt: "desc" } } },
        },
      },
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
    const [subjects, total] = await Promise.all([
      db.subject.findMany({
        where,
        orderBy: [{ publishedAt: "desc" }, { trendScore: "desc" }],
        skip,
        take: TOPIC_PAGE_SIZE,
        include: {
          channel: true,
          sourceVideos: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: {
              summaries: { take: 1, orderBy: { createdAt: "desc" } },
            },
          },
          topics: { include: { topic: true } },
        },
      }),
      db.subject.count({ where }),
    ]);
    return {
      videos: subjects,
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

    const subjects = await db.subject.findMany({
      where: {
        status: "PUBLISHED",
        topics: { some: { topicId } },
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { trendScore: "desc" },
      take: 10,
      include: {
        channel: true,
        sourceVideos: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: { summaries: { take: 1, orderBy: { createdAt: "desc" } } },
        },
        topics: { include: { topic: true } },
      },
    });

    if (subjects.length === 0) {
      return db.subject.findMany({
        where: {
          status: "PUBLISHED",
          topics: { some: { topicId } },
        },
        orderBy: { trendScore: "desc" },
        take: 10,
        include: {
          channel: true,
          sourceVideos: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: {
              summaries: { take: 1, orderBy: { createdAt: "desc" } },
            },
          },
          topics: { include: { topic: true } },
        },
      });
    }

    return subjects;
  },
  ["weekly-ranking"],
  { revalidate: 3600, tags: ["videos"] },
);
export function getWeeklyRankingVideos(topicId: string) {
  return _getWeeklyRankingVideosCached(topicId);
}

const _getRelatedVideosCached = unstable_cache(
  async (topicId: string, excludeVideoId: string) =>
    db.subject.findMany({
      where: {
        status: "PUBLISHED",
        id: { not: excludeVideoId },
        topics: { some: { topicId } },
      },
      orderBy: { trendScore: "desc" },
      take: 3,
      include: { channel: true },
    }),
  ["related-videos"],
  { revalidate: 60, tags: ["videos"] },
);
export function getRelatedVideos(
  topicId: string | undefined,
  excludeVideoId: string,
) {
  if (!topicId) return Promise.resolve([]);
  return _getRelatedVideosCached(topicId, excludeVideoId);
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
