"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TopicSuggestionActions({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function review(action: "approve" | "reject") {
    setLoading(action);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/topic-suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setMessage(data?.error ?? "Failed to update suggestion");
        return;
      }
      router.refresh();
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => review("approve")}
        disabled={loading !== null}
        className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        {loading === "approve" ? "Approving…" : "Approve"}
      </button>
      <button
        onClick={() => review("reject")}
        disabled={loading !== null}
        className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
      >
        {loading === "reject" ? "Rejecting…" : "Reject"}
      </button>
      {message && <span className="text-xs text-gray-500">{message}</span>}
    </div>
  );
}
