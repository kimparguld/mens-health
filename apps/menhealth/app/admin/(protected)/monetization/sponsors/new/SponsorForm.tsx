"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SponsorFormData {
  name: string;
  copyText: string;
  ctaText: string;
  ctaUrl: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface SponsorFormDefaultValues {
  name?: string;
  copyText?: string;
  ctaText?: string;
  ctaUrl?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  isActive?: boolean;
}

interface SponsorFormProps {
  defaultValues?: SponsorFormDefaultValues;
  sponsorId?: string;
}

export function SponsorForm({ defaultValues, sponsorId }: SponsorFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<SponsorFormData>({
    name: defaultValues?.name ?? "",
    copyText: defaultValues?.copyText ?? "",
    ctaText: defaultValues?.ctaText ?? "",
    ctaUrl: defaultValues?.ctaUrl ?? "",
    startDate: defaultValues?.startDate ?? "",
    endDate: defaultValues?.endDate ?? "",
    isActive: defaultValues?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof SponsorFormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name,
      copyText: form.copyText,
      ctaText: form.ctaText,
      ctaUrl: form.ctaUrl,
      isActive: form.isActive,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
    };

    try {
      const res = await fetch(
        sponsorId ? `/api/admin/sponsors/${sponsorId}` : "/api/admin/sponsors",
        {
          method: sponsorId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const data: { error?: unknown } = await res.json();
        setError(
          typeof data.error === "string"
            ? data.error
            : "Failed to save. Check all fields and try again.",
        );
        return;
      }

      router.push("/admin/monetization");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Sponsor name <span className="text-red-500">*</span>
        </label>
        <input
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Athletic Greens"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Ad copy <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          rows={3}
          value={form.copyText}
          onChange={(e) => set("copyText", e.target.value)}
          placeholder="Short promotional message shown on site"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            CTA button text <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={form.ctaText}
            onChange={(e) => set("ctaText", e.target.value)}
            placeholder="e.g. Try it free"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            CTA URL <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="url"
            value={form.ctaUrl}
            onChange={(e) => set("ctaUrl", e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Start date
          </label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            End date
          </label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => set("endDate", e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isActive"
          checked={form.isActive}
          onChange={(e) => set("isActive", e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600"
        />
        <label htmlFor="isActive" className="text-sm text-gray-700">
          Active (visible on site immediately)
        </label>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : sponsorId ? "Update sponsor" : "Create sponsor"}
        </button>
        <a
          href="/admin/monetization"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
