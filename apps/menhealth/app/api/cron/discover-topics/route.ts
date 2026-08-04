import { NextRequest, NextResponse } from "next/server";
import { discoverTopics } from "@/jobs/discover-topics";
import { env } from "@/env";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await discoverTopics();
  return NextResponse.json(result);
}
