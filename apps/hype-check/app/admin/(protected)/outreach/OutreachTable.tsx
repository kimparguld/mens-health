"use client";

import { useState } from "react";

type OutreachContact = {
  id: string;
  name: string;
  contactType: string;
  email: string | null;
  socialUrl: string | null;
  relatedContentUrl: string | null;
  status: string;
  lastContactedAt: Date | null;
  nextFollowUpAt: Date | null;
  notes: string | null;
  result: string | null;
  createdAt: Date;
};

const CONTACT_TYPES = [
  { value: "YOUTUBE_CREATOR", label: "YouTube Creator" },
  { value: "NEWSLETTER_PUBLISHER", label: "Newsletter Publisher" },
  { value: "FITNESS_BLOGGER", label: "Fitness Blogger" },
  { value: "COACH", label: "Coach" },
  { value: "PODCAST_HOST", label: "Podcast Host" },
  { value: "SPONSOR_PROSPECT", label: "Sponsor Prospect" },
  { value: "HEALTH_TECH_FOUNDER", label: "Health-Tech Founder" },
];

const STATUSES = [
  {
    value: "NOT_CONTACTED",
    label: "Not contacted",
    color: "bg-gray-100 text-gray-600",
  },
  {
    value: "EMAIL_SENT",
    label: "Email sent",
    color: "bg-blue-100 text-blue-700",
  },
  {
    value: "REPLIED",
    label: "Replied",
    color: "bg-indigo-100 text-indigo-700",
  },
  {
    value: "MEETING_BOOKED",
    label: "Meeting booked",
    color: "bg-purple-100 text-purple-700",
  },
  {
    value: "DEAL_IN_PROGRESS",
    label: "Deal in progress",
    color: "bg-yellow-100 text-yellow-700",
  },
  {
    value: "CLOSED_WON",
    label: "Closed — won",
    color: "bg-green-100 text-green-800",
  },
  {
    value: "CLOSED_LOST",
    label: "Closed — lost",
    color: "bg-red-100 text-red-700",
  },
  {
    value: "FOLLOW_UP_NEEDED",
    label: "Follow-up needed",
    color: "bg-orange-100 text-orange-700",
  },
];

const TEMPLATES = [
  {
    name: "Creator summary outreach",
    body: `Hi [Name],

We created an evidence-aware summary of your video and linked back to your channel.

The goal is to help people understand the main takeaways and encourage them to watch the original video.

If anything feels misrepresented, I'd be happy to correct it.

Best,
[Your name]`,
  },
  {
    name: "Expert quote request",
    body: `Hi [Name],

I'm preparing a short evidence-aware summary about [topic].

Would you be open to contributing a short quote on what people often misunderstand about this topic?

I'll credit and link back to you.

Best,
[Your name]`,
  },
  {
    name: "Sponsor conversation",
    body: `Hi [Name],

I run MenHealth Digest, a site/newsletter that summarises trending men's health content and explains the evidence without hype.

I'm exploring a small number of relevant sponsors for readers interested in fitness, sleep, nutrition, and longevity.

Would you be open to a short conversation?

Best,
[Your name]`,
  },
];

const BLANK_FORM = {
  name: "",
  contactType: "YOUTUBE_CREATOR",
  email: "",
  socialUrl: "",
  relatedContentUrl: "",
  status: "NOT_CONTACTED",
  notes: "",
};

export function OutreachTable({
  initialContacts,
}: {
  initialContacts: OutreachContact[];
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [templateIdx, setTemplateIdx] = useState(0);
  const [showTemplate, setShowTemplate] = useState(false);

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
    const res = await fetch("/api/admin/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        email: form.email || null,
        socialUrl: form.socialUrl || null,
        relatedContentUrl: form.relatedContentUrl || null,
        notes: form.notes || null,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { contact: OutreachContact };
      setContacts((prev) => [data.contact, ...prev]);
      setForm(BLANK_FORM);
      setShowForm(false);
    }
    setSaving(false);
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/admin/outreach/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setContacts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c)),
      );
    }
  }

  function statusConfig(status: string) {
    return STATUSES.find((s) => s.value === status) ?? STATUSES[0];
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
        >
          {showForm ? "Cancel" : "+ Add contact"}
        </button>
        <button
          onClick={() => setShowTemplate(!showTemplate)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          View outreach templates
        </button>
      </div>

      {/* Outreach templates */}
      {showTemplate && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex gap-2">
            {TEMPLATES.map((t, i) => (
              <button
                key={t.name}
                onClick={() => setTemplateIdx(i)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  templateIdx === i
                    ? "bg-indigo-700 text-white"
                    : "border border-gray-200 text-gray-600 hover:border-indigo-400"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
          <pre className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs whitespace-pre-wrap text-gray-700">
            {TEMPLATES[templateIdx]?.body}
          </pre>
          <button
            onClick={() =>
              navigator.clipboard.writeText(TEMPLATES[templateIdx]?.body || "")
            }
            className="mt-2 text-xs text-indigo-700 underline"
          >
            Copy template
          </button>
        </div>
      )}

      {/* Add contact form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-xl border border-gray-200 bg-white p-5"
        >
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            New contact
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={set("name")}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Contact type *
              </label>
              <select
                value={form.contactType}
                onChange={set("contactType")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {CONTACT_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>
                    {ct.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={set("email")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Social URL
              </label>
              <input
                type="url"
                value={form.socialUrl}
                onChange={set("socialUrl")}
                placeholder="https://youtube.com/@..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Related content URL
              </label>
              <input
                type="url"
                value={form.relatedContentUrl}
                onChange={set("relatedContentUrl")}
                placeholder="https://hype-check.net/videos/..."
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
              {saving ? "Saving…" : "Add contact"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {contacts.length === 0 ? (
        <p className="text-sm text-gray-400">No contacts yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Follow-up</th>
                <th className="px-4 py-3 text-left">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {contacts.map((c) => {
                const sc = statusConfig(c.status);
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div>{c.name}</div>
                      {c.email && (
                        <div className="text-xs text-gray-400">{c.email}</div>
                      )}
                      {c.socialUrl && (
                        <a
                          href={c.socialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 underline"
                        >
                          Profile
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {CONTACT_TYPES.find((ct) => ct.value === c.contactType)
                        ?.label ?? c.contactType}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={c.status}
                        onChange={(e) => updateStatus(c.id, e.target.value)}
                        className={`cursor-pointer rounded-full border-0 px-2 py-0.5 text-xs font-medium ${sc?.color}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {c.nextFollowUpAt
                        ? new Date(c.nextFollowUpAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <div className="max-w-xs truncate">{c.notes ?? "—"}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
