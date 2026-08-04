import { db } from "@/lib/db/prisma";
import { env } from "@/env";
import Link from "next/link";
import { SubscribersTable } from "./SubscribersTable";
import { BackfillButton } from "./BackfillButton";

const PAGE_SIZE = 50;

export default async function AdminSubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>;
}) {
  const { page: pageStr, filter } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const allowedFilters = ["active", "unsubscribed", "unconfirmed"] as const;
  type Filter = (typeof allowedFilters)[number];
  const safeFilter: Filter = (allowedFilters as readonly string[]).includes(
    filter ?? "",
  )
    ? (filter as Filter)
    : "active";

  const where =
    safeFilter === "active"
      ? { unsubscribedAt: null, confirmedAt: { not: null } }
      : safeFilter === "unsubscribed"
        ? { unsubscribedAt: { not: null } }
        : { confirmedAt: null, unsubscribedAt: null };

  const [subscribers, total, totalActive, totalUnsubscribed, totalUnconfirmed] =
    await Promise.all([
      db.newsletterSubscriber.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
      }),
      db.newsletterSubscriber.count({ where }),
      db.newsletterSubscriber.count({
        where: { unsubscribedAt: null, confirmedAt: { not: null } },
      }),
      db.newsletterSubscriber.count({
        where: { unsubscribedAt: { not: null } },
      }),
      db.newsletterSubscriber.count({
        where: { confirmedAt: null, unsubscribedAt: null },
      }),
    ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filterTabs: Array<{ key: Filter; label: string; count: number }> = [
    { key: "active", label: "Active", count: totalActive },
    { key: "unconfirmed", label: "Unconfirmed", count: totalUnconfirmed },
    { key: "unsubscribed", label: "Unsubscribed", count: totalUnsubscribed },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Newsletter Subscribers
        </h1>
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">
          &larr; Dashboard
        </Link>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-semibold text-green-700">{totalActive}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Unconfirmed</p>
          <p className="text-2xl font-semibold text-yellow-700">
            {totalUnconfirmed}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Unsubscribed</p>
          <p className="text-2xl font-semibold text-red-700">
            {totalUnsubscribed}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-2">
        {filterTabs.map(({ key, label, count }) => (
          <Link
            key={key}
            href={`/admin/subscribers?filter=${key}`}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              safeFilter === key
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {label} ({count})
          </Link>
        ))}
      </div>

      {totalUnconfirmed > 0 && <BackfillButton />}

      <SubscribersTable
        subscribers={subscribers}
        resendConfigured={!!env.RESEND_API_KEY}
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
                href={`/admin/subscribers?filter=${safeFilter}&page=${page - 1}`}
                className="rounded border px-3 py-1 hover:bg-gray-50"
              >
                &larr; Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/subscribers?filter=${safeFilter}&page=${page + 1}`}
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
