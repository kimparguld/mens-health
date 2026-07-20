"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLATFORMS = [
  { value: "YOUTUBE_SHORTS", label: "YouTube Shorts" },
  { value: "REDDIT", label: "Reddit" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "X", label: "X (Twitter)" },
] as const;

type Platform = (typeof PLATFORMS)[number]["value"];

export default function GenerateSocialButton({ videoId }: { videoId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<Platform>>(new Set());
  const [results, setResults] = useState<
    Record<Platform, "idle" | "loading" | "ok" | string>
  >({} as Record<Platform, "idle" | "loading" | "ok" | string>);
  const [anyLoading, setAnyLoading] = useState(false);

  function toggle(p: Platform) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        next.delete(p);
      } else {
        next.add(p);
      }
      return next;
    });
  }

  async function generate() {
    if (selected.size === 0) return;
    setAnyLoading(true);
    const promises = Array.from(selected).map(async (platform) => {
      setResults((r) => ({ ...r, [platform]: "loading" }));
      const res = await fetch("/api/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, platform }),
      });
      if (res.ok) {
        setResults((r) => ({ ...r, [platform]: "ok" }));
      } else {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setResults((r) => ({ ...r, [platform]: data?.error ?? "Error" }));
      }
    });
    await Promise.all(promises);
    setAnyLoading(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
      >
        Generate social drafts
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-white p-4">
      <p className="text-sm font-medium">Generate social drafts for:</p>
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <label
            key={p.value}
            className="flex cursor-pointer items-center gap-1.5 text-sm"
          >
            <input
              type="checkbox"
              checked={selected.has(p.value)}
              onChange={() => toggle(p.value)}
              className="rounded"
            />
            {p.label}
          </label>
        ))}
      </div>

      {Object.entries(results).length > 0 && (
        <ul className="space-y-1 text-xs">
          {Object.entries(results).map(([platform, state]) => (
            <li
              key={platform}
              className={
                state === "ok"
                  ? "text-green-700"
                  : state === "loading"
                    ? "text-gray-500"
                    : "text-red-600"
              }
            >
              {platform}:{" "}
              {state === "ok"
                ? "✓ Draft created"
                : state === "loading"
                  ? "Generating…"
                  : state}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <button
          onClick={generate}
          disabled={selected.size === 0 || anyLoading}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {anyLoading ? "Generating…" : "Generate"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
