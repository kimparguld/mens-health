import { NextRequest, NextResponse } from "next/server";
import { deactivateExpiredSponsors } from "@/jobs/deactivate-expired-sponsors";
import { env } from "@/env";
import { revalidateTag } from "next/cache";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await deactivateExpiredSponsors();
  revalidateTag("sponsors", "max");
  return NextResponse.json(result);
}
