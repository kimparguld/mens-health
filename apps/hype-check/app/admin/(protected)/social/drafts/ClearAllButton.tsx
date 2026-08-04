"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClearAllButton({
  scheduledCount,
  publishedCount,
}: {
  scheduledCount: number;
  publishedCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    const warnings: string[] = [];
    if (scheduledCount > 0) {
      warnings.push(
        `${scheduledCount} post(s) are SCHEDULED — deleting cancels their auto-publish.`,
      );
    }
    if (publishedCount > 0) {
      warnings.push(
        `${publishedCount} post(s) are PUBLISHED — deleting only removes the admin record, not the live post.`,
      );
    }
    const confirmed = confirm(
      [
        "Delete ALL social drafts? This cannot be undone.",
        ...warnings,
      ].join("\n"),
    );
    if (!confirmed) return;

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/social/drafts/clear-all", {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => null)) as {
        deletedPosts?: number;
        error?: string;
      } | null;
      if (!res.ok) {
        setMessage(data?.error ?? "Failed to clear drafts");
        return;
      }
      setMessage(`Deleted ${data?.deletedPosts ?? 0} draft(s).`);
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
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {loading ? "Clearing…" : "Clear all drafts"}
      </button>
      {message && <span className="text-xs text-gray-500">{message}</span>}
    </div>
  );
}
