import { db } from "@/lib/db/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

  const riskColors: Record<string, string> = {
    LOW: "bg-green-100 text-green-700",
    MEDIUM: "bg-yellow-100 text-yellow-700",
    HIGH: "bg-red-100 text-red-700",
  };

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
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Title
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Channel
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Risk
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Claims
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Updated
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {videos.map((video) => (
                <tr key={video.id} className="hover:bg-gray-50">
                  <td className="max-w-xs px-4 py-3">
                    <p className="truncate font-medium text-gray-900">
                      {video.title}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {video.channel.title}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${riskColors[video.riskLevel] ?? ""}`}
                    >
                      {video.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {video._count.claims}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {video.updatedAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/videos/${video.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
