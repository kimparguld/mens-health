import { NextRequest, NextResponse } from "next/server";
import { sendWeeklyDigest } from "@/jobs/send-digest";
import { env } from "@/env";

export const maxDuration = 300; // 5 min for large subscriber lists

export async function POST(request: NextRequest): Promise<NextResponse> {
  const cronSecret = request.headers.get("x-cron-secret");
  if (cronSecret !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendWeeklyDigest();

  if (!result.ok) {
    return NextResponse.json({ error: "Digest send failed" }, { status: 500 });
  }

  return NextResponse.json(result);
}
