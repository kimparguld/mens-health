import { db } from "@/lib/db/prisma";
import Link from "next/link";

async function getGrowthMetrics() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    totalSubscribers,
    newSubscribersThisWeek,
    topSignupSources,
    topUtmSources,
    topUtmCampaigns,
    totalContacts,
    activeCampaigns,
    totalDrafts,
    publishedDrafts,
    publishedVideos,
    topPublishedVideos,
    publishedClaimsCount,
    publishedTopicsCount,
    notCheckedClaimsCount,
    videosWithoutSocialDraft,
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
    db.newsletterSubscriber.groupBy({
      by: ["utmSource"],
      where: { utmSource: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { utmSource: "desc" } },
      take: 5,
    }),
    db.newsletterSubscriber.groupBy({
      by: ["utmCampaign"],
      where: { utmCampaign: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { utmCampaign: "desc" } },
      take: 5,
    }),
    db.outreachContact.count(),
    db.marketingCampaign.count({ where: { isActive: true } }),
    db.socialPost.count(),
    db.socialPost.count({ where: { status: "PUBLISHED" } }),
    db.video.count({ where: { status: "PUBLISHED" } }),
    db.video.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { trendScore: "desc" },
      take: 5,
      select: { title: true, slug: true, trendScore: true, publishedAt: true },
    }),
    db.claim.count({
      where: { video: { status: "PUBLISHED" }, slug: { not: null } },
    }),
    db.topic.count(),
    db.claim.count({ where: { evidenceStatus: "NOT_CHECKED" } }),
    db.video.count({
      where: {
        status: "PUBLISHED",
      },
    }),
  ]);

  return {
    totalSubscribers,
    newSubscribersThisWeek,
    topSignupSources,
    topUtmSources,
    topUtmCampaigns,
    totalContacts,
    activeCampaigns,
    totalDrafts,
    publishedDrafts,
    publishedVideos,
    topPublishedVideos,
    publishedClaimsCount,
    publishedTopicsCount,
    notCheckedClaimsCount,
    videosWithoutSocialDraft,
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
      label: "Published videos",
      value: metrics.publishedVideos,
      sub: "Live on site",
      href: "/admin/videos?status=PUBLISHED",
    },
    {
      label: "Published claim pages",
      value: metrics.publishedClaimsCount,
      sub: "With slugs",
      href: "/admin/claims",
    },
    {
      label: "Topic hubs",
      value: metrics.publishedTopicsCount,
      sub: "Configured",
      href: "/admin/topics",
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

      {/* Subscriber cards */}
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

      {/* Pages needing attention */}
      {(metrics.notCheckedClaimsCount > 0 ||
        metrics.videosWithoutSocialDraft > 0) && (
        <section className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <h2 className="mb-3 text-sm font-semibold text-amber-900">
            Pages needing attention
          </h2>
          <ul className="space-y-1 text-sm text-amber-800">
            {metrics.notCheckedClaimsCount > 0 && (
              <li>
                <Link
                  href="/admin/claims?status=NOT_CHECKED"
                  className="underline"
                >
                  {metrics.notCheckedClaimsCount} claim
                  {metrics.notCheckedClaimsCount !== 1 ? "s" : ""} with
                  NOT_CHECKED evidence status
                </Link>
              </li>
            )}
            {metrics.videosWithoutSocialDraft > 0 && (
              <li>
                <Link
                  href="/admin/videos?status=PUBLISHED"
                  className="underline"
                >
                  {metrics.videosWithoutSocialDraft} published video
                  {metrics.videosWithoutSocialDraft !== 1 ? "s" : ""} without a
                  social draft
                </Link>
              </li>
            )}
          </ul>
        </section>
      )}

      {/* Signup sources */}
      {metrics.topSignupSources.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Top signup sources (page)
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

      {/* UTM source breakdown */}
      {metrics.topUtmSources.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Top UTM sources
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">UTM source</th>
                  <th className="px-4 py-3 text-left">Signups</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {metrics.topUtmSources.map((row) => (
                  <tr key={row.utmSource} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {row.utmSource ?? "(none)"}
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

      {/* UTM campaign breakdown */}
      {metrics.topUtmCampaigns.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Top UTM campaigns
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Campaign</th>
                  <th className="px-4 py-3 text-left">Signups</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {metrics.topUtmCampaigns.map((row) => (
                  <tr key={row.utmCampaign} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {row.utmCampaign ?? "(none)"}
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

      {/* Top published videos */}
      {metrics.topPublishedVideos.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Top published videos by trend score
          </h2>
          <ol className="space-y-2">
            {metrics.topPublishedVideos.map((v, i) => (
              <li
                key={v.slug}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
              >
                <span className="text-xs font-bold text-gray-400">
                  #{i + 1}
                </span>
                <span className="flex-1 font-medium text-gray-900">
                  {v.title}
                </span>
                <span className="text-xs text-gray-400">
                  Score: {(v.trendScore * 100).toFixed(0)}
                </span>
                <Link
                  href={`/videos/${v.slug}`}
                  target="_blank"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View →
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Google Search Console placeholder */}
      <section className="mb-8 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">
          Google Search Console metrics
        </h2>
        <p className="mb-3 text-xs text-gray-500">
          Manual import area — paste your GSC export data here, or connect via
          the API for automatic updates.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {["Impressions", "Clicks", "CTR", "Avg. position"].map((label) => (
            <div
              key={label}
              className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-center"
            >
              <p className="text-xs text-gray-400">{label}</p>
              <p className="mt-1 text-lg font-bold text-gray-400">—</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Connect Google Search Console at{" "}
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            search.google.com
          </a>{" "}
          to see organic search performance.
        </p>
      </section>

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
