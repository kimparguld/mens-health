'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

const JOB_STATUS_COLORS: Record<string, string> = {
  QUEUED: 'bg-yellow-100 text-yellow-800',
  RUNNING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

type Job = {
  id: string;
  status: string;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  sourceVideo: {
    id: string;
    subjectId: string;
    title: string | null;
    youtubeVideoId: string;
  } | null;
};

export function JobsTable({
  jobs,
  showCancelControls,
}: {
  jobs: Job[];
  showCancelControls: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const cancellableJobs = jobs.filter((j) => j.status === 'QUEUED');
  const allCancellableSelected =
    cancellableJobs.length > 0 &&
    cancellableJobs.every((j) => selected.has(j.id));

  function toggleSelectAll() {
    if (allCancellableSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(cancellableJobs.map((j) => j.id)));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function cancelSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/admin/jobs/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        setError('Failed to cancel jobs. Please try again.');
        return;
      }
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div>
      {showCancelControls && cancellableJobs.length > 0 && (
        <div className="mb-3 flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {selected.size} selected
          </span>
          <button
            onClick={cancelSelected}
            disabled={selected.size === 0 || isPending}
            className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
          >
            {isPending ? 'Cancelling…' : 'Cancel selected'}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {showCancelControls && (
                <th className="w-10 px-4 py-3">
                  {cancellableJobs.length > 0 && (
                    <input
                      type="checkbox"
                      checked={allCancellableSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all queued jobs"
                    />
                  )}
                </th>
              )}
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Video
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Created
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Started
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Completed
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Error
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.length === 0 ? (
              <tr>
                <td
                  colSpan={showCancelControls ? 7 : 6}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  No jobs found.
                </td>
              </tr>
            ) : (
              jobs.map((job) => {
                const isQueued = job.status === 'QUEUED';
                const isChecked = selected.has(job.id);
                return (
                  <tr
                    key={job.id}
                    className={`hover:bg-gray-50 ${isChecked ? 'bg-red-50' : ''}`}
                  >
                    {showCancelControls && (
                      <td className="px-4 py-3">
                        {isQueued && (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggle(job.id)}
                            aria-label={`Select job ${job.id}`}
                          />
                        )}
                      </td>
                    )}
                    <td className="max-w-xs truncate px-4 py-3">
                      {job.sourceVideo ? (
                        <Link
                          href={`/admin/videos/${job.sourceVideo.subjectId}`}
                          className="text-accent hover:underline"
                          title={job.sourceVideo.title ?? undefined}
                        >
                          {job.sourceVideo.title ??
                            job.sourceVideo.youtubeVideoId}
                        </Link>
                      ) : (
                        <span className="text-gray-400">Deleted video</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${JOB_STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {job.startedAt
                        ? new Date(job.startedAt).toLocaleString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {job.completedAt
                        ? new Date(job.completedAt).toLocaleString()
                        : '—'}
                    </td>
                    <td
                      className="max-w-xs truncate px-4 py-3 text-red-600"
                      title={job.errorMessage ?? undefined}
                    >
                      {job.errorMessage ?? '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
