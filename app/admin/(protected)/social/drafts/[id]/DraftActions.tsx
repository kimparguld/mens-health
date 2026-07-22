"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  postId: string;
  platform: string;
  status: string;
  riskLevel: string;
  requiresReview: boolean;
};

export default function DraftActions({
  postId,
  platform,
  status,
  riskLevel,
  requiresReview,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const videoInputRef = useRef<HTMLInputElement>(null);

  const isApprovable = status === "PENDING_REVIEW" || status === "DRAFT";
  const isRejectable = status !== "PUBLISHED" && status !== "REJECTED";
  const isApproved = status === "APPROVED";
  const isScheduled = status === "SCHEDULED";
  const isYouTube = platform === "YOUTUBE_SHORTS";
  const isReddit = platform === "REDDIT";
  const isTextPlatform = ["REDDIT", "LINKEDIN", "X"].includes(platform);
  // Text platforms have no auto-publisher yet — admin posts manually and records the URL
  const canMarkManuallyPublished =
    isTextPlatform && (isApproved || isScheduled);
  // Reddit is manual-only; YouTube needs a file upload — neither supports scheduling
  const canSchedule = isApproved && !isReddit && !isYouTube;

  async function callJson(action: string, body: object = {}) {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/social/drafts/${postId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Request failed");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  async function handleSchedule() {
    if (!scheduledAt) {
      setError("Pick a date and time first");
      return;
    }
    await callJson("schedule", {
      scheduledAt: new Date(scheduledAt).toISOString(),
    });
  }

  async function handleYouTubePublish() {
    const file = videoInputRef.current?.files?.[0];
    if (!file) {
      setError("Select a video file first");
      return;
    }
    setLoading("publish");
    setError(null);
    try {
      const form = new FormData();
      form.append("video", file);
      const res = await fetch(`/api/social/drafts/${postId}/publish`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Upload failed");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  async function handleMarkPublished() {
    if (!manualUrl) {
      setError("Paste the platform URL first");
      return;
    }
    await callJson("mark-published", { platformUrl: manualUrl });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {requiresReview && riskLevel === "HIGH" && (
        <p className="rounded bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          High-risk post — requires individual review. Bulk approval is not
          available.
        </p>
      )}

      {/* Approve / Reject */}
      {(isApprovable || isRejectable) && (
        <div className="flex gap-2">
          {isApprovable && (
            <button
              onClick={() => callJson("approve")}
              disabled={loading !== null}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading === "approve" ? "Approving…" : "Approve"}
            </button>
          )}
          {isRejectable && (
            <button
              onClick={() => callJson("reject")}
              disabled={loading !== null}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {loading === "reject" ? "Rejecting…" : "Reject"}
            </button>
          )}
        </div>
      )}

      {/* Schedule — not available for Reddit (manual-only) or YouTube (file upload needed) */}
      {canSchedule && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-semibold text-gray-600">Schedule</p>
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="rounded border px-2 py-1 text-sm"
            />
            <button
              onClick={handleSchedule}
              disabled={loading !== null}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading === "schedule" ? "Scheduling…" : "Schedule"}
            </button>
          </div>
        </div>
      )}

      {/* YouTube upload */}
      {isYouTube && isApproved && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-semibold text-gray-600">
            Publish to YouTube (private)
          </p>
          <p className="text-xs text-gray-500">
            Upload a user-created video file. Third-party YouTube footage is not
            permitted.
          </p>
          <div className="flex gap-2">
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="text-sm"
            />
            <button
              onClick={handleYouTubePublish}
              disabled={loading !== null}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading === "publish" ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>
      )}

      {/* Scheduled info note */}
      {isScheduled && (
        <p className="rounded bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
          This post is scheduled and will be processed by the daily cron at
          09:00 UTC. Text platform posts (Reddit, LinkedIn, X) do not have an
          auto-publisher yet — use the option below to post manually and record
          the URL.
        </p>
      )}

      {/* Record manually posted URL (text platforms only) */}
      {canMarkManuallyPublished && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-semibold text-gray-600">
            I&apos;ve posted this manually
          </p>
          <p className="text-xs text-gray-500">
            Copy the content above, post it on {platform.replace("_", " ")},
            then paste the link to the live post here to mark it as published.
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="Paste the post URL"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              className="flex-1 rounded border px-2 py-1 text-sm"
            />
            <button
              onClick={handleMarkPublished}
              disabled={loading !== null}
              className="rounded-md bg-gray-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
            >
              {loading === "mark-published" ? "Saving…" : "Mark published"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
