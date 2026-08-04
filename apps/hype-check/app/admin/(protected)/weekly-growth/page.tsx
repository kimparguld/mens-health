import Link from "next/link";

const WEEKLY_SCHEDULE: Array<{
  day: string;
  tasks: Array<{ task: string; link?: string }>;
}> = [
  {
    day: "Monday",
    tasks: [
      {
        task: "Check Google Search Console for pages with impressions but low CTR",
      },
      { task: "Rewrite 2–3 titles and meta descriptions" },
      { task: "Pick 5 trending claims to write up this week" },
    ],
  },
  {
    day: "Tuesday",
    tasks: [
      { task: "Publish 2–3 claim pages", link: "/admin/videos" },
      {
        task: "Generate social scripts from claim pages",
        link: "/admin/social/drafts",
      },
      { task: "Schedule social posts", link: "/admin/social/calendar" },
    ],
  },
  {
    day: "Wednesday",
    tasks: [
      { task: "Post short-form video (YouTube Shorts / TikTok / Reels)" },
      {
        task: "Participate in Reddit or community post",
        link: "/admin/social/drafts",
      },
    ],
  },
  {
    day: "Thursday",
    tasks: [
      { task: "Publish weekly trend page", link: "/weekly" },
      { task: "Send 5 creator outreach emails", link: "/admin/outreach" },
    ],
  },
  {
    day: "Friday",
    tasks: [
      { task: "Send weekly newsletter" },
      { task: "Post weekly roundup short" },
      { task: "Review analytics — what performed best?" },
    ],
  },
  {
    day: "Sunday",
    tasks: [
      { task: "Review this week's top Search Console pages" },
      { task: "Plan next week's topics based on performance" },
    ],
  },
];

export default function WeeklyGrowthPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        Weekly Operating System
      </h1>
      <p className="mb-8 text-sm text-gray-500">
        Follow this workflow every week to run the traffic engine consistently.
      </p>

      <div className="space-y-6">
        {WEEKLY_SCHEDULE.map((day) => (
          <section
            key={day.day}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <h2 className="mb-3 text-base font-bold text-gray-900">
              {day.day}
            </h2>
            <ul className="space-y-2">
              {day.tasks.map((t) => (
                <li key={t.task} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-gray-300 bg-white text-xs">
                    &nbsp;
                  </span>
                  {t.link ? (
                    <Link
                      href={t.link}
                      className="text-indigo-700 underline hover:text-indigo-900"
                    >
                      {t.task}
                    </Link>
                  ) : (
                    <span className="text-gray-700">{t.task}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
        <p className="font-semibold">Recommended weekly output</p>
        <ul className="mt-2 grid grid-cols-2 gap-1 text-gray-600">
          <li>• 10 video summaries</li>
          <li>• 5 claim pages</li>
          <li>• 2 topic-page updates</li>
          <li>• 1 weekly trend page</li>
          <li>• 3 social posts</li>
          <li>• 1 newsletter issue</li>
          <li>• 3 community posts</li>
          <li>• 5 outreach emails</li>
        </ul>
      </div>
    </div>
  );
}
