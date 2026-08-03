import { env } from "@/env";
import { TOPIC_SEEDS } from "@/lib/youtube/topics";
import {
  getTopicFeedVideos,
  getHighRiskFeedVideos,
  getStrongEvidenceFeedVideos,
  getWeeklyFeedVideos,
} from "@/lib/rss/queries";
import { buildRssFeed, toFeedItem, type FeedVideo } from "@/lib/rss/build-feed";

export const revalidate = 600;

type Params = Promise<{ feed: string }>;

const SPECIAL_FEEDS: Record<
  string,
  {
    title: string;
    description: string;
    load: () => Promise<FeedVideo[]>;
  }
> = {
  "weekly.xml": {
    title: "MenHealth Digest — This Week",
    description: "Videos published in the last 7 days.",
    load: getWeeklyFeedVideos,
  },
  "high-risk.xml": {
    title: "MenHealth Digest — High Risk Claims",
    description: "Videos flagged for high-risk health claims.",
    load: getHighRiskFeedVideos,
  },
  "strong-evidence.xml": {
    title: "MenHealth Digest — Strong Evidence",
    description: "Videos whose claims are backed by strong evidence.",
    load: getStrongEvidenceFeedVideos,
  },
};

export async function GET(
  _req: Request,
  { params }: { params: Params },
): Promise<Response> {
  const { feed } = await params;
  const appUrl = env.NEXT_PUBLIC_APP_URL;

  const special = SPECIAL_FEEDS[feed];
  if (special) {
    const videos = await special.load();
    const xml = buildRssFeed(
      { title: special.title, description: special.description, link: appUrl },
      videos.map((v) => toFeedItem(v, appUrl)),
    );
    return new Response(xml, {
      headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
    });
  }

  const topicSlug = feed.endsWith(".xml") ? feed.slice(0, -4) : feed;
  const topic = TOPIC_SEEDS.find((t) => t.slug === topicSlug);
  if (!topic) {
    return new Response("Not found", { status: 404 });
  }

  const videos = await getTopicFeedVideos(topic.slug);
  const xml = buildRssFeed(
    {
      title: `MenHealth Digest — ${topic.name}`,
      description: topic.description,
      link: `${appUrl}/topics/${topic.slug}`,
    },
    videos.map((v) => toFeedItem(v, appUrl)),
  );

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
