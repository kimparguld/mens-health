"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Topic {
  slug: string;
  name: string;
}

interface AffiliateLinkFormData {
  label: string;
  url: string;
  productName: string;
  commission: string;
  topicSlug: string;
}

export interface AffiliateLinkFormDefaultValues {
  label?: string;
  url?: string;
  productName?: string;
  commission?: string;
  topicSlug?: string;
}

interface AffiliateLinkFormProps {
  defaultValues?: AffiliateLinkFormDefaultValues;
  linkId?: string;
  topics: Topic[];
}

export function AffiliateLinkForm({
  defaultValues,
  linkId,
  topics,
}: AffiliateLinkFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<AffiliateLinkFormData>({
    label: defaultValues?.label ?? "",
    url: defaultValues?.url ?? "",
    productName: defaultValues?.productName ?? "",
    commission: defaultValues?.commission ?? "",
    topicSlug: defaultValues?.topicSlug ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof AffiliateLinkFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      label: form.label,
      url: form.url,
      productName: form.productName,
      commission: form.commission || undefined,
      topicSlug: form.topicSlug || undefined,
    };

    try {
      const res = await fetch(
        linkId
          ? `/api/admin/affiliate-links/${linkId}`
          : "/api/admin/affiliate-links",
        {
          method: linkId ? "PATCH" : "POST",
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
          Link label <span className="text-red-500">*</span>
        </label>
        <input
          required
          value={form.label}
          onChange={(e) => set("label", e.target.value)}
          placeholder="e.g. Best creatine supplement"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Product name <span className="text-red-500">*</span>
        </label>
        <input
          required
          value={form.productName}
          onChange={(e) => set("productName", e.target.value)}
          placeholder="e.g. Creatine Monohydrate 500g"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Affiliate URL <span className="text-red-500">*</span>
        </label>
        <input
          required
          type="url"
          value={form.url}
          onChange={(e) => set("url", e.target.value)}
          placeholder="https://..."
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Commission rate
          </label>
          <input
            value={form.commission}
            onChange={(e) => set("commission", e.target.value)}
            placeholder="e.g. 8%"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Topic (optional)
          </label>
          <select
            value={form.topicSlug}
            onChange={(e) => set("topicSlug", e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All topics (generic)</option>
            {topics.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
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
          {saving ? "Saving…" : linkId ? "Update link" : "Create link"}
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
