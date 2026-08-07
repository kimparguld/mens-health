'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  packageId: string;
  status: string;
};

export default function VideoAdActions({ packageId, status }: Props) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canReview = status === 'PENDING_REVIEW';
  const canDownload = status === 'APPROVED';

  async function handleAction(action: 'approve' | 'reject') {
    setLoadingAction(action);
    setError(null);
    try {
      const response = await fetch(
        `/api/social/video-ads/${packageId}/${action}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? `Failed to ${action} package`);
        return;
      }

      router.refresh();
    } catch {
      setError(`Network error while trying to ${action} package`);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleGenerateAgain() {
    setLoadingAction('regenerate');
    setError(null);
    try {
      const response = await fetch('/api/social/video-ads/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as {
        packageId?: string;
        error?: string;
      };

      if (!response.ok || !payload.packageId) {
        setError(payload.error ?? 'Failed to generate a new package');
        return;
      }

      router.push(`/admin/social/video-ads/${payload.packageId}`);
      router.refresh();
    } catch {
      setError('Network error while generating a new package');
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {canReview && (
          <>
            <button
              type="button"
              onClick={() => handleAction('approve')}
              disabled={loadingAction !== null}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loadingAction === 'approve' ? 'Approving…' : 'Approve'}
            </button>
            <button
              type="button"
              onClick={() => handleAction('reject')}
              disabled={loadingAction !== null}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {loadingAction === 'reject' ? 'Rejecting…' : 'Reject'}
            </button>
          </>
        )}

        {canDownload && (
          <a
            href={`/api/social/video-ads/${packageId}/download`}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Download package zip
          </a>
        )}

        <button
          type="button"
          onClick={handleGenerateAgain}
          disabled={loadingAction !== null}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loadingAction === 'regenerate'
            ? 'Generating…'
            : 'Generate new package'}
        </button>
      </div>
    </div>
  );
}
