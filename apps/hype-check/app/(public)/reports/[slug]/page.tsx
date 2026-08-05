import { db } from '@/lib/db/prisma';
import type { MonthlyReportStats } from '@/lib/reports/generate-monthly-report';
import { createMetadata } from '@/lib/seo/site-metadata';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type Params = Promise<{ slug: string }>;

async function getReport(slug: string) {
  return db.monthlyReport.findUnique({ where: { slug } });
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const report = await getReport(slug);
  if (!report) return { title: 'Report Not Found' };

  const stats = report.stats as unknown as MonthlyReportStats;

  return createMetadata({
    title: `${stats.periodLabel} Report`,
    description: `${stats.videosPublished} videos reviewed, ${stats.claimsAssessed} claims assessed in ${stats.periodLabel}. Evidence quality, risk levels, and sourcing breakdown.`,
    path: `/reports/${slug}`,
    type: 'article',
  });
}

export default async function ReportPage({ params }: { params: Params }) {
  const { slug } = await params;
  const report = await getReport(slug);
  if (!report) notFound();

  const stats = report.stats as unknown as MonthlyReportStats;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/reports" className="hover:underline">
          Reports
        </Link>{' '}
        / <span className="text-gray-900">{stats.periodLabel}</span>
      </nav>

      <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900">
        {stats.periodLabel} Report
      </h1>
      <p className="mb-6 text-gray-600">
        {stats.videosPublished} videos reviewed, {stats.claimsAssessed} claims
        assessed. Methodology: every video published on Hype Check in this
        period, with claims extracted and evidence-checked as described on our{' '}
        <Link href="/editorial-process" className="text-ink hover:underline">
          editorial process page
        </Link>
        .
      </p>

      <a
        href={`/reports/${slug}/csv`}
        className="hover:border-ink-muted/30 mb-8 inline-block rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
      >
        Download CSV ↓
      </a>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Claim verdict breakdown
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Status</th>
              <th className="py-2">Count</th>
              <th className="py-2">%</th>
            </tr>
          </thead>
          <tbody>
            {stats.claimVerdictBreakdown.map((row) => (
              <tr key={row.status} className="border-b border-gray-100">
                <td className="py-2 text-gray-800">{row.status}</td>
                <td className="py-2 text-gray-600">{row.count}</td>
                <td className="py-2 text-gray-600">{row.percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Risk level breakdown
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Level</th>
              <th className="py-2">Count</th>
              <th className="py-2">%</th>
            </tr>
          </thead>
          <tbody>
            {stats.riskLevelBreakdown.map((row) => (
              <tr key={row.level} className="border-b border-gray-100">
                <td className="py-2 text-gray-800">{row.level}</td>
                <td className="py-2 text-gray-600">{row.count}</td>
                <td className="py-2 text-gray-600">{row.percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {stats.topicsByHighRiskShare.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Topics with the highest high-risk share
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Topic</th>
                <th className="py-2">High-risk / total</th>
                <th className="py-2">%</th>
              </tr>
            </thead>
            <tbody>
              {stats.topicsByHighRiskShare.map((row) => (
                <tr key={row.topic} className="border-b border-gray-100">
                  <td className="py-2 text-gray-800">{row.topic}</td>
                  <td className="py-2 text-gray-600">
                    {row.highRiskVideos} / {row.totalVideos}
                  </td>
                  <td className="py-2 text-gray-600">{row.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {stats.creatorsBySourcing.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Creators with the strongest sourcing
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Creator</th>
                <th className="py-2">Claims assessed</th>
                <th className="py-2">Avg. sources / claim</th>
              </tr>
            </thead>
            <tbody>
              {stats.creatorsBySourcing.map((row) => (
                <tr key={row.creator} className="border-b border-gray-100">
                  <td className="py-2 text-gray-800">{row.creator}</td>
                  <td className="py-2 text-gray-600">{row.claimsAssessed}</td>
                  <td className="py-2 text-gray-600">
                    {row.avgSourcesPerClaim}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {stats.claimCategoryBreakdown.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Claim category breakdown
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Category</th>
                <th className="py-2">Count</th>
              </tr>
            </thead>
            <tbody>
              {stats.claimCategoryBreakdown.map((row) => (
                <tr key={row.category} className="border-b border-gray-100">
                  <td className="py-2 text-gray-800">{row.category}</td>
                  <td className="py-2 text-gray-600">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
