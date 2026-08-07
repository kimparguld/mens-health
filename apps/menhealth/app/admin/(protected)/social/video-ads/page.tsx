import { db } from '@/lib/db/prisma';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  RENDERING: 'bg-indigo-100 text-indigo-800',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  FAILED: 'bg-red-200 text-red-900',
};

const ALL_STATUSES = [
  'RENDERING',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'FAILED',
  'DRAFT',
] as const;

type AdStatus = (typeof ALL_STATUSES)[number];

export default async function VideoAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const safeStatus = (ALL_STATUSES as readonly string[]).includes(status ?? '')
    ? (status as AdStatus)
    : undefined;

  const where = safeStatus ? { status: safeStatus } : {};

  const [items, total] = await Promise.all([
    db.adVideoPackage.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    }),
    db.adVideoPackage.count({ where }),
  ]);

  function filterHref(value: AdStatus): string {
    return `/admin/social/video-ads?status=${value}`;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Ad video packages
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Generate, review, and download multi-format social ad bundles.
          </p>
        </div>
        <Link
          href="/admin/social/video-ads/generate"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Generate ad package
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap gap-1">
        <Link
          href="/admin/social/video-ads"
          className={`rounded px-2 py-1 text-xs font-medium ${!safeStatus ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          All
        </Link>
        {ALL_STATUSES.map((entryStatus) => (
          <Link
            key={entryStatus}
            href={filterHref(entryStatus)}
            className={`rounded px-2 py-1 text-xs font-medium ${safeStatus === entryStatus ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {entryStatus.replace('_', ' ')}
          </Link>
        ))}
      </div>

      <div className="mb-4 text-sm text-gray-500">{total} packages</div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-white p-10 text-center text-gray-500">
          No ad packages yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Script preview
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Created
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="max-w-xl px-4 py-3">
                    <Link
                      href={`/admin/social/video-ads/${item.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      <span className="line-clamp-2">{item.script}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-700'}`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                    {new Date(item.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
