"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type VideoRow = {
  id: string;
  title: string;
  riskLevel: string;
  updatedAt: Date;
  channel: { title: string };
  _count: { claims: number };
};

const riskColors: Record<string, string> = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-red-100 text-red-700",
};

export default function BulkPublishTable({
  videos,
  showBulkActions,
}: {
  videos: VideoRow[];
  showBulkActions: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = videos.length > 0 && selected.size === videos.length;
  const someSelected = selected.size > 0;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(videos.map((v) => v.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function bulkPublish() {
    if (!someSelected) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/videos/bulk-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), action: "PUBLISHED" }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Request failed");
      setLoading(false);
      return;
    }

    setSelected(new Set());
    setLoading(false);
    router.refresh();
  }

  return (
    <>
      {showBulkActions && (
        <div className="mb-3 flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {someSelected
              ? `${selected.size} selected`
              : "Select rows to bulk publish"}
          </span>
          {someSelected && (
            <button
              onClick={bulkPublish}
              disabled={loading}
              className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Publishing…" : `Publish ${selected.size}`}
            </button>
          )}
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {showBulkActions && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={toggleAll}
                    aria-label="Select all"
                    className="rounded border-gray-300"
                  />
                </th>
              )}
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
              <tr
                key={video.id}
                className={`hover:bg-gray-50 ${selected.has(video.id) ? "bg-blue-50" : ""}`}
              >
                {showBulkActions && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(video.id)}
                      onChange={() => toggleOne(video.id)}
                      aria-label={`Select ${video.title}`}
                      className="rounded border-gray-300"
                    />
                  </td>
                )}
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
                  {new Date(video.updatedAt).toLocaleDateString()}
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
    </>
  );
}
