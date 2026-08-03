import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";

// One-time cleanup: wipes every SocialPost (and its attempts/metrics) so the
// drafts list starts fresh after the admin rework. No cascade is configured
// on SocialPublishAttempt/SocialMetric, so child rows are deleted first.
export async function DELETE() {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const attempts = await db.socialPublishAttempt.deleteMany({});
  const metrics = await db.socialMetric.deleteMany({});
  const posts = await db.socialPost.deleteMany({});

  return Response.json({
    ok: true,
    deletedPosts: posts.count,
    deletedAttempts: attempts.count,
    deletedMetrics: metrics.count,
  });
}
