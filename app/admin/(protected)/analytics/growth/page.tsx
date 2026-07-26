import { db } from "@/lib/db/prisma";
import Link from "next/link";

async function getGrowthMetrics() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    totalSubscribers,
    newSubscribersThisWeek,
    topSignupSources,
    totalContacts,
    activeCampaigns,
    totalDrafts,
    publishedDrafts,
  ] = await Promise.all([
    db.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
    db.newsletterSubscriber.count({
      where: { unsubscribedAt: null, createdAt: { gte: sevenDaysAgo } },
    }),
    db.newsletterSubscriber.groupBy({
      by: ["sourcePage"],
      where: { sourcePage: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { sourcePage: "desc" } },
      take: 5,
    }),
    db.outreachContact.count(),
    db.marketingCampaign.count({ where: { isActive: true } }),
    db.socialPost.count(),
    db.socialPost.count({ where: { status: "PUBLISHED" } }),
  ]);

  return {
    totalSubscribers,
    newSubscribersThisWeek,
    topSignupSources,
    totalContacts,
    activeCampaigns,
    totalDrafts,
    publishedDrafts,
  };
}

export default async function GrowthAnalyticsPage() {
  const metrics = await getGrowthMetrics();

  const cards = [
    {
      label: "Newsletter subscribers",
      value: metrics.totalSubscribers,
      sub: `+${metrics.newSubscribersThisWeek} this week`,
      href: "/admin/subscribers",
    },
    {
      label: "Active campaigns",
      value: metrics.activeCampaigns,
      sub: "Paid and organic",
      href: "/admin/marketing/campaigns",
    },
    {
      label: "Outreach contacts",
      value: metrics.totalContacts,
      sub: "Creator and sponsor pipeline",
      href: "/admin/outreach",
    },
    {
      label: "Social drafts",
      value: metrics.totalDrafts,
      sub: `${metrics.publishedDrafts} published`,
      href: "/admin/social/drafts",
    },
  ];

  return (
    <div className="max-w-4xl">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        Growth Analytics
      </h1>
      <p className="mb-8 text-sm text-gray-500">
        Key metrics for the traffic engine. For detailed SEO data, use Google
        Search Console.
      </p>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-xl border border-gray-200 bg-white px-4 py-4 transition-colors hover:border-emerald-300"
          >
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="mt-0.5 text-xs text-gray-400">{c.sub}</p>
          </Link>
        ))}
      </div>

      {/* Signup sources */}
      {metrics.topSignupSources.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Top signup sources
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Source page</th>
                  <th className="px-4 py-3 text-left">Signups</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {metrics.topSignupSources.map((row) => (
                  <tr key={row.sourcePage} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {row.sourcePage ?? "(unknown)"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {row._count._all}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Growth loop reminder */}
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-5">
        <h2 className="mb-2 text-sm font-semibold text-emerald-900">
          Traffic loop
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-800">
          {[
            "SEO claim pages",
            "Social posts",
            "Newsletter signup",
            "Weekly digest",
            "Return visitors",
            "Revenue",
          ].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium">
                {step}
              </span>
              {i < arr.length - 1 && <span>→</span>}
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-3 text-xs">
          <Link
            href="/admin/growth-plan"
            className="text-emerald-700 underline"
          >
            90-day plan →
          </Link>
          <Link
            href="/admin/weekly-growth"
            className="text-emerald-700 underline"
          >
            Weekly workflow →
          </Link>
        </div>
      </section>
    </div>
  );
}
