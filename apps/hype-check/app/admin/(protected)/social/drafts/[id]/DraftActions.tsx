'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const SUBREDDIT_CHECKLIST = [
  'Post is valuable without any links',
  'Does not directly promote the site',
  'Follows subreddit rules (check sidebar)',
  'Discloses affiliation if linking',
  'Not duplicate of recent post',
];

type Props = {
  postId: string;
  platform: string;
  status: string;
  riskLevel: string;
  requiresReview: boolean;
  initialScheduledAt?: string | null;
  caption: string;
};

export default function DraftActions({
  postId,
  platform,
  status,
  riskLevel,
  requiresReview,
  initialScheduledAt,
  caption,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState(
    initialScheduledAt
      ? new Date(initialScheduledAt).toISOString().slice(0, 16)
      : ''
  );
  const [manualUrl, setManualUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [checklist, setChecklist] = useState<boolean[]>(
    SUBREDDIT_CHECKLIST.map(() => false)
  );

  const isApprovable = status === 'PENDING_REVIEW' || status === 'DRAFT' || status === 'FAILED';
  const isRejectable = status !== 'PUBLISHED' && status !== 'REJECTED';
  const isApproved = status === 'APPROVED';
  const isScheduled = status === 'SCHEDULED';
  const isX = platform === 'X';
  const isReddit = platform === 'REDDIT';
  // Only X has a working auto-publisher (via the scheduled cron). Everything
  // else — YouTube Community, Reddit, and TikTok — is always manual: copy
  // the text, post it yourself, then record the link here.
  const isManualPlatform =
    platform === 'YOUTUBE_COMMUNITY' || isReddit || platform === 'TIKTOK';
  const canMarkManuallyPublished =
    isManualPlatform && (isApproved || isScheduled);
  const canSchedule = isX && (isApproved || isScheduled);
  const allChecked = checklist.every(Boolean);
  const manualActionsBlocked = isReddit && !allChecked;

  async function callJson(action: string, body: object = {}) {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/social/drafts/${postId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Request failed');
      } else {
        router.refresh();
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(null);
    }
  }

  async function handleSchedule() {
    if (!scheduledAt) {
      setError('Pick a date and time (UTC) first');
      return;
    }
    // Treat the datetime-local value as UTC by appending Z
    await callJson('schedule', {
      scheduledAt: new Date(scheduledAt + 'Z').toISOString(),
    });
  }

  async function handleMarkPublished() {
    if (!manualUrl) {
      setError('Paste the platform URL first');
      return;
    }
    await callJson('mark-published', { platformUrl: manualUrl });
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function toggleCheck(i: number) {
    setChecklist((prev) => prev.map((v, j) => (j === i ? !v : v)));
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {requiresReview && riskLevel === 'HIGH' && (
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
              onClick={() => callJson('approve')}
              disabled={loading !== null}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading === 'approve' ? 'Approving…' : 'Approve'}
            </button>
          )}
          {isRejectable && (
            <button
              onClick={() => callJson('reject')}
              disabled={loading !== null}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {loading === 'reject' ? 'Rejecting…' : 'Reject'}
            </button>
          )}
        </div>
      )}

      {/* Schedule / Reschedule — X only, the one platform with a real auto-publisher */}
      {canSchedule && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-semibold text-gray-600">
            {isScheduled ? 'Reschedule' : 'Schedule'}
          </p>
          <p className="text-xs text-gray-500">
            This will be posted to X automatically at the scheduled time. All
            times are UTC.
          </p>
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
              className="bg-muted/60 hover:bg-muted/70 rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading === 'schedule'
                ? isScheduled
                  ? 'Rescheduling…'
                  : 'Scheduling…'
                : isScheduled
                  ? 'Reschedule'
                  : 'Schedule'}
            </button>
          </div>
        </div>
      )}

      {/* Scheduled info note — X only */}
      {isX && isScheduled && (
        <p className="text-muted/80 rounded bg-indigo-50 px-3 py-2 text-xs">
          This post is scheduled and will be posted to X automatically by the
          cron job once the scheduled time passes.
        </p>
      )}

      {/* Copy + manual publish (YouTube Community, Reddit) */}
      {isManualPlatform && (isApproved || isScheduled) && (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-xs font-semibold text-gray-600">
            Ready to paste — {platform.replace('_', ' ')} has no auto-publish
            API, post it yourself.
          </p>

          {isReddit && (
            <div>
              <p className="mb-1 text-xs font-semibold text-gray-500">
                Pre-post checklist
              </p>
              <ul className="space-y-1.5">
                {SUBREDDIT_CHECKLIST.map((item, i) => (
                  <li key={item} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      id={`check-${i}`}
                      checked={checklist[i]}
                      onChange={() => toggleCheck(i)}
                      className="text-muted/60 h-3.5 w-3.5 rounded border-gray-300"
                    />
                    <label htmlFor={`check-${i}`} className="text-gray-700">
                      {item}
                    </label>
                  </li>
                ))}
              </ul>
              {!allChecked && (
                <p className="mt-1 text-xs text-amber-700">
                  Complete the checklist before copying or posting.
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleCopy}
            disabled={manualActionsBlocked}
            className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied ? 'Copied!' : 'Copy draft to clipboard'}
          </button>

          {canMarkManuallyPublished && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs font-semibold text-gray-600">
                I&apos;ve posted this manually
              </p>
              <p className="text-xs text-gray-500">
                Once it&apos;s live, paste the link here to mark it as
                published.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Paste the post URL"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  disabled={manualActionsBlocked}
                  className="flex-1 rounded border px-2 py-1 text-sm disabled:opacity-40"
                />
                <button
                  onClick={handleMarkPublished}
                  disabled={loading !== null || manualActionsBlocked}
                  className="rounded-md bg-gray-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
                >
                  {loading === 'mark-published' ? 'Saving…' : 'Mark published'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
