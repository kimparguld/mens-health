"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProcessNowButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/jobs/process-now", {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as {
        processed?: number;
        failed?: number;
        error?: string;
      } | null;
      if (!res.ok) {
        setMessage(data?.error ?? "Failed to process batch");
        return;
      }
      setMessage(
        `Processed ${data?.processed ?? 0}, failed ${data?.failed ?? 0}. This calls real AI providers — run again to work through a larger backlog.`,
      );
      router.refresh();
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        {loading ? "Processing…" : "Process next batch now"}
      </button>
      {message && <span className="text-xs text-gray-500">{message}</span>}
    </div>
  );
}
