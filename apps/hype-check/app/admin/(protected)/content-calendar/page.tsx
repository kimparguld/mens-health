import { db } from '@/lib/db/prisma';
import Link from 'next/link';

async function getUpcomingContent() {
  const [scheduledPosts, pendingVideos, subscribers] = await Promise.all([
    db.socialPost
      .findMany({
        where: { status: { in: ['APPROVED', 'SCHEDULED'] } },
        orderBy: { scheduledAt: 'asc' },
        take: 10,
      })
      .catch(() => []),
    db.subject
      .findMany({
        where: { status: 'REVIEW' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          sourceVideos: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: { summaries: { take: 1, orderBy: { createdAt: 'desc' } } },
          },
        },
      })
      .catch(() => []),
    db.newsletterSubscriber
      .count({ where: { unsubscribedAt: null } })
      .catch(() => 0),
  ]);

  return { scheduledPosts, pendingVideos, subscribers };
}

export default async function ContentCalendarPage() {
  const { scheduledPosts, pendingVideos, subscribers } =
    await getUpcomingContent();

  return (
    <div className="max-w-4xl">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        Content Calendar
      </h1>
      <p className="mb-8 text-sm text-gray-500">
        What&apos;s scheduled, what needs publishing, and what&apos;s ready to
        go.
      </p>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
          <p className="text-xs text-gray-500">Scheduled social posts</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {scheduledPosts.length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
          <p className="text-xs text-gray-500">Pending review (videos)</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {pendingVideos.length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
          <p className="text-xs text-gray-500">Newsletter subscribers</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{subscribers}</p>
        </div>
      </div>

      {/* Scheduled social */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Scheduled social posts
          </h2>
          <Link
            href="/admin/social/calendar"
            className="text-muted text-xs underline"
          >
            View social schedule →
          </Link>
        </div>
        {scheduledPosts.length === 0 ? (
          <p className="text-sm text-gray-400">No scheduled posts yet.</p>
        ) : (
          <ul className="space-y-2">
            {scheduledPosts.map((post) => (
              <li
                key={post.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm"
              >
                <span className="font-medium text-gray-900">
                  {post.platform}
                </span>
                <span className="flex-1 truncate text-gray-600">
                  {post.hook}
                </span>
                {post.scheduledAt && (
                  <span className="flex-shrink-0 text-xs text-gray-400">
                    {new Date(post.scheduledAt).toLocaleDateString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Videos pending publish */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Videos ready to publish
          </h2>
          <Link href="/admin/videos" className="text-muted text-xs underline">
            Review queue →
          </Link>
        </div>
        {pendingVideos.length === 0 ? (
          <p className="text-sm text-gray-400">
            No processed videos waiting for review.
          </p>
        ) : (
          <ul className="space-y-2">
            {pendingVideos.map((video) => (
              <li
                key={video.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm"
              >
                <span className="flex-1 truncate font-medium text-gray-900">
                  {video.editorialTitle ??
                    video.sourceVideos[0]?.title ??
                    video.name}
                </span>
                <Link
                  href={`/admin/videos/${video.id}`}
                  className="text-muted flex-shrink-0 text-xs underline"
                >
                  Review
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Weekly goal reminder */}
      <section className="border-muted/20 rounded-xl border bg-indigo-50 px-5 py-5">
        <h2 className="text-muted/90 mb-2 text-sm font-semibold">
          Weekly publishing goal
        </h2>
        <ul className="text-muted/80 grid grid-cols-2 gap-1 text-sm">
          <li>10 video summaries</li>
          <li>5 claim pages</li>
          <li>2 topic-page updates</li>
          <li>1 weekly trend page</li>
          <li>3 social posts</li>
          <li>1 newsletter issue</li>
        </ul>
        <div className="mt-3 flex gap-3 text-xs">
          <Link href="/admin/weekly-growth" className="text-muted underline">
            Weekly workflow →
          </Link>
          <Link href="/admin/growth-plan" className="text-muted underline">
            90-day plan →
          </Link>
        </div>
      </section>
    </div>
  );
}
