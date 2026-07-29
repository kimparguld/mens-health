import { db } from "@/lib/db/prisma";
import Link from "next/link";
import { ClearAllButton } from "./ClearAllButton";

const PAGE_SIZE = 25;

const RISK_COLORS: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  LOW: "bg-green-100 text-green-800",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  SCHEDULED: "bg-indigo-100 text-indigo-800",
  PUBLISHED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  FAILED: "bg-red-200 text-red-900",
};

const ALL_STATUSES = [
  "PENDING_REVIEW",
  "DRAFT",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
  "REJECTED",
  "FAILED",
] as const;

const ALL_PLATFORMS = ["YOUTUBE_COMMUNITY", "TIKTOK", "REDDIT", "X"] as const;

type PostStatus = (typeof ALL_STATUSES)[number];
type Platform = (typeof ALL_PLATFORMS)[number];

export default async function SocialDraftsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    platform?: string;
    risk?: string;
    page?: string;
  }>;
}) {
  const { status, platform, risk, page: pageStr } = await searchParams;

  const page = Math.max(1, parseInt(pageStr ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const safeStatus = (ALL_STATUSES as readonly string[]).includes(status ?? "")
    ? (status as PostStatus)
    : undefined;

  const safePlatform = (ALL_PLATFORMS as readonly string[]).includes(
    platform ?? "",
  )
    ? (platform as Platform)
    : undefined;

  const safeRisk = ["HIGH", "MEDIUM", "LOW"].includes(risk ?? "")
    ? (risk as "HIGH" | "MEDIUM" | "LOW")
    : undefined;

  const where = {
    ...(safeStatus ? { status: safeStatus } : {}),
    ...(safePlatform ? { platform: safePlatform } : {}),
    ...(safeRisk ? { riskLevel: safeRisk } : {}),
  };

  const [posts, total, scheduledCount, publishedCount] = await Promise.all([
    db.socialPost.findMany({
      where,
      orderBy: [{ requiresReview: "desc" }, { createdAt: "desc" }],
      skip,
      take: PAGE_SIZE,
    }),
    db.socialPost.count({ where }),
    db.socialPost.count({ where: { status: "SCHEDULED" } }),
    db.socialPost.count({ where: { status: "PUBLISHED" } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function filterHref(key: string, value: string) {
    const base = new URLSearchParams({
      ...(safeStatus ? { status: safeStatus } : {}),
      ...(safePlatform ? { platform: safePlatform } : {}),
      ...(safeRisk ? { risk: safeRisk } : {}),
    });
    base.set(key, value);
    return `/admin/social/drafts?${base.toString()}`;
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Social drafts</h1>
        <span className="text-sm text-gray-500">{total} posts</span>
      </div>
      <p className="mb-4 text-sm text-gray-500">
        X posts marked Scheduled post automatically. YouTube Community and
        Reddit are always manual — copy the draft and post it yourself.
      </p>
      <div className="mb-6">
        <ClearAllButton
          scheduledCount={scheduledCount}
          publishedCount={publishedCount}
        />
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-6">
        <div>
          <p className="mb-1 text-xs font-medium text-gray-500 uppercase">
            Status
          </p>
          <div className="flex flex-wrap gap-1">
            <Link
              href="/admin/social/drafts"
              className={`rounded px-2 py-1 text-xs font-medium ${!safeStatus ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              All
            </Link>
            {ALL_STATUSES.map((s) => (
              <Link
                key={s}
                href={filterHref("status", s)}
                className={`rounded px-2 py-1 text-xs font-medium ${safeStatus === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              >
                {s.replace("_", " ")}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-gray-500 uppercase">
            Platform
          </p>
          <div className="flex flex-wrap gap-1">
            {ALL_PLATFORMS.map((p) => (
              <Link
                key={p}
                href={filterHref("platform", p)}
                className={`rounded px-2 py-1 text-xs font-medium ${safePlatform === p ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              >
                {p.replace("_", " ")}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-gray-500 uppercase">
            Risk
          </p>
          <div className="flex flex-wrap gap-1">
            {(["HIGH", "MEDIUM", "LOW"] as const).map((r) => (
              <Link
                key={r}
                href={filterHref("risk", r)}
                className={`rounded px-2 py-1 text-xs font-medium ${safeRisk === r ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              >
                {r}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {posts.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <p className="text-gray-500">No drafts found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Hook
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Platform
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Risk
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="max-w-xs px-4 py-3">
                    <Link
                      href={`/admin/social/drafts/${post.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      <span className="line-clamp-2">{post.hook}</span>
                    </Link>
                    {post.requiresReview && (
                      <span className="mt-1 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                        Review required
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {post.platform.replace("_", " ")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[post.status] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {post.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${RISK_COLORS[post.riskLevel] ?? ""}`}
                    >
                      {post.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex gap-2">
          {page > 1 && (
            <Link
              href={`/admin/social/drafts?page=${page - 1}`}
              className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Previous
            </Link>
          )}
          <span className="px-3 py-1.5 text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/social/drafts?page=${page + 1}`}
              className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
