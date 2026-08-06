import { db } from '@/lib/db/prisma';
import Link from 'next/link';
import BulkPublishTable from './BulkPublishTable';
import HasSummaryCheckbox from './HasSummaryCheckbox';
import NoSummaryCheckbox from './NoSummaryCheckbox';

const ALLOWED_PAGE_SIZES = ['25', '50', '100', 'all'] as const;
type PageSizeOption = (typeof ALLOWED_PAGE_SIZES)[number];

const ALLOWED_SORT_FIELDS = ['risk', 'claims', 'summary', 'updated'] as const;
type SortField = (typeof ALLOWED_SORT_FIELDS)[number];
type SortDir = 'asc' | 'desc';

function buildOrderBy(
  sort: SortField,
  dir: SortDir
): NonNullable<Parameters<typeof db.subject.findMany>[0]>['orderBy'] {
  if (sort === 'risk') return { riskLevel: dir };
  if (sort === 'claims') return { claims: { _count: dir } };
  // Summary now lives two relation hops away (Subject -> SourceVideo ->
  // Summary), which Prisma's relation-count orderBy doesn't support directly.
  // evidenceScore is set in the same pipeline step that creates the summary,
  // so null/non-null is a reliable proxy for "has a summary yet".
  if (sort === 'summary') return { evidenceScore: dir };
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
    hasSummary?: string;
    sort?: string;
    dir?: string;
    pageSize?: string;
  }>;
}) {
  const {
    page: pageStr,
    status = 'DRAFT',
    q = '',
    noSummary,
    hasSummary,
    sort: sortParam,
    dir: dirParam,
    pageSize: pageSizeParam,
  } = await searchParams;

  const pageSize: PageSizeOption = (
    ALLOWED_PAGE_SIZES as readonly string[]
  ).includes(pageSizeParam ?? '')
    ? (pageSizeParam as PageSizeOption)
    : '25';
  const take = pageSize === 'all' ? undefined : parseInt(pageSize, 10);

  const sortField: SortField = (
    ALLOWED_SORT_FIELDS as readonly string[]
  ).includes(sortParam ?? '')
    ? (sortParam as SortField)
    : 'updated';
  const sortDir: SortDir = dirParam === 'asc' ? 'asc' : 'desc';
  const page =
    pageSize === 'all' ? 1 : Math.max(1, parseInt(pageStr ?? '1', 10));
  const skip = take !== undefined ? (page - 1) * take : 0;

  const allowedStatuses = ['REVIEW', 'DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
  type VideoStatus = (typeof allowedStatuses)[number];
  const safeStatus: VideoStatus = (
    allowedStatuses as readonly string[]
  ).includes(status)
    ? (status as VideoStatus)
    : 'DRAFT';

  const searchableStatuses: VideoStatus[] = ['DRAFT', 'PUBLISHED'];
  const showSearch = searchableStatuses.includes(safeStatus);
  const safeQ = showSearch ? q.trim() : '';
  const showNoSummaryFilter = showSearch;
  const filterNoSummary = showNoSummaryFilter && noSummary === 'true';
  const filterHasSummary =
    showNoSummaryFilter && !filterNoSummary && hasSummary === 'true';

  const where = {
    status: safeStatus,
    ...(safeQ
      ? {
          OR: [
            {
              editorialTitle: { contains: safeQ, mode: 'insensitive' as const },
            },
            { name: { contains: safeQ, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(filterNoSummary
      ? { sourceVideos: { none: { summaries: { some: {} } } } }
      : {}),
    ...(filterHasSummary
      ? { sourceVideos: { some: { summaries: { some: {} } } } }
      : {}),
  };

  const [subjects, total] = await Promise.all([
    db.subject.findMany({
      where,
      orderBy: buildOrderBy(sortField, sortDir),
      skip,
      ...(take !== undefined ? { take } : {}),
      // take omitted means no limit ("all")
      include: {
        channel: true,
        sourceVideos: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { summaries: true } } },
        },
        _count: { select: { claims: true } },
      },
    }),
    db.subject.count({ where }),
  ]);

  const videos = subjects.map((s) => ({
    id: s.id,
    title: s.editorialTitle ?? s.sourceVideos[0]?.title ?? s.name,
    riskLevel: s.riskLevel,
    updatedAt: s.updatedAt,
    channel: { title: s.channel?.title ?? '' },
    _count: {
      claims: s._count.claims,
      summaries: s.sourceVideos[0]?._count.summaries ?? 0,
    },
  }));

  const totalPages = take !== undefined ? Math.ceil(total / take) : 1;

  const statusTabs: Array<{ label: string; value: string }> = [
    { label: 'Pending', value: 'DRAFT' },
    { label: 'Published', value: 'PUBLISHED' },
    { label: 'Rejected', value: 'ARCHIVED' },
    { label: 'Processed', value: 'REVIEW' },
  ];

  function pageHref(p: number) {
    const params = new URLSearchParams({ status: safeStatus, page: String(p) });
    if (safeQ) params.set('q', safeQ);
    if (filterNoSummary) params.set('noSummary', 'true');
    if (filterHasSummary) params.set('hasSummary', 'true');
    if (sortField !== 'updated') params.set('sort', sortField);
    if (sortDir !== 'desc') params.set('dir', sortDir);
    if (pageSize !== '25') params.set('pageSize', pageSize);
    return `/admin/videos?${params.toString()}`;
  }

  function pageSizeHref(size: PageSizeOption) {
    const params = new URLSearchParams({ status: safeStatus });
    if (safeQ) params.set('q', safeQ);
    if (filterNoSummary) params.set('noSummary', 'true');
    if (filterHasSummary) params.set('hasSummary', 'true');
    if (sortField !== 'updated') params.set('sort', sortField);
    if (sortDir !== 'desc') params.set('dir', sortDir);
    if (size !== '25') params.set('pageSize', size);
    return `/admin/videos?${params.toString()}`;
  }

  const baseQuery: Record<string, string> = { status: safeStatus };
  if (safeQ) baseQuery.q = safeQ;
  if (filterNoSummary) baseQuery.noSummary = 'true';
  if (filterHasSummary) baseQuery.hasSummary = 'true';
  if (pageSize !== '25') baseQuery.pageSize = pageSize;

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
                ? 'text-accent border-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
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
          <HasSummaryCheckbox checked={filterHasSummary} />
        </form>
      )}

      {videos.length === 0 ? (
        <p className="text-sm text-gray-500">
          {safeQ
            ? `No videos matching "${safeQ}".`
            : 'No videos in this queue.'}
        </p>
      ) : (
        <BulkPublishTable
          videos={videos}
          showBulkActions={
            safeStatus === 'DRAFT' ||
            safeStatus === 'REVIEW' ||
            safeStatus === 'PUBLISHED'
          }
          showPublishAction={safeStatus === 'DRAFT' || safeStatus === 'REVIEW'}
          showSummaryColumn={
            safeStatus === 'DRAFT' ||
            safeStatus === 'PUBLISHED' ||
            safeStatus === 'REVIEW'
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
              if (parseInt(size) > total || (size === 'all' && total < 25)) {
                return null;
              }
              return (
                <Link
                  key={size}
                  href={pageSizeHref(size)}
                  className={`rounded border px-2 py-0.5 capitalize ${
                    pageSize === size
                      ? 'text-accent border-blue-600 bg-blue-50'
                      : 'hover:bg-gray-50'
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
