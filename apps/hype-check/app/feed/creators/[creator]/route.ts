import { env } from "@/env";
import { CREATOR_SEEDS } from "@/lib/youtube/creators";
import { getCreatorFeedVideos } from "@/lib/rss/queries";
import { buildRssFeed, toFeedItem } from "@/lib/rss/build-feed";

export const revalidate = 600;

type Params = Promise<{ creator: string }>;

export async function GET(
  _req: Request,
  { params }: { params: Params },
): Promise<Response> {
  const { creator } = await params;
  const slug = creator.endsWith(".xml") ? creator.slice(0, -4) : creator;

  const seed = CREATOR_SEEDS.find((c) => c.slug === slug);
  if (!seed) {
    return new Response("Not found", { status: 404 });
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const videos = await getCreatorFeedVideos(seed.youtubeChannelId);

  const xml = buildRssFeed(
    {
      title: `Hype Check — ${seed.name}`,
      description: `Reviews of videos from ${seed.name}.`,
      link: `${appUrl}/creators/${seed.slug}`,
    },
    videos.map((v) => toFeedItem(v, appUrl)),
  );

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
