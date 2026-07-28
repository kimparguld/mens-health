import Link from "next/link";
import { db } from "@/lib/db/prisma";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";

type SearchParams = Promise<{ status?: string; page?: string }>;

export default async function AdminClaimsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { status = "all", page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));
  const take = 50;
  const skip = (page - 1) * take;

  const allowedStatuses = [
    "NOT_CHECKED",
    "SUPPORTED",
    "MIXED",
    "WEAK",
    "UNSUPPORTED",
  ] as const;
  type EvidenceStatus = (typeof allowedStatuses)[number];

  const where =
    status !== "all" && (allowedStatuses as readonly string[]).includes(status)
      ? { evidenceStatus: status as EvidenceStatus }
      : {};

  const [claims, total, notCheckedCount] = await Promise.all([
    db.claim.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        video: {
          select: {
            title: true,
            slug: true,
            status: true,
          },
        },
      },
    }),
    db.claim.count({ where }),
    db.claim.count({ where: { evidenceStatus: "NOT_CHECKED" } }),
  ]);

  const totalPages = Math.ceil(total / take);

  const statusTabs = [
    { label: "All", value: "all" },
    {
      label: `Not reviewed (${notCheckedCount})`,
      value: "NOT_CHECKED",
    },
    { label: "Supported", value: "SUPPORTED" },
    { label: "Mixed", value: "MIXED" },
    { label: "Weak", value: "WEAK" },
    { label: "Unsupported", value: "UNSUPPORTED" },
  ];

  return (
    <div className="max-w-5xl">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Claims</h1>
      <p className="mb-4 text-sm text-gray-500">
        All extracted claims. Claims marked <strong>Not reviewed</strong> have
        not been checked against evidence — review and update their status
        before publishing.
      </p>

      {notCheckedCount > 0 && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ <strong>{notCheckedCount}</strong> claim
          {notCheckedCount !== 1 ? "s" : ""} still need evidence review.{" "}
          <Link href="/admin/claims?status=NOT_CHECKED" className="underline">
            Filter to show them →
          </Link>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/claims?status=${tab.value}`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              status === tab.value
                ? "bg-emerald-600 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:border-emerald-300"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Claim
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Evidence
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Risk
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Video
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {claims.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  No claims found.
                </td>
              </tr>
            ) : (
              claims.map((claim) => (
                <tr key={claim.id} className="hover:bg-gray-50">
                  <td className="max-w-xs px-4 py-3">
                    <p className="line-clamp-2 text-gray-900">{claim.text}</p>
                  </td>
                  <td className="px-4 py-3">
                    <EvidenceBadge
                      status={claim.evidenceStatus}
                      showNotChecked
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        claim.riskLevel === "HIGH"
                          ? "bg-red-100 text-red-700"
                          : claim.riskLevel === "MEDIUM"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      {claim.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/videos/${claim.video.slug}`}
                      className="line-clamp-1 text-xs text-blue-600 hover:underline"
                    >
                      {claim.video.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {claim.slug && (
                      <Link
                        href={`/claims/${claim.slug}`}
                        target="_blank"
                        className="text-xs text-gray-400 hover:text-blue-600"
                      >
                        View →
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/claims?status=${status}&page=${page - 1}`}
                className="rounded border px-3 py-1 hover:bg-gray-50"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/claims?status=${status}&page=${page + 1}`}
                className="rounded border px-3 py-1 hover:bg-gray-50"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
