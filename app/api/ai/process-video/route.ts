import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { processPendingVideos } from "@/jobs/process-pending-videos";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const cronSecret = request.headers.get("x-cron-secret");
  if (cronSecret !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processPendingVideos();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("AI processing failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
