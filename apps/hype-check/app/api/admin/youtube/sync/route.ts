import { auth } from "@/lib/auth";
import { syncYouTubeVideos } from "@/jobs/sync-youtube";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

export async function POST(_request: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await syncYouTubeVideos();
    revalidateTag("videos", "max");
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
