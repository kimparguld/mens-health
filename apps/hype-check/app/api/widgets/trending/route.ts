import { NextRequest, NextResponse } from "next/server";
import { getTrendingWidgetVideos } from "@/lib/widgets/queries";
import { env } from "@/env";

export const revalidate = 300;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topic = searchParams.get("topic");
  const countParam = parseInt(searchParams.get("count") ?? "5", 10);
  const count = Number.isFinite(countParam) ? countParam : 5;

  const videos = await getTrendingWidgetVideos(topic, count);
  const appUrl = env.NEXT_PUBLIC_APP_URL;

  const payload = videos.map((v) => ({
    title: v.title,
    url: `${appUrl}/videos/${v.slug}`,
    thumbnailUrl: v.thumbnailUrl,
    evidenceLabel: v.evidenceLabel,
    riskLevel: v.riskLevel,
    channelTitle: v.channelTitle,
  }));

  return NextResponse.json(
    { videos: payload },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}
