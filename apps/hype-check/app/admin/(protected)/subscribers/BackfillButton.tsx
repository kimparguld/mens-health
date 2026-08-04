"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BackfillButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/subscribers/backfill-confirmed", {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as {
        updated?: number;
        error?: string;
      } | null;
      if (!res.ok) {
        setMessage(data?.error ?? "Backfill failed");
        return;
      }
      setMessage(`Confirmed ${data?.updated ?? 0} legacy subscriber(s).`);
      router.refresh();
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <p className="flex-1">
        These subscribers predate the confirmation fix — there was never a
        double opt-in step, so being subscribed already means confirmed.
      </p>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
      >
        {loading ? "Working…" : "Backfill legacy confirmed dates"}
      </button>
      {message && <span className="text-xs">{message}</span>}
    </div>
  );
}
