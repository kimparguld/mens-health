import { env } from "@/env";
import { getLatestFeedVideos } from "@/lib/rss/queries";
import { buildRssFeed, toFeedItem } from "@/lib/rss/build-feed";

export const revalidate = 600;

export async function GET() {
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const videos = await getLatestFeedVideos();

  const xml = buildRssFeed(
    {
      title: "MenHealth Digest — Latest Reviews",
      description: "Evidence-aware summaries of trending men's health videos.",
      link: appUrl,
    },
    videos.map((v) => toFeedItem(v, appUrl)),
  );

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
