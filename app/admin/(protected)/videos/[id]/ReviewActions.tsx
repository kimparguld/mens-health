"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PublishStatus = "PENDING" | "PROCESSED" | "PUBLISHED" | "REJECTED";

const ACTIONS = [
  {
    key: "PUBLISHED",
    label: "Publish",
    className: "bg-green-600 text-white hover:bg-green-700",
  },
  {
    key: "REJECTED",
    label: "Reject",
    className: "bg-red-600 text-white hover:bg-red-700",
  },
  {
    key: "FLAGGED_HIGH_RISK",
    label: "Flag high-risk",
    className: "bg-orange-500 text-white hover:bg-orange-600",
  },
] as const;

type ActionKey = (typeof ACTIONS)[number]["key"];

export default function ReviewActions({
  videoId,
  currentStatus,
}: {
  videoId: string;
  currentStatus: PublishStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<ActionKey | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: ActionKey) {
    setLoading(action);
    setError(null);

    const res = await fetch(`/api/admin/videos/${videoId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note: note.trim() || undefined }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Request failed");
      setLoading(null);
      return;
    }

    setLoading(null);
    setNote("");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <input
        type="text"
        placeholder="Optional note…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-56 rounded border px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
      <div className="flex gap-2">
        {ACTIONS.map(({ key, label, className }) => (
          <button
            key={key}
            onClick={() => handleAction(key)}
            disabled={loading !== null}
            className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${className}`}
          >
            {loading === key ? "…" : label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
