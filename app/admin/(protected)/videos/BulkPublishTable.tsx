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
  _count: { claims: number; summaries: number };
};

const riskColors: Record<string, string> = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-red-100 text-red-700",
};

export default function BulkPublishTable({
  videos,
  showBulkActions,
  showPublishAction,
  showSummaryColumn,
  sortField = "updated",
  sortDir = "desc",
  baseQuery = {},
}: {
  videos: VideoRow[];
  showBulkActions: boolean;
  showPublishAction: boolean;
  showSummaryColumn: boolean;
  sortField?: string;
  sortDir?: "asc" | "desc";
  baseQuery?: Record<string, string>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<"publish" | "summaries" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [acknowledgeHighRisk, setAcknowledgeHighRisk] = useState(false);
  const [highRiskNote, setHighRiskNote] = useState("");

  function sortHref(field: string) {
    const newDir = sortField === field && sortDir === "asc" ? "desc" : "asc";
    const params = new URLSearchParams({
      ...baseQuery,
      sort: field,
      dir: newDir,
    });
    return `/admin/videos?${params.toString()}`;
  }

  const sortIcon = ({ field }: { field: string }) => {
    if (sortField !== field)
      return <span className="ml-1 text-gray-300">↕</span>;
    return (
      <span className="ml-1 text-blue-600">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  };

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

  const highRiskSelected = videos.filter(
    (v) => selected.has(v.id) && v.riskLevel === "HIGH",
  );

  async function bulkPublish() {
    if (!someSelected) return;

    // Server-side enforced: any HIGH-risk video in the batch requires the
    // acknowledgment checkbox checked and a non-empty note, not just a
    // dismissible warning.
    if (
      highRiskSelected.length > 0 &&
      (!acknowledgeHighRisk || !highRiskNote.trim())
    ) {
      setError(
        "Check the high-risk acknowledgment box and add a note before publishing.",
      );
      return;
    }

    setLoading("publish");
    setError(null);
    setMessage(null);

    const res = await fetch("/api/admin/videos/bulk-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: Array.from(selected),
        action: "PUBLISHED",
        ...(highRiskSelected.length > 0
          ? { acknowledgeHighRisk: true, note: highRiskNote.trim() }
          : {}),
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Request failed");
      setLoading(null);
      return;
    }

    setSelected(new Set());
    setAcknowledgeHighRisk(false);
    setHighRiskNote("");
    setLoading(null);
    router.refresh();
  }

  async function bulkGenerateSummaries() {
    if (!someSelected) return;
    setLoading("summaries");
    setError(null);
    setMessage(null);

    // Only send IDs for videos that don't have a summary yet
    const idsWithoutSummary = videos
      .filter((v) => selected.has(v.id) && v._count.summaries === 0)
      .map((v) => v.id);

    if (idsWithoutSummary.length === 0) {
      setMessage("All selected videos already have a summary.");
      setLoading(null);
      return;
    }

    const res = await fetch("/api/admin/videos/bulk-generate-summaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: idsWithoutSummary }),
    });

    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      error?: string;
    } | null;

    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Request failed");
      setLoading(null);
      return;
    }

    setMessage(
      data.message ?? `Queued ${selected.size} video(s) for summary generation`,
    );
    setSelected(new Set());
    setLoading(null);
    router.refresh();
  }

  return (
    <>
      {showBulkActions && (
        <div className="mb-3 flex flex-col gap-2">
          {/* High-risk acknowledgment — required by the server before publish */}
          {someSelected && showPublishAction && highRiskSelected.length > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p>
                ⚠️ {highRiskSelected.length} selected video(s) are HIGH risk:{" "}
                {highRiskSelected.map((v) => v.title).join(", ")}. Publishing
                requires explicit acknowledgment and a note.
              </p>
              <label className="flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={acknowledgeHighRisk}
                  onChange={(e) => setAcknowledgeHighRisk(e.target.checked)}
                  className="rounded border-red-400"
                />
                I acknowledge these are high-risk and approve publishing them
              </label>
              <textarea
                value={highRiskNote}
                onChange={(e) => setHighRiskNote(e.target.value)}
                placeholder="Required note explaining the approval…"
                rows={2}
                className="rounded border border-red-300 px-2 py-1.5 text-sm text-gray-900"
              />
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {someSelected
                ? `${selected.size} selected`
                : `Select rows to ${showPublishAction ? "bulk publish" : ""}${showPublishAction && showSummaryColumn ? " or " : ""}${showSummaryColumn ? "generate summaries" : ""}.`}
            </span>
            {someSelected && (
              <>
                <button
                  onClick={bulkGenerateSummaries}
                  disabled={loading !== null}
                  className="rounded-lg border border-blue-600 px-4 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                >
                  {loading === "summaries"
                    ? "Generating…"
                    : `Generate summaries (${selected.size})`}
                </button>
                {showPublishAction && (
                  <button
                    onClick={bulkPublish}
                    disabled={loading !== null}
                    className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading === "publish"
                      ? "Publishing…"
                      : `Publish ${selected.size}`}
                  </button>
                )}
              </>
            )}
            {error && <span className="text-xs text-red-600">{error}</span>}
            {message && (
              <span className="text-xs text-gray-600">{message}</span>
            )}
          </div>
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
                <Link
                  href={sortHref("risk")}
                  className="inline-flex items-center hover:text-gray-800"
                >
                  Risk {sortIcon({ field: "risk" })}
                </Link>
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                <Link
                  href={sortHref("claims")}
                  className="inline-flex items-center hover:text-gray-800"
                >
                  Claims {sortIcon({ field: "claims" })}
                </Link>
              </th>
              {showSummaryColumn && (
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  <Link
                    href={sortHref("summary")}
                    className="inline-flex items-center hover:text-gray-800"
                  >
                    Has summary {sortIcon({ field: "summary" })}
                  </Link>
                </th>
              )}
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                <Link
                  href={sortHref("updated")}
                  className="inline-flex items-center hover:text-gray-800"
                >
                  Updated {sortIcon({ field: "updated" })}
                </Link>
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
                {showSummaryColumn && (
                  <td className="px-4 py-3">
                    {video._count.summaries > 0 ? (
                      <span className="text-xs font-medium text-green-700">
                        Yes
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-red-600">
                        No
                      </span>
                    )}
                  </td>
                )}
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
