import { NextRequest, NextResponse } from "next/server";
import { deactivateExpiredSponsors } from "@/jobs/deactivate-expired-sponsors";
import { env } from "@/env";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-cron-secret") !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await deactivateExpiredSponsors();
  return NextResponse.json(result);
}
