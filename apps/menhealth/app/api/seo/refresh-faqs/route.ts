import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { refreshTopicFaqs } from "@/jobs/refresh-topic-faqs";
import { revalidateTag } from "next/cache";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshTopicFaqs();
    revalidateTag("topics", "max");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("FAQ refresh failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
