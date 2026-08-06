"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props =
  | { mode: "generate"; videoId: string; platform: string }
  | { mode: "regenerate"; postId: string };

export default function DraftGenerateAction(props: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const res =
      props.mode === "generate"
        ? await fetch("/api/social/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              videoId: props.videoId,
              platform: props.platform,
            }),
          })
        : await fetch(`/api/social/drafts/${props.postId}/regenerate`, {
            method: "POST",
          });
    setLoading(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Request failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        onClick={handleClick}
        disabled={loading}
        className={
          props.mode === "generate"
            ? "rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            : "rounded-md border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        }
      >
        {props.mode === "generate"
          ? loading
            ? "Generating…"
            : "Generate"
          : loading
            ? "Regenerating…"
            : "Regenerate"}
      </button>
    </div>
  );
}
