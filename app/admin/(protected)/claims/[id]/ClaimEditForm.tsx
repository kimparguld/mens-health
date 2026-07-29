"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EvidenceStatus =
  | "NOT_CHECKED"
  | "SUPPORTED"
  | "MIXED"
  | "WEAK"
  | "UNSUPPORTED";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

type Source = {
  id?: string;
  title: string;
  url: string;
  source: string;
  year: number | null;
  summary: string | null;
};

const EVIDENCE_OPTIONS: EvidenceStatus[] = [
  "NOT_CHECKED",
  "SUPPORTED",
  "MIXED",
  "WEAK",
  "UNSUPPORTED",
];
const RISK_OPTIONS: RiskLevel[] = ["LOW", "MEDIUM", "HIGH"];

function emptySource(): Source {
  return { title: "", url: "", source: "", year: null, summary: null };
}

export function ClaimEditForm({
  claimId,
  initialEvidenceStatus,
  initialRiskLevel,
  initialExplanation,
  initialSources,
}: {
  claimId: string;
  initialEvidenceStatus: EvidenceStatus;
  initialRiskLevel: RiskLevel;
  initialExplanation: string | null;
  initialSources: Source[];
}) {
  const router = useRouter();
  const [evidenceStatus, setEvidenceStatus] = useState(initialEvidenceStatus);
  const [riskLevel, setRiskLevel] = useState(initialRiskLevel);
  const [explanation, setExplanation] = useState(initialExplanation ?? "");
  const [sources, setSources] = useState<Source[]>(initialSources);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateSource(index: number, patch: Partial<Source>) {
    setSources((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  function removeSource(index: number) {
    setSources((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidenceStatus,
          riskLevel,
          explanation: explanation.trim() || null,
          sources: sources
            .filter((s) => s.title && s.url && s.source)
            .map((s) => ({
              ...s,
              year: s.year ?? undefined,
              summary: s.summary || undefined,
            })),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Failed to save");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Evidence review
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Evidence status
            </label>
            <select
              value={evidenceStatus}
              onChange={(e) =>
                setEvidenceStatus(e.target.value as EvidenceStatus)
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            >
              {EVIDENCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Risk level
            </label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            >
              {RISK_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Explanation (shown publicly on the claim page)
          </label>
          <textarea
            rows={4}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Why this evidence status — what the sources do and don't support…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Evidence sources
          </h2>
          <button
            onClick={() => setSources((prev) => [...prev, emptySource()])}
            className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            + Add source
          </button>
        </div>

        {sources.length === 0 ? (
          <p className="text-sm text-gray-400">No sources added yet.</p>
        ) : (
          <div className="space-y-4">
            {sources.map((s, i) => (
              <div
                key={s.id ?? `new-${i}`}
                className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3"
              >
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Title"
                    value={s.title}
                    onChange={(e) =>
                      updateSource(i, { title: e.target.value })
                    }
                    className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Source (e.g. NIH, PubMed, Cochrane)"
                    value={s.source}
                    onChange={(e) =>
                      updateSource(i, { source: e.target.value })
                    }
                    className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <input
                  type="url"
                  placeholder="https://…"
                  value={s.url}
                  onChange={(e) => updateSource(i, { url: e.target.value })}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Year"
                    value={s.year ?? ""}
                    onChange={(e) =>
                      updateSource(i, {
                        year: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="One-line summary (optional)"
                    value={s.summary ?? ""}
                    onChange={(e) =>
                      updateSource(i, { summary: e.target.value || null })
                    }
                    className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <button
                  onClick={() => removeSource(i)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove source
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
          Saved.
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
      >
        {saving ? "Saving…" : "Save review"}
      </button>
    </div>
  );
}
