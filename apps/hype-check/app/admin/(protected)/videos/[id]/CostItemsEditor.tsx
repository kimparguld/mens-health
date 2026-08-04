'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type CostItem = {
  id: string;
  label: string;
  amount: string;
  isHidden: boolean;
  notes: string | null;
};

function emptyDraft(): { label: string; amount: string; isHidden: boolean } {
  return { label: '', amount: '', isHidden: false };
}

export function CostItemsEditor({
  subjectId,
  initialItems,
}: {
  subjectId: string;
  initialItems: CostItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [draft, setDraft] = useState(emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!draft.label.trim() || !draft.amount.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/cost-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          label: draft.label.trim(),
          amount: draft.amount.trim(),
          isHidden: draft.isHidden,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        costItem?: CostItem;
        error?: string;
      } | null;
      if (!res.ok || !data?.costItem) {
        setError(data?.error ?? 'Failed to add cost item');
        return;
      }
      setItems((prev) => [...prev, data.costItem as CostItem]);
      setDraft(emptyDraft());
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, patch: Partial<CostItem>) {
    setError(null);
    const current = items.find((i) => i.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
    try {
      const res = await fetch(`/api/admin/cost-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: next.label,
          amount: next.amount,
          isHidden: next.isHidden,
          notes: next.notes,
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
      const res = await fetch(`/api/admin/cost-items/${id}`, {
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
      <h3 className="mb-2 text-sm font-semibold text-gray-700">Cost items</h3>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-2 text-sm">
            <input
              type="text"
              value={item.label}
              onChange={(e) =>
                setItems((prev) =>
                  prev.map((i) =>
                    i.id === item.id ? { ...i, label: e.target.value } : i,
                  ),
                )
              }
              onBlur={(e) => handleUpdate(item.id, { label: e.target.value })}
              className="flex-1 rounded border border-gray-300 px-2 py-1"
              placeholder="Label"
            />
            <input
              type="text"
              value={item.amount}
              onChange={(e) =>
                setItems((prev) =>
                  prev.map((i) =>
                    i.id === item.id ? { ...i, amount: e.target.value } : i,
                  ),
                )
              }
              onBlur={(e) => handleUpdate(item.id, { amount: e.target.value })}
              className="w-28 rounded border border-gray-300 px-2 py-1"
              placeholder="Amount"
            />
            <label className="flex items-center gap-1 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={item.isHidden}
                onChange={(e) =>
                  handleUpdate(item.id, { isHidden: e.target.checked })
                }
              />
              Hidden
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
          placeholder="Label…"
          value={draft.label}
          onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <input
          type="text"
          placeholder="Amount…"
          value={draft.amount}
          onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
          className="w-28 rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <label className="flex items-center gap-1 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={draft.isHidden}
            onChange={(e) =>
              setDraft((d) => ({ ...d, isHidden: e.target.checked }))
            }
          />
          Hidden
        </label>
        <button
          onClick={handleAdd}
          disabled={saving || !draft.label.trim() || !draft.amount.trim()}
          className="rounded border px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
