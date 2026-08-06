import type { Platform } from '@/app/generated/prisma';
import { db } from '@/lib/db/prisma';
import Link from 'next/link';

const PLATFORM_COLORS: Record<Platform, string> = {
  YOUTUBE_COMMUNITY: 'bg-red-100 text-red-800',
  TIKTOK: 'bg-black text-white',
  REDDIT: 'bg-orange-100 text-orange-800',
  X: 'bg-gray-900 text-white',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDays(anchor: Date): Date[] {
  const day = anchor.getDay();
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default async function SocialCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const anchor = week ? new Date(week) : new Date();
  const days: Date[] = getWeekDays(anchor);

  const weekStart = days[0];
  const weekEnd = new Date(days[6] as Date);
  weekEnd.setHours(23, 59, 59, 999);

  const posts = await db.socialPost.findMany({
    where: {
      scheduledAt: { gte: weekStart, lte: weekEnd },
      status: { in: ['SCHEDULED', 'PUBLISHED'] },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  function postsForDay(day: Date) {
    return posts.filter((p) => {
      if (!p.scheduledAt) return false;
      const d = new Date(p.scheduledAt);
      return (
        d.getFullYear() === day.getFullYear() &&
        d.getMonth() === day.getMonth() &&
        d.getDate() === day.getDate()
      );
    });
  }

  const prevWeek = new Date(weekStart as Date);
  prevWeek.setDate(weekStart ? weekStart.getDate() - 7 : -7);

  const nextWeek = new Date(weekStart as Date);
  nextWeek.setDate(weekStart ? weekStart.getDate() + 7 : 7);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Social schedule</h1>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/social/calendar?week=${prevWeek.toISOString().split('T')[0]}`}
            className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            ← Prev
          </Link>
          <span className="text-sm text-gray-600">
            {weekStart?.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}{' '}
            –{' '}
            {days[6]?.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <Link
            href={`/admin/social/calendar?week=${nextWeek.toISOString().split('T')[0]}`}
            className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Next →
          </Link>
        </div>
      </div>
      <p className="mb-4 text-sm text-gray-500">
        Only X posts here publish automatically. YouTube Community and Reddit
        dates are for your own planning — post them manually.
      </p>

      {/* Recommended cadence note */}
      <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        Recommended cadence: 3 Shorts/TikToks · 1 Reddit · 1 X per week. Start
        light — learn what performs before scaling up.
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayPosts = postsForDay(day);
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <div
              key={day.toISOString()}
              className={`min-h-32 rounded-lg border bg-white p-2 ${isToday ? 'ring-2 ring-blue-400' : ''}`}
            >
              <p
                className={`mb-2 text-xs font-medium ${isToday ? 'text-accent' : 'text-gray-500'}`}
              >
                {DAY_NAMES[(day.getDay() + 1) % 7]} {day.getDate()}
              </p>
              <div className="space-y-1">
                {dayPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/admin/social/drafts/${post.id}`}
                    className={`block truncate rounded px-1.5 py-1 text-xs font-medium ${
                      PLATFORM_COLORS[post.platform] ??
                      'bg-gray-100 text-gray-700'
                    }`}
                    title={post.hook}
                  >
                    {post.platform.replace('_', ' ')} ·{' '}
                    {post.scheduledAt
                      ? new Date(post.scheduledAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </Link>
                ))}
                {dayPosts.length === 0 && (
                  <p className="text-xs text-gray-300">—</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-right">
        <Link
          href="/admin/social/drafts"
          className="text-accent text-sm hover:underline"
        >
          View all drafts →
        </Link>
      </div>
    </div>
  );
}
