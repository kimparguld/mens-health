import { NextRequest, NextResponse } from "next/server";
import { generateMonthlyReport } from "@/jobs/generate-monthly-report";
import { env } from "@/env";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await generateMonthlyReport();
  return NextResponse.json(result);
}
