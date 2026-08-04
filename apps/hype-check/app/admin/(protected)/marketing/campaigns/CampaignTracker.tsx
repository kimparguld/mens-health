"use client";

import { useState } from "react";
import Link from "next/link";

type Campaign = {
  id: string;
  name: string;
  platform: string;
  budget: number | null;
  landingPage: string | null;
  utmUrl: string | null;
  clicks: number;
  signups: number;
  notes: string | null;
  isActive: boolean;
  startedAt: Date;
  endedAt: Date | null;
};

const BLANK_FORM = {
  name: "",
  platform: "",
  budget: "",
  landingPage: "",
  utmUrl: "",
  notes: "",
};

export function CampaignTracker({
  initialCampaigns,
}: {
  initialCampaigns: Campaign[];
}) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  function set(key: keyof typeof form) {
    return (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        platform: form.platform,
        budget: form.budget ? parseFloat(form.budget) : null,
        landingPage: form.landingPage || null,
        utmUrl: form.utmUrl || null,
        notes: form.notes || null,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { campaign: Campaign };
      setCampaigns((prev) => [data.campaign, ...prev]);
      setForm(BLANK_FORM);
      setShowForm(false);
    }
    setSaving(false);
  }

  async function updateField(
    id: string,
    field: string,
    value: number | boolean | null,
  ) {
    const res = await fetch(`/api/admin/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
      );
    }
  }

  const active = campaigns.filter((c) => c.isActive);
  const archived = campaigns.filter((c) => !c.isActive);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
        >
          {showForm ? "Cancel" : "+ New campaign"}
        </button>
        <Link
          href="/admin/marketing/utm-builder"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          UTM builder →
        </Link>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-xl border border-gray-200 bg-white p-5"
        >
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            New campaign
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Campaign name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={set("name")}
                required
                placeholder="Men's health digest — Reddit"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Platform *
              </label>
              <input
                type="text"
                value={form.platform}
                onChange={set("platform")}
                required
                placeholder="Google, Reddit, TikTok, Newsletter…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Budget (£)
              </label>
              <input
                type="number"
                value={form.budget}
                onChange={set("budget")}
                placeholder="50"
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Landing page
              </label>
              <input
                type="url"
                value={form.landingPage}
                onChange={set("landingPage")}
                placeholder="https://hype-check.net/newsletter"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">
                UTM URL
              </label>
              <input
                type="url"
                value={form.utmUrl}
                onChange={set("utmUrl")}
                placeholder="https://hype-check.net/newsletter?utm_source=..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Notes
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={set("notes")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Create campaign"}
            </button>
          </div>
        </form>
      )}

      <CampaignList
        campaigns={active}
        heading="Active campaigns"
        onUpdate={updateField}
      />
      {archived.length > 0 && (
        <CampaignList
          campaigns={archived}
          heading="Archived"
          onUpdate={updateField}
          dim
        />
      )}
    </div>
  );
}

function CampaignList({
  campaigns,
  heading,
  onUpdate,
  dim = false,
}: {
  campaigns: Campaign[];
  heading: string;
  onUpdate: (id: string, field: string, value: number | boolean | null) => void;
  dim?: boolean;
}) {
  if (campaigns.length === 0) {
    return <p className="mb-6 text-sm text-gray-400">{heading}: none yet.</p>;
  }

  return (
    <section className={`mb-8 ${dim ? "opacity-60" : ""}`}>
      <h2 className="mb-3 text-sm font-semibold text-gray-600">{heading}</h2>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Campaign</th>
              <th className="px-4 py-3 text-left">Platform</th>
              <th className="px-4 py-3 text-left">Budget</th>
              <th className="px-4 py-3 text-left">Clicks</th>
              <th className="px-4 py-3 text-left">Signups</th>
              <th className="px-4 py-3 text-left">CPS</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {campaigns.map((c) => {
              const cps =
                c.signups > 0 && c.budget
                  ? `£${(c.budget / c.signups).toFixed(2)}`
                  : "—";
              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{c.name}</div>
                    {c.utmUrl && (
                      <a
                        href={c.utmUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 underline"
                      >
                        UTM link
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.platform}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.budget != null ? `£${c.budget}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      defaultValue={c.clicks}
                      onBlur={(e) =>
                        onUpdate(c.id, "clicks", parseInt(e.target.value, 10))
                      }
                      className="w-16 rounded border border-gray-200 px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      defaultValue={c.signups}
                      onBlur={(e) =>
                        onUpdate(c.id, "signups", parseInt(e.target.value, 10))
                      }
                      className="w-16 rounded border border-gray-200 px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-600">{cps}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onUpdate(c.id, "isActive", !c.isActive)}
                      className="text-xs text-gray-400 underline hover:text-gray-700"
                    >
                      {c.isActive ? "Archive" : "Restore"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
