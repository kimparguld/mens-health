import { db } from "@/lib/db/prisma";
import Link from "next/link";
import BulkPublishTable from "./BulkPublishTable";


const PAGE_SIZE = 25;

export default async function AdminVideoQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page: pageStr, status = "PROCESSED" } = await searchParams;
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
    : "PROCESSED";

  const [videos, total] = await Promise.all([
    db.video.findMany({
      where: { status: safeStatus },
      orderBy: { updatedAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: { channel: true, _count: { select: { claims: true } } },
    }),
    db.video.count({ where: { status: safeStatus } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const statusTabs: Array<{ label: string; value: string }> = [
    { label: "Processed", value: "PROCESSED" },
    { label: "Published", value: "PUBLISHED" },
    { label: "Rejected", value: "REJECTED" },
    { label: "Pending", value: "PENDING" },
  ];

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

      {videos.length === 0 ? (
        <p className="text-sm text-gray-500">No videos in this queue.</p>
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
                href={`/admin/videos?status=${safeStatus}&page=${page - 1}`}
                className="rounded border px-3 py-1 hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/videos?status=${safeStatus}&page=${page + 1}`}
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
