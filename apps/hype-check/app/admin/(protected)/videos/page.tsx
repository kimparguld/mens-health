import { db } from "@/lib/db/prisma";
import Link from "next/link";
import BulkPublishTable from "./BulkPublishTable";
import NoSummaryCheckbox from "./NoSummaryCheckbox";

const ALLOWED_PAGE_SIZES = ["25", "50", "100", "all"] as const;
type PageSizeOption = (typeof ALLOWED_PAGE_SIZES)[number];

const ALLOWED_SORT_FIELDS = ["risk", "claims", "summary", "updated"] as const;
type SortField = (typeof ALLOWED_SORT_FIELDS)[number];
type SortDir = "asc" | "desc";

function buildOrderBy(
  sort: SortField,
  dir: SortDir,
): NonNullable<Parameters<typeof db.video.findMany>[0]>["orderBy"] {
  if (sort === "risk") return { riskLevel: dir };
  if (sort === "claims") return { claims: { _count: dir } };
  if (sort === "summary") return { summaries: { _count: dir } };
  return { updatedAt: dir };
}

export default async function AdminVideoQueuePage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    q?: string;
    noSummary?: string;
    sort?: string;
    dir?: string;
    pageSize?: string;
  }>;
}) {
  const {
    page: pageStr,
    status = "PENDING",
    q = "",
    noSummary,
    sort: sortParam,
    dir: dirParam,
    pageSize: pageSizeParam,
  } = await searchParams;

  const pageSize: PageSizeOption = (
    ALLOWED_PAGE_SIZES as readonly string[]
  ).includes(pageSizeParam ?? "")
    ? (pageSizeParam as PageSizeOption)
    : "25";
  const take = pageSize === "all" ? undefined : parseInt(pageSize, 10);

  const sortField: SortField = (
    ALLOWED_SORT_FIELDS as readonly string[]
  ).includes(sortParam ?? "")
    ? (sortParam as SortField)
    : "updated";
  const sortDir: SortDir = dirParam === "asc" ? "asc" : "desc";
  const page =
    pageSize === "all" ? 1 : Math.max(1, parseInt(pageStr ?? "1", 10));
  const skip = take !== undefined ? (page - 1) * take : 0;

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
  const showNoSummaryFilter = showSearch;
  const filterNoSummary = showNoSummaryFilter && noSummary === "true";

  const where = {
    status: safeStatus,
    ...(safeQ
      ? { title: { contains: safeQ, mode: "insensitive" as const } }
      : {}),
    ...(filterNoSummary ? { summaries: { none: {} } } : {}),
  };

  const [videos, total] = await Promise.all([
    db.video.findMany({
      where,
      orderBy: buildOrderBy(sortField, sortDir),
      skip,
      ...(take !== undefined ? { take } : {}),
      // take omitted means no limit ("all")
      include: {
        channel: true,
        _count: { select: { claims: true, summaries: true } },
      },
    }),
    db.video.count({ where }),
  ]);

  const totalPages = take !== undefined ? Math.ceil(total / take) : 1;

  const statusTabs: Array<{ label: string; value: string }> = [
    { label: "Pending", value: "PENDING" },
    { label: "Published", value: "PUBLISHED" },
    { label: "Rejected", value: "REJECTED" },
    { label: "Processed", value: "PROCESSED" },
  ];

  function pageHref(p: number) {
    const params = new URLSearchParams({ status: safeStatus, page: String(p) });
    if (safeQ) params.set("q", safeQ);
    if (filterNoSummary) params.set("noSummary", "true");
    if (sortField !== "updated") params.set("sort", sortField);
    if (sortDir !== "desc") params.set("dir", sortDir);
    if (pageSize !== "25") params.set("pageSize", pageSize);
    return `/admin/videos?${params.toString()}`;
  }

  function pageSizeHref(size: PageSizeOption) {
    const params = new URLSearchParams({ status: safeStatus });
    if (safeQ) params.set("q", safeQ);
    if (filterNoSummary) params.set("noSummary", "true");
    if (sortField !== "updated") params.set("sort", sortField);
    if (sortDir !== "desc") params.set("dir", sortDir);
    if (size !== "25") params.set("pageSize", size);
    return `/admin/videos?${params.toString()}`;
  }

  const baseQuery: Record<string, string> = { status: safeStatus };
  if (safeQ) baseQuery.q = safeQ;
  if (filterNoSummary) baseQuery.noSummary = "true";
  if (pageSize !== "25") baseQuery.pageSize = pageSize;

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
        <form
          method="GET"
          action="/admin/videos"
          className="mb-4 flex flex-wrap items-center gap-2"
        >
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
          <NoSummaryCheckbox checked={filterNoSummary} />
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
            safeStatus === "PENDING" ||
            safeStatus === "PROCESSED" ||
            safeStatus === "PUBLISHED"
          }
          showPublishAction={
            safeStatus === "PENDING" || safeStatus === "PROCESSED"
          }
          showSummaryColumn={
            safeStatus === "PENDING" ||
            safeStatus === "PUBLISHED" ||
            safeStatus === "PROCESSED"
          }
          sortField={sortField}
          sortDir={sortDir}
          baseQuery={baseQuery}
        />
      )}

      {/* Pagination + page size */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        {total > 0 && (
          <div className="flex items-center gap-2">
            <span>Show:</span>
            {ALLOWED_PAGE_SIZES.map((size) => {
              if (parseInt(size) > total || (size === "all" && total < 25)) {
                return null;
              }
              return (
                <Link
                  key={size}
                  href={pageSizeHref(size)}
                  className={`rounded border px-2 py-0.5 capitalize ${
                    pageSize === size
                      ? "border-blue-600 bg-blue-50 text-blue-600"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {size}
                </Link>
              );
            })}
            <span className="ml-2 text-gray-400">({total} total)</span>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span>
              Page {page} of {totalPages}
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
    </div>
  );
}
