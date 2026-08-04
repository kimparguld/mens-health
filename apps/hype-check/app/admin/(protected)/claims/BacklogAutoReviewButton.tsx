"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BatchResult = {
  processed: number;
  autoReviewed: number;
  prefilled: number;
  skippedHighRisk: number;
  failed: number;
  remaining: number;
};

// Safety cap on batch iterations — if a batch keeps returning claims that
// can't be resolved (e.g. persistent AI failures), stop looping rather than
// spinning forever, and let the admin re-click to retry.
const MAX_BATCHES = 50;

export function BacklogAutoReviewButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BatchResult | null>(null);
  const [totals, setTotals] = useState({
    autoReviewed: 0,
    prefilled: 0,
    skippedHighRisk: 0,
    failed: 0,
  });

  async function runBackfill() {
    setRunning(true);
    setError(null);
    setSummary(null);
    let acc = {
      autoReviewed: 0,
      prefilled: 0,
      skippedHighRisk: 0,
      failed: 0,
    };
    setTotals(acc);

    for (let batch = 0; batch < MAX_BATCHES; batch++) {
      const res = await fetch("/api/admin/claims/backfill-auto-review", {
        method: "POST",
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Request failed");
        break;
      }

      const data = (await res.json()) as { ok: true } & BatchResult;
      acc = {
        autoReviewed: acc.autoReviewed + data.autoReviewed,
        prefilled: acc.prefilled + data.prefilled,
        skippedHighRisk: acc.skippedHighRisk + data.skippedHighRisk,
        failed: acc.failed + data.failed,
      };
      setTotals(acc);
      setSummary(data);

      // Stop once a batch makes no forward progress — what's left is either
      // HIGH-risk (never auto-resolved) or claims the AI couldn't verdict.
      if (data.autoReviewed + data.prefilled === 0) break;
      if (data.processed === 0) break;
    }

    setRunning(false);
    router.refresh();
  }

  return (
    <div className="mb-5 flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
      <div className="flex items-center justify-between gap-4">
        <p>
          Auto-review the backlog: applies the same LOW/MEDIUM/HIGH rules
          used for new claims to existing unreviewed ones. Low-risk claims
          get fact-checked and cleared automatically; medium-risk claims get
          a verdict pre-filled for a one-click confirm; high-risk claims are
          never touched and always need manual review.
        </p>
        <button
          onClick={runBackfill}
          disabled={running}
          className="shrink-0 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {running ? "Processing…" : "Auto-review backlog"}
        </button>
      </div>

      {(running || summary) && (
        <p className="text-xs text-blue-800">
          Auto-reviewed: <strong>{totals.autoReviewed}</strong> · Pre-filled
          (needs confirm): <strong>{totals.prefilled}</strong> · High-risk
          (needs manual review): <strong>{totals.skippedHighRisk}</strong>
          {totals.failed > 0 && (
            <>
              {" "}
              · AI verdict failed: <strong>{totals.failed}</strong>
            </>
          )}
          {!running && summary && (
            <> · Still unreviewed: <strong>{summary.remaining}</strong></>
          )}
        </p>
      )}

      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
