import type { Metadata } from "next";
import { createMetadata } from "@/lib/seo/site-metadata";
import { db } from "@/lib/db/prisma";
import Link from "next/link";

export const metadata: Metadata = createMetadata({
  title: "Monthly Reports — MenHealth Digest",
  description:
    "Data-driven monthly reports on men's health video claims: evidence quality, risk levels, and sourcing across everything we've reviewed.",
  path: "/reports",
});

export default async function ReportsIndexPage() {
  const reports = await db.monthlyReport.findMany({
    orderBy: { periodStart: "desc" },
    take: 60,
    select: { slug: true, periodStart: true },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900">
        Monthly Reports
      </h1>
      <p className="mb-8 text-gray-600">
        Data-driven summaries of every men&apos;s health video and claim we&apos;ve
        reviewed, published monthly with a downloadable CSV.
      </p>
      <ul className="divide-y divide-gray-100">
        {reports.length === 0 && (
          <li className="py-6 text-center text-sm text-gray-700">
            No reports published yet. Check back next month.
          </li>
        )}
        {reports.map((report) => (
          <li key={report.slug} className="py-4">
            <Link
              href={`/reports/${report.slug}`}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              {report.periodStart.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}{" "}
              report
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
