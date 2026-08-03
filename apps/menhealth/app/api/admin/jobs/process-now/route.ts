import { auth } from "@/lib/auth";
import { processPendingVideos } from "@/jobs/process-pending-videos";
import { revalidateTag } from "next/cache";

// Manual trigger for the same work /api/ai/process-video's daily cron does.
// Vercel Cron doesn't fire under `next dev`, and even in production it only
// runs once a day and processes a fixed-size batch — this lets an admin
// clear a backlog without waiting.
export async function POST() {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await processPendingVideos();
  revalidateTag("videos", "max");

  return Response.json({ ok: true, ...result });
}
