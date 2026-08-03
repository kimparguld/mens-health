"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Subscriber = {
  id: string;
  email: string;
  confirmedAt: Date | null;
  unsubscribedAt: Date | null;
  resendContactId: string | null;
  createdAt: Date;
};

export function SubscribersTable({
  subscribers,
  resendConfigured,
}: {
  subscribers: Subscriber[];
  resendConfigured: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function callAction(
    id: string,
    action: "sync" | "unsubscribe" | "delete",
  ) {
    setLoading(`${id}:${action}`);
    setError(null);
    try {
      const res = await fetch(
        action === "delete"
          ? `/api/admin/subscribers/${id}`
          : `/api/admin/subscribers/${id}/${action}`,
        { method: action === "delete" ? "DELETE" : "POST" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Request failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Email
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Subscribed
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Confirmed
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Unsubscribed
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Resend
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {subscribers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No subscribers found.
                </td>
              </tr>
            ) : (
              subscribers.map((sub) => {
                const statusLabel = sub.unsubscribedAt
                  ? "Unsubscribed"
                  : sub.confirmedAt
                    ? "Active"
                    : "Unconfirmed";
                const statusColor = sub.unsubscribedAt
                  ? "bg-red-100 text-red-700"
                  : sub.confirmedAt
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700";
                const notSynced = !sub.unsubscribedAt && !sub.resendContactId;
                return (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-900">
                      {sub.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {sub.confirmedAt
                        ? new Date(sub.confirmedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {sub.unsubscribedAt
                        ? new Date(sub.unsubscribedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {notSynced ? (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Not synced
                        </span>
                      ) : sub.resendContactId ? (
                        <span className="text-xs text-gray-400">Synced</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {resendConfigured && notSynced && (
                          <button
                            onClick={() => callAction(sub.id, "sync")}
                            disabled={loading !== null}
                            className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-40"
                          >
                            {loading === `${sub.id}:sync`
                              ? "Syncing…"
                              : "Sync to Resend"}
                          </button>
                        )}
                        {!sub.unsubscribedAt && (
                          <button
                            onClick={() => callAction(sub.id, "unsubscribe")}
                            disabled={loading !== null}
                            className="text-xs font-medium text-gray-600 hover:underline disabled:opacity-40"
                          >
                            {loading === `${sub.id}:unsubscribe`
                              ? "Working…"
                              : "Unsubscribe"}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Permanently delete ${sub.email}? This also removes them from Resend.`,
                              )
                            ) {
                              callAction(sub.id, "delete");
                            }
                          }}
                          disabled={loading !== null}
                          className="text-xs font-medium text-red-600 hover:underline disabled:opacity-40"
                        >
                          {loading === `${sub.id}:delete`
                            ? "Deleting…"
                            : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
