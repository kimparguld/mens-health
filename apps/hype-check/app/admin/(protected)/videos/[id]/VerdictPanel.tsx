"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type VerdictType = "LEGIT" | "MISLEADING" | "OVERPRICED" | "RISKY" | "SCAM";

const VERDICT_OPTIONS: VerdictType[] = [
  "LEGIT",
  "MISLEADING",
  "OVERPRICED",
  "RISKY",
  "SCAM",
];

const verdictColors: Record<VerdictType, string> = {
  LEGIT: "bg-green-100 text-green-700",
  MISLEADING: "bg-yellow-100 text-yellow-700",
  OVERPRICED: "bg-orange-100 text-orange-700",
  RISKY: "bg-orange-100 text-orange-700",
  SCAM: "bg-red-100 text-red-700",
};

type CurrentVerdict = {
  verdict: VerdictType;
  rationale: string | null;
  confidence: number | null;
  acknowledgedHighRisk: boolean;
  publishedAt: Date | null;
} | null;

type HistoryEntry = {
  id: string;
  verdict: string;
  rationale: string | null;
  changedBy: string | null;
  createdAt: Date;
};

export default function VerdictPanel({
  subjectId,
  currentVerdict,
  history,
}: {
  subjectId: string;
  currentVerdict: CurrentVerdict;
  history: HistoryEntry[];
}) {
  const router = useRouter();
  const [verdict, setVerdict] = useState<VerdictType>(
    currentVerdict?.verdict ?? "LEGIT",
  );
  const [rationale, setRationale] = useState(currentVerdict?.rationale ?? "");
  const [acknowledgeHighRisk, setAcknowledgeHighRisk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isScam = verdict === "SCAM";

  async function save() {
    if (isScam && (!acknowledgeHighRisk || !rationale.trim())) {
      setError(
        "Check the acknowledgment box and add a rationale before publishing a SCAM verdict.",
      );
      return;
    }

    setSaving(true);
    setError(null);

    const res = await fetch(`/api/admin/videos/${subjectId}/verdict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verdict,
        rationale: rationale.trim() || undefined,
        ...(isScam ? { acknowledgeHighRisk } : {}),
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Request failed");
      setSaving(false);
      return;
    }

    setSaving(false);
    setAcknowledgeHighRisk(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border bg-white p-4 text-sm">
      <h3 className="mb-3 font-semibold text-gray-700">Verdict</h3>

      {currentVerdict && (
        <div className="mb-3 flex items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${verdictColors[currentVerdict.verdict]}`}
          >
            {currentVerdict.verdict}
          </span>
          {currentVerdict.publishedAt && (
            <span className="text-xs text-gray-400">
              Published {currentVerdict.publishedAt.toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      <label className="mb-1 block text-xs font-medium text-gray-600">
        Set verdict
      </label>
      <select
        value={verdict}
        onChange={(e) => setVerdict(e.target.value as VerdictType)}
        className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
      >
        {VERDICT_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>

      <textarea
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        placeholder={
          isScam
            ? "Required rationale before publishing a SCAM verdict…"
            : "Rationale (optional)…"
        }
        rows={3}
        className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
      />

      {isScam && (
        <div className="mb-3 flex flex-col gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
          <label className="flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              checked={acknowledgeHighRisk}
              onChange={(e) => setAcknowledgeHighRisk(e.target.checked)}
              className="rounded border-red-400"
            />
            This is a SCAM verdict — I acknowledge and approve publishing it
          </label>
        </div>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save verdict"}
      </button>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {history.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <h4 className="mb-2 text-xs font-semibold text-gray-500">
            History
          </h4>
          <ol className="space-y-1.5">
            {history.map((h) => (
              <li key={h.id} className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">
                  {h.verdict}
                </span>
                {h.rationale && <span> — {h.rationale}</span>}
                <span className="ml-1 text-gray-400">
                  {h.createdAt.toLocaleDateString()}
                  {h.changedBy ? ` · ${h.changedBy}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
