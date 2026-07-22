import { db } from "@/lib/db/prisma";
import Link from "next/link";
import BulkPublishTable from "./BulkPublishTable";

const PAGE_SIZE = 25;

export default async function AdminVideoQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}) {
  const { page: pageStr, status = "PENDING", q = "" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const allowedStatuses = [
    "PROCESSED",
    "PENDING",
    "PUBLISHED",
    "REJECTED",
  ] as const;
  type VideoStatus = (typeof allowedStatuses)[number];
  const safeStatus: VideoStatus = (
    allowedStatuses as readonly string[]
  ).includes(status)
    ? (status as VideoStatus)
    : "PENDING";

  const searchableStatuses: VideoStatus[] = ["PENDING", "PUBLISHED"];
  const showSearch = searchableStatuses.includes(safeStatus);
  const safeQ = showSearch ? q.trim() : "";

  const where = {
    status: safeStatus,
    ...(safeQ
      ? { title: { contains: safeQ, mode: "insensitive" as const } }
      : {}),
  };

  const [videos, total] = await Promise.all([
    db.video.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: { channel: true, _count: { select: { claims: true } } },
    }),
    db.video.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const statusTabs: Array<{ label: string; value: string }> = [
    { label: "Pending", value: "PENDING" },
    { label: "Published", value: "PUBLISHED" },
    { label: "Rejected", value: "REJECTED" },
    { label: "Processed", value: "PROCESSED" },
  ];

  function pageHref(p: number) {
    const params = new URLSearchParams({ status: safeStatus, page: String(p) });
    if (safeQ) params.set("q", safeQ);
    return `/admin/videos?${params.toString()}`;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Review queue</h1>

      {/* Status tabs */}
      <div className="mb-6 flex gap-2 border-b">
        {statusTabs.map(({ label, value }) => (
          <Link
            key={value}
            href={`/admin/videos?status=${value}`}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              safeStatus === value
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Search — only on tabs that support it */}
      {showSearch && (
        <form method="GET" action="/admin/videos" className="mb-4 flex gap-2">
          <input type="hidden" name="status" value={safeStatus} />
          <input
            name="q"
            type="search"
            defaultValue={safeQ}
            placeholder="Search by title…"
            className="w-72 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Search
          </button>
          {safeQ && (
            <Link
              href={`/admin/videos?status=${safeStatus}`}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
            >
              Clear
            </Link>
          )}
        </form>
      )}

      {videos.length === 0 ? (
        <p className="text-sm text-gray-500">
          {safeQ
            ? `No videos matching "${safeQ}".`
            : "No videos in this queue."}
        </p>
      ) : (
        <BulkPublishTable
          videos={videos}
          showBulkActions={
            safeStatus === "PENDING" || safeStatus === "PROCESSED"
          }
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageHref(page - 1)}
                className="rounded border px-3 py-1 hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageHref(page + 1)}
                className="rounded border px-3 py-1 hover:bg-gray-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
