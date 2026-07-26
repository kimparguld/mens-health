import Link from "next/link";

const PHASE_TASKS: Array<{
  phase: string;
  duration: string;
  goal: string;
  tasks: string[];
}> = [
  {
    phase: "Foundation",
    duration: "Day 1–14",
    goal: "Make the site measurable, indexable, and conversion-ready.",
    tasks: [
      "Set up Google Search Console",
      "Set up analytics",
      "Newsletter landing page live",
      "Homepage CTA improved",
      "How we rate evidence page complete",
      "Editorial process page complete",
      "Medical disclaimer page complete",
      "Affiliate disclosure page complete",
      "10 topic hubs published",
      "20 claim pages published",
    ],
  },
  {
    phase: "Distribution",
    duration: "Day 15–30",
    goal: "Build repeatable weekly publishing workflow.",
    tasks: [
      "5 claim pages per week",
      "10 video summaries per week",
      "3 short-form social posts per week",
      "1 newsletter per week",
      "3 community posts per week",
      "5 creator outreach emails per week",
    ],
  },
  {
    phase: "Optimisation",
    duration: "Day 31–60",
    goal: "Improve what's working, double down on top pages.",
    tasks: [
      "Identify top pages by impressions in Search Console",
      "Improve titles and meta descriptions on top pages",
      "Create more pages around winning topics",
      "Start small paid ad tests",
      "Create one lead magnet",
      "Add newsletter CTA to all public pages",
    ],
  },
  {
    phase: "Scale",
    duration: "Day 61–90",
    goal: "Increase output around best topics, build relationships.",
    tasks: [
      "Increase content velocity around best-performing topics",
      "Create weekly trend report",
      "Pitch newsletter sponsors",
      "Build creator relationships",
      "Test Reddit or Google ads",
      "Create premium waitlist",
    ],
  },
];

export default function GrowthPlanPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        90-Day Growth Plan
      </h1>
      <p className="mb-8 text-sm text-gray-500">
        The traffic foundation for MenHealth Digest. Each phase builds on the
        last.
      </p>

      <div className="space-y-8">
        {PHASE_TASKS.map((phase) => (
          <section
            key={phase.phase}
            className="rounded-xl border border-gray-200 bg-white p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Phase {PHASE_TASKS.indexOf(phase) + 1}: {phase.phase}
                </h2>
                <p className="text-xs font-semibold text-gray-400">
                  {phase.duration}
                </p>
              </div>
            </div>
            <p className="mb-4 text-sm text-gray-600">{phase.goal}</p>
            <ul className="space-y-2">
              {phase.tasks.map((task) => (
                <li
                  key={task}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-gray-300 bg-white text-xs">
                    &nbsp;
                  </span>
                  {task}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
        <p className="font-semibold">Quick links</p>
        <div className="mt-2 flex flex-wrap gap-3 text-emerald-700">
          <Link href="/admin/content-calendar" className="underline">
            Content calendar
          </Link>
          <Link href="/admin/social/drafts" className="underline">
            Social drafts
          </Link>
          <Link href="/admin/outreach" className="underline">
            Outreach CRM
          </Link>
          <Link href="/admin/marketing/campaigns" className="underline">
            Campaigns
          </Link>
        </div>
      </div>
    </div>
  );
}
