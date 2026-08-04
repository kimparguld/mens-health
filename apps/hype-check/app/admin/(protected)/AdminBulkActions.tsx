'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Action =
  'generate-all-summaries' | 'auto-publish-low-risk' | 'youtube-sync';

type LogLevel = 'info' | 'success' | 'error';

interface LogEntry {
  timestamp: Date;
  message: string;
  level: LogLevel;
}

const ACTION_LABELS: Record<Action, string> = {
  'generate-all-summaries': 'Generate summaries',
  'youtube-sync': 'Sync YouTube videos',
  'auto-publish-low-risk': 'Publish all low-risk videos',
};

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const LOG_COLORS: Record<LogLevel, string> = {
  info: 'text-gray-500',
  success: 'text-ink-muted/60',
  error: 'text-red-600',
};

export default function AdminBulkActions() {
  const router = useRouter();
  const [loading, setLoading] = useState<Action | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  function addLog(message: string, level: LogLevel = 'info') {
    setLog((prev) => [...prev, { timestamp: new Date(), message, level }]);
  }

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  async function runAction(action: Action) {
    setLoading(action);
    addLog(`Starting: ${ACTION_LABELS[action]}…`);

    const endpoint =
      action === 'youtube-sync'
        ? '/api/admin/youtube/sync'
        : `/api/admin/videos/${action}`;

    addLog(`POST ${endpoint}`);

    const res = await fetch(endpoint, { method: 'POST' });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      queued?: number;
      published?: number;
      processed?: number;
      failed?: number;
      message?: string;
      error?: string;
    } | null;

    if (!res.ok || !data?.ok) {
      addLog(`Error: ${data?.error ?? 'Request failed'}`, 'error');
    } else if (action === 'generate-all-summaries') {
      const msg =
        data.message ?? `Queued ${data.queued} video(s) for summary generation`;
      addLog(msg, 'success');
      if (data.processed !== undefined)
        addLog(`Processed: ${data.processed}, Failed: ${data.failed ?? 0}`);
    } else if (action === 'youtube-sync') {
      addLog(data.message ?? 'YouTube sync completed', 'success');
    } else {
      addLog(
        data.message ?? `Published ${data.published} low-risk video(s)`,
        'success'
      );
    }

    addLog('Done — page refreshed.');
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="mt-8 rounded-lg border bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">Bulk actions</h2>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => runAction('generate-all-summaries')}
          disabled={loading !== null}
          className="text-ink rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
        >
          {loading === 'generate-all-summaries'
            ? 'Generating…'
            : 'Generate summaries for all videos'}
        </button>
        <button
          onClick={() => runAction('youtube-sync')}
          disabled={loading !== null}
          className="rounded-lg border border-gray-400 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading === 'youtube-sync' ? 'Syncing…' : 'Sync YouTube videos'}
        </button>
        <button
          onClick={() => runAction('auto-publish-low-risk')}
          disabled={loading !== null}
          className="bg-ink-muted/60 hover:bg-ink-muted/70 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading === 'auto-publish-low-risk'
            ? 'Publishing…'
            : 'Publish all low-risk videos'}
        </button>
      </div>

      {log.length > 0 && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Activity log
            </span>
            <button
              onClick={() => setLog([])}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          </div>
          <div className="h-40 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-3 font-mono text-xs">
            {log.map((entry, i) => (
              <div key={i} className="flex gap-2">
                <span className="shrink-0 text-gray-400">
                  {formatTime(entry.timestamp)}
                </span>
                <span className={LOG_COLORS[entry.level]}>{entry.message}</span>
              </div>
            ))}
            {loading && (
              <div className="mt-1 flex gap-2">
                <span className="shrink-0 text-gray-400">
                  {formatTime(new Date())}
                </span>
                <span className="animate-pulse text-gray-400">
                  Waiting for server response…
                </span>
              </div>
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
