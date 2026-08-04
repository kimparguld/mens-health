'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Disclosure = {
  id: string;
  text: string;
  detected: boolean;
  source: string | null;
};

function emptyDraft(): { text: string; detected: boolean } {
  return { text: '', detected: true };
}

export function DisclosuresEditor({
  subjectId,
  initialItems,
}: {
  subjectId: string;
  initialItems: Disclosure[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [draft, setDraft] = useState(emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!draft.text.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/disclosures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          text: draft.text.trim(),
          detected: draft.detected,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        disclosure?: Disclosure;
        error?: string;
      } | null;
      if (!res.ok || !data?.disclosure) {
        setError(data?.error ?? 'Failed to add disclosure');
        return;
      }
      setItems((prev) => [...prev, data.disclosure as Disclosure]);
      setDraft(emptyDraft());
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, patch: Partial<Disclosure>) {
    setError(null);
    const current = items.find((i) => i.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
    try {
      const res = await fetch(`/api/admin/disclosures/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: next.text,
          detected: next.detected,
          source: next.source,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? 'Failed to save');
        return;
      }
      setItems((prev) => prev.map((i) => (i.id === id ? next : i)));
      router.refresh();
    } catch {
      setError('Network error');
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/disclosures/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? 'Failed to delete');
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
      router.refresh();
    } catch {
      setError('Network error');
    }
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">Disclosures</h3>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-2 text-sm">
            <input
              type="text"
              value={item.text}
              onChange={(e) =>
                setItems((prev) =>
                  prev.map((i) =>
                    i.id === item.id ? { ...i, text: e.target.value } : i,
                  ),
                )
              }
              onBlur={(e) => handleUpdate(item.id, { text: e.target.value })}
              className="flex-1 rounded border border-gray-300 px-2 py-1"
            />
            <label className="flex items-center gap-1 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={item.detected}
                onChange={(e) =>
                  handleUpdate(item.id, { detected: e.target.checked })
                }
              />
              Detected
            </label>
            <button
              onClick={() => handleDelete(item.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          placeholder="Add a disclosure…"
          value={draft.text}
          onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <label className="flex items-center gap-1 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={draft.detected}
            onChange={(e) =>
              setDraft((d) => ({ ...d, detected: e.target.checked }))
            }
          />
          Detected
        </label>
        <button
          onClick={handleAdd}
          disabled={saving || !draft.text.trim()}
          className="rounded border px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
