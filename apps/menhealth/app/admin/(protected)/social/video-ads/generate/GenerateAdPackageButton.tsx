'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function GenerateAdPackageButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
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
        setError(payload.error ?? 'Failed to generate ad package');
        return;
      }

      router.push(`/admin/social/video-ads/${payload.packageId}`);
      router.refresh();
    } catch {
      setError('Network error while generating ad package');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? 'Generating…' : 'Generate ad package'}
      </button>
    </div>
  );
}
