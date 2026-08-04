"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BulkConfirmMediumButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<number | null>(null);

  async function runBulkConfirm() {
    if (
      !window.confirm(
        "This applies the AI-suggested verdict to every pending LOW- or MEDIUM-risk claim with no per-claim review. Continue?",
      )
    ) {
      return;
    }

    setRunning(true);
    setError(null);
    setConfirmed(null);

    const res = await fetch("/api/admin/claims/bulk-confirm-medium", {
      method: "POST",
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Request failed");
      setRunning(false);
      return;
    }

    const data = (await res.json()) as { ok: true; confirmed: number };
    setConfirmed(data.confirmed);
    setRunning(false);
    router.refresh();
  }

  return (
    <div className="mb-5 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex items-center justify-between gap-4">
        <p>
          Bulk-confirm all pending LOW/MEDIUM-risk claims: accepts the
          AI-suggested verdict for every LOW- or MEDIUM-risk claim awaiting
          your confirm, with no per-claim review. HIGH-risk claims are never
          included and always need full manual review.
        </p>
        <button
          onClick={runBulkConfirm}
          disabled={running}
          className="shrink-0 rounded-lg bg-amber-700 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {running ? "Confirming…" : "Bulk-confirm LOW/MEDIUM risk"}
        </button>
      </div>

      {confirmed !== null && (
        <p className="text-xs text-amber-800">
          Confirmed <strong>{confirmed}</strong> claim
          {confirmed !== 1 ? "s" : ""}.
        </p>
      )}

      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
