"use client";
import { twMerge } from "tailwind-merge";

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
  currentStatus: _currentStatus,
  hasSummary,
  riskLevel,
}: {
  videoId: string;
  currentStatus: PublishStatus;
  hasSummary: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<ActionKey | null>(null);
  const [note, setNote] = useState("");
  const [acknowledgeHighRisk, setAcknowledgeHighRisk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHighRisk = riskLevel === "HIGH";

  async function handleAction(action: ActionKey) {
    // Server-side enforced: publishing a HIGH-risk video requires the
    // acknowledgment checkbox checked and a non-empty note.
    if (action === "PUBLISHED" && isHighRisk && (!acknowledgeHighRisk || !note.trim())) {
      setError(
        "Check the high-risk acknowledgment box and add a note before publishing.",
      );
      return;
    }

    setLoading(action);
    setError(null);

    const res = await fetch(`/api/admin/videos/${videoId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        note: note.trim() || undefined,
        ...(action === "PUBLISHED" && isHighRisk
          ? { acknowledgeHighRisk: true }
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

    setLoading(null);
    setNote("");
    setAcknowledgeHighRisk(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {isHighRisk && (
        <div className="flex w-72 flex-col gap-1 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
          <label className="flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              checked={acknowledgeHighRisk}
              onChange={(e) => setAcknowledgeHighRisk(e.target.checked)}
              className="rounded border-red-400"
            />
            This is HIGH risk — I acknowledge and approve publishing
          </label>
        </div>
      )}
      <input
        type="text"
        placeholder={isHighRisk ? "Required note before publishing…" : "Optional note…"}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-56 rounded border px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
      <div className="flex gap-2">
        {ACTIONS.map(({ key, label, className }) => (
          <button
            key={key}
            onClick={() => handleAction(key)}
            disabled={loading !== null || (key === "PUBLISHED" && !hasSummary)}
            className={twMerge(
              `self-end rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap disabled:opacity-50`,
              className,
            )}
          >
            {loading === key ? "…" : label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
