import { db } from "@/lib/db/prisma";
import Link from "next/link";
import { JobsTable } from "./JobsTable";
import { ProcessNowButton } from "./ProcessNowButton";

const PAGE_SIZE = 50;

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page: pageStr, status } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const allowedStatuses = [
    "QUEUED",
    "RUNNING",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
  ] as const;
  type JobStatus = (typeof allowedStatuses)[number];
  const safeStatus: JobStatus | undefined = (
    allowedStatuses as readonly string[]
  ).includes(status ?? "")
    ? (status as JobStatus)
    : undefined;

  const where = safeStatus ? { status: safeStatus } : {};

  const [jobs, total, statusCounts] = await Promise.all([
    db.processingJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        video: { select: { id: true, title: true, youtubeVideoId: true } },
      },
    }),
    db.processingJob.count({ where }),
    db.processingJob.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const counts = Object.fromEntries(
    statusCounts.map((r) => [r.status, r._count._all]),
  );

  const totalAll = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Video Processing Jobs
        </h1>
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">
          &larr; Dashboard
        </Link>
      </div>
      <p className="mb-4 text-sm text-gray-500">
        AI processing runs for individual videos (summarize + extract
        claims) — not the Vercel Cron schedule. Cron endpoints (sync, digest,
        social publish) run on the schedule defined in{" "}
        <code className="font-mono text-xs">vercel.json</code>. That schedule
        only fires on Vercel — it does not run under{" "}
        <code className="font-mono text-xs">next dev</code>, and even in
        production it only processes a small batch once a day.
      </p>
      <div className="mb-6">
        <ProcessNowButton />
      </div>

      {/* Status filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/admin/jobs"
          className={`rounded-full px-3 py-1 text-sm font-medium transition ${
            !safeStatus
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All ({totalAll})
        </Link>
        {allowedStatuses.map((s) => (
          <Link
            key={s}
            href={`/admin/jobs?status=${s}`}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              safeStatus === s
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()} ({counts[s] ?? 0})
          </Link>
        ))}
      </div>

      <JobsTable
        jobs={jobs}
        showCancelControls={!safeStatus || safeStatus === "QUEUED"}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/jobs?${new URLSearchParams({ ...(safeStatus ? { status: safeStatus } : {}), page: String(page - 1) })}`}
                className="rounded border px-3 py-1 hover:bg-gray-50"
              >
                &larr; Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/jobs?${new URLSearchParams({ ...(safeStatus ? { status: safeStatus } : {}), page: String(page + 1) })}`}
                className="rounded border px-3 py-1 hover:bg-gray-50"
              >
                Next &rarr;
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

