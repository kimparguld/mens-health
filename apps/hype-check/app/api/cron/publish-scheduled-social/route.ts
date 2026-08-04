import { NextRequest, NextResponse } from "next/server";
import { publishScheduledPosts } from "@/jobs/publish-scheduled-social";
import { env } from "@/env";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await publishScheduledPosts();
  return NextResponse.json(result);
}
