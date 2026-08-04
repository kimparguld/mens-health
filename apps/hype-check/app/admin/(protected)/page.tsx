import type { Prisma } from '@/app/generated/prisma';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/prisma';
import Link from 'next/link';
import AdminBulkActions from './AdminBulkActions';

type PublishStatus = 'DRAFT' | 'REVIEW' | 'ARCHIVED' | 'PUBLISHED';

type StatusCounts = Record<string, number>;

// A claim needs a human look when it has no verdict at all (NOT_CHECKED —
// always true for HIGH-risk claims) or when it has an AI-suggested verdict
// (MEDIUM-risk) that hasn't been confirmed yet. Mirrors the claims page's
// tab split so the two views agree on what "needs review" means.
const NEEDS_REVIEW_WHERE: Prisma.ClaimWhereInput = {
  OR: [
    { evidenceStatus: 'NOT_CHECKED' },
    {
      autoReviewed: false,
      humanConfirmedAt: null,
      evidenceStatus: { not: 'NOT_CHECKED' },
    },
  ],
};

async function getStats(): Promise<{
  total: number;
  byCounts: StatusCounts;
  pendingJobs: number;
  subscribers: number;
  claimsNeedingReview: number;
  claimsAutoReviewed: number;
  claimsReviewed: number;
}> {
  const [
    statusGroups,
    pendingJobs,
    subscribers,
    claimsNeedingReview,
    claimsAutoReviewed,
    claimsReviewed,
  ] = await Promise.all([
    db.subject.groupBy({ by: ['status'], _count: { _all: true } }),
    db.processingJob.count({
      where: { status: { in: ['QUEUED', 'RUNNING'] } },
    }),
    db.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
    db.claim.count({ where: NEEDS_REVIEW_WHERE }),
    db.claim.count({ where: { autoReviewed: true } }),
    db.claim.count({ where: { humanConfirmedAt: { not: null } } }),
  ]);

  const byCounts: StatusCounts = {};
  let total = 0;
  for (const row of statusGroups) {
    byCounts[row.status] = row._count._all;
    total += row._count._all;
  }

  return {
    total,
    byCounts,
    pendingJobs,
    subscribers,
    claimsNeedingReview,
    claimsAutoReviewed,
    claimsReviewed,
  };
}

export default async function AdminDashboardPage() {
  await auth(); // ensures session is available (middleware enforces auth)
  const stats = await getStats();

  const statuses: Array<{ label: string; key: PublishStatus; color: string }> =
    [
      {
        label: 'Pending',
        key: 'DRAFT',
        color: 'bg-yellow-100 text-yellow-800',
      },
      {
        label: 'Processed',
        key: 'REVIEW',
        color: 'bg-blue-100 text-blue-800',
      },
      {
        label: 'Published',
        key: 'PUBLISHED',
        color: 'bg-green-100 text-green-800',
      },
      { label: 'Rejected', key: 'ARCHIVED', color: 'bg-red-100 text-red-800' },
    ];

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statuses.map(({ label, key, color }) => (
          <Link
            key={key}
            href={`/admin/videos?status=${key}`}
            className="rounded-lg border bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">
              {stats.byCounts[key] ?? 0}
            </p>
            <span
              className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${color}`}
            >
              {key}
            </span>
          </Link>
        ))}
      </div>

      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Link
          href="/admin/claims?status=needs-review"
          className="rounded-lg border bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md"
        >
          <p className="text-sm font-medium text-gray-500">
            Claims needing your review
          </p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">
            {stats.claimsNeedingReview}
          </p>
        </Link>
        <Link
          href="/admin/claims?status=auto-reviewed"
          className="rounded-lg border bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
        >
          <p className="text-sm font-medium text-gray-500">
            Auto-reviewed, awaiting spot-check
          </p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">
            {stats.claimsAutoReviewed}
          </p>
        </Link>
        <Link
          href="/admin/claims?status=reviewed"
          className="hover:border-ink-muted/30 rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <p className="text-sm font-medium text-gray-500">
            Claims reviewed by a human
          </p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">
            {stats.claimsReviewed}
          </p>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total videos</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">
            {stats.total}
          </p>
        </div>
        <Link
          href="/admin/jobs"
          className="rounded-lg border bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
        >
          <p className="text-sm font-medium text-gray-500">Processing jobs</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">
            {stats.pendingJobs}
          </p>
        </Link>
        <Link
          href="/admin/subscribers"
          className="rounded-lg border bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
        >
          <p className="text-sm font-medium text-gray-500">
            Newsletter subscribers
          </p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">
            {stats.subscribers}
          </p>
        </Link>
      </div>

      <div className="mt-8">
        <Link
          href="/admin/videos"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Review queue &rarr;
        </Link>
      </div>

      <AdminBulkActions />
    </div>
  );
}
