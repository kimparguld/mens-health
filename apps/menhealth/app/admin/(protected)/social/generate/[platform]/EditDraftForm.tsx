"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  postId: string;
  initialHook: string;
  initialScript: string;
  initialCaption: string;
  initialHashtags: string[];
  showScript: boolean;
};

export default function EditDraftForm({
  postId,
  initialHook,
  initialScript,
  initialCaption,
  initialHashtags,
  showScript,
}: Props) {
  const router = useRouter();
  const [hook, setHook] = useState(initialHook);
  const [script, setScript] = useState(initialScript);
  const [caption, setCaption] = useState(initialCaption);
  const [hashtagsText, setHashtagsText] = useState(initialHashtags.join(" "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const hashtags = hashtagsText
      .split(/\s+/)
      .map((h) => h.trim())
      .filter(Boolean);
    const res = await fetch(`/api/social/drafts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hook, script, caption, hashtags }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Save failed");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-lg border bg-white p-4">
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">
          Hook
        </label>
        <textarea
          value={hook}
          onChange={(e) => setHook(e.target.value)}
          rows={2}
          className="w-full rounded border px-2 py-1.5 text-sm"
        />
      </div>
      {showScript && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Script
          </label>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={6}
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">
          Caption
        </label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={4}
          className="w-full rounded border px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">
          Hashtags (space-separated)
        </label>
        <input
          type="text"
          value={hashtagsText}
          onChange={(e) => setHashtagsText(e.target.value)}
          className="w-full rounded border px-2 py-1.5 text-sm"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
      </button>
    </div>
  );
}
