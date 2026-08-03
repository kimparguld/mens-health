import { db } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import type { FeedVideo } from "@/lib/rss/build-feed";

const FEED_TAKE = 30;

async function queryFeedVideos(
  where: Prisma.VideoWhereInput,
): Promise<FeedVideo[]> {
  const videos = await db.video.findMany({
    where: { status: "PUBLISHED", ...where },
    orderBy: [{ publishedAt: "desc" }],
    take: FEED_TAKE,
    include: {
      channel: true,
      summaries: { take: 1, orderBy: { createdAt: "desc" } },
    },
  });

  return videos.map((v) => ({
    title: v.title,
    slug: v.slug,
    publishedAt: v.publishedAt,
    thumbnailUrl: v.thumbnailUrl,
    shortSummary: v.summaries[0]?.shortSummary ?? null,
    channelTitle: v.channel.title,
    riskLevel: v.riskLevel,
    evidenceScore: v.evidenceScore,
  }));
}

export function getLatestFeedVideos(): Promise<FeedVideo[]> {
  return queryFeedVideos({});
}

export function getTopicFeedVideos(topicSlug: string): Promise<FeedVideo[]> {
  return queryFeedVideos({ topics: { some: { topic: { slug: topicSlug } } } });
}

export function getHighRiskFeedVideos(): Promise<FeedVideo[]> {
  return queryFeedVideos({ riskLevel: "HIGH" });
}

export function getStrongEvidenceFeedVideos(): Promise<FeedVideo[]> {
  return queryFeedVideos({ evidenceScore: { gte: 0.7 } });
}

export function getWeeklyFeedVideos(): Promise<FeedVideo[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return queryFeedVideos({ createdAt: { gte: sevenDaysAgo } });
}

export async function getCreatorFeedVideos(
  youtubeChannelId: string,
): Promise<FeedVideo[]> {
  const channel = await db.channel.findUnique({
    where: { youtubeId: youtubeChannelId },
  });
  if (!channel) return [];
  return queryFeedVideos({ channelId: channel.id });
}
