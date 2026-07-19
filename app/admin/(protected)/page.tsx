import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import type { PublishStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type StatusCounts = Record<string, number>;

async function getStats(): Promise<{
  total: number;
  byCounts: StatusCounts;
  pendingJobs: number;
  subscribers: number;
}> {
  const [statusGroups, pendingJobs, subscribers] = await Promise.all([
    db.video.groupBy({ by: ["status"], _count: { _all: true } }),
    db.processingJob.count({
      where: { status: { in: ["QUEUED", "RUNNING"] } },
    }),
    db.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
  ]);

  const byCounts: StatusCounts = {};
  let total = 0;
  for (const row of statusGroups) {
    byCounts[row.status] = row._count._all;
    total += row._count._all;
  }

  return { total, byCounts, pendingJobs, subscribers };
}

export default async function AdminDashboardPage() {
  await auth(); // ensures session is available (middleware enforces auth)
  const stats = await getStats();

  const statuses: Array<{ label: string; key: PublishStatus; color: string }> =
    [
      {
        label: "Pending",
        key: "PENDING",
        color: "bg-yellow-100 text-yellow-800",
      },
      {
        label: "Processed",
        key: "PROCESSED",
        color: "bg-blue-100 text-blue-800",
      },
      {
        label: "Published",
        key: "PUBLISHED",
        color: "bg-green-100 text-green-800",
      },
      { label: "Rejected", key: "REJECTED", color: "bg-red-100 text-red-800" },
    ];

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statuses.map(({ label, key, color }) => (
          <div key={key} className="rounded-lg border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">
              {stats.byCounts[key] ?? 0}
            </p>
            <span
              className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${color}`}
            >
              {key}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total videos</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">
            {stats.total}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Processing jobs</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">
            {stats.pendingJobs}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Newsletter subscribers
          </p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">
            {stats.subscribers}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <a
          href="/admin/videos"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Review queue &rarr;
        </a>
      </div>
    </div>
  );
}
