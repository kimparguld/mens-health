"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewerForm({
  videoId,
  initialName,
  initialCredentials,
}: {
  videoId: string;
  initialName: string | null;
  initialCredentials: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [credentials, setCredentials] = useState(initialCredentials ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/admin/videos/${videoId}/summary`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewerName: name.trim() || null,
        reviewerCredentials: credentials.trim() || null,
      }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
      <div>
        <label className="block text-xs font-medium text-gray-500">
          Reviewer name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Dr. Jane Smith"
          className="w-48 rounded border px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500">
          Credentials
        </label>
        <input
          type="text"
          value={credentials}
          onChange={(e) => setCredentials(e.target.value)}
          placeholder="e.g. MD"
          className="w-32 rounded border px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save reviewer"}
      </button>
    </div>
  );
}
