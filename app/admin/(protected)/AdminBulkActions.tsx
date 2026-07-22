"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Action = "generate-all-summaries" | "auto-publish-low-risk";

export default function AdminBulkActions() {
  const router = useRouter();
  const [loading, setLoading] = useState<Action | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function runAction(action: Action) {
    setLoading(action);
    setResult(null);

    const res = await fetch(`/api/admin/videos/${action}`, { method: "POST" });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      queued?: number;
      published?: number;
      message?: string;
      error?: string;
    } | null;

    if (!res.ok || !data?.ok) {
      setResult(`Error: ${data?.error ?? "Request failed"}`);
    } else if (action === "generate-all-summaries") {
      setResult(
        data.message ?? `Queued ${data.queued} video(s) for summary generation`,
      );
    } else {
      setResult(
        data.message ?? `Published ${data.published} low-risk video(s)`,
      );
    }

    setLoading(null);
    router.refresh();
  }

  return (
    <div className="mt-8 rounded-lg border bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">Bulk actions</h2>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => runAction("generate-all-summaries")}
          disabled={loading !== null}
          className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
        >
          {loading === "generate-all-summaries"
            ? "Queuing…"
            : "Generate summaries for all videos"}
        </button>
        <button
          onClick={() => runAction("auto-publish-low-risk")}
          disabled={loading !== null}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading === "auto-publish-low-risk"
            ? "Publishing…"
            : "Publish all low-risk videos"}
        </button>
      </div>
      {result && <p className="mt-3 text-sm text-gray-600">{result}</p>}
    </div>
  );
}
