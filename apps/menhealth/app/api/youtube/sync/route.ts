import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { syncYouTubeVideos } from "@/jobs/sync-youtube";
import { revalidateTag } from "next/cache";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncYouTubeVideos();
    revalidateTag("videos", "max");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("YouTube sync failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
