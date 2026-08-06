import { db } from '@/lib/db/prisma';
import { createMetadata } from '@/lib/seo/site-metadata';
import { PageBreadcrumbs } from '@menhealth/ui';
import type { Metadata } from 'next';
import Link from 'next/link';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.hype-check.net';

export const metadata: Metadata = createMetadata({
  title: 'Monthly Reports',
  description:
    "Data-driven monthly reports on the claims we've checked: evidence quality, risk levels, and sourcing across everything we've reviewed.",
  path: '/reports',
});

export default async function ReportsIndexPage() {
  const reports = await db.monthlyReport.findMany({
    orderBy: { periodStart: 'desc' },
    take: 60,
    select: { slug: true, periodStart: true },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <PageBreadcrumbs
        baseUrl={APP_URL}
        trail={[{ label: 'Reports', href: '/reports' }]}
      />
      <h1 className="heading">Monthly Reports</h1>
      <p className="mb-8 text-gray-600">
        Data-driven summaries of every video and claim we&apos;ve reviewed,
        published monthly with a downloadable CSV.
      </p>
      <ul className="divide-y divide-gray-100">
        {reports.length === 0 && (
          <li className="py-6 text-center text-sm text-gray-500">
            No reports published yet. Check back next month.
          </li>
        )}
        {reports.map((report) => (
          <li key={report.slug} className="py-4">
            <Link
              href={`/reports/${report.slug}`}
              className="text-accent text-sm font-medium hover:underline"
            >
              {report.periodStart.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}{' '}
              report
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
