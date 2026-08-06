'use client';

import { useState } from 'react';

const FEATURES = [
  'Ad-free browsing across all topics',
  'Early access to AI-generated digests',
  'Deep-dive evidence summaries for every claim',
  'Weekly premium newsletter with curated picks',
  'Bookmark & track videos in your personal feed',
];

export default function UpgradePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data: { url?: string; error?: string } = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold tracking-wide text-blue-700 uppercase">
            Premium
          </span>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Go deeper on men&apos;s health
          </h1>
          <p className="mt-2 text-gray-500">
            Evidence-first content. No noise. Cancel anytime.
          </p>
        </div>

        <ul className="mb-8 space-y-3">
          {FEATURES.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-3 text-sm text-gray-700"
            >
              <span className="text-accent mt-0.5 flex-shrink-0">✓</span>
              {feature}
            </li>
          ))}
        </ul>

        <div className="mb-6 text-center">
          <span className="text-4xl font-bold text-gray-900">$9</span>
          <span className="text-gray-500"> / month</span>
        </div>

        {error && (
          <p className="mb-4 rounded bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Redirecting…' : 'Start premium — $9/mo'}
        </button>

        <p className="mt-4 text-center text-sm text-gray-400">
          Secure checkout via Stripe. You can cancel at any time.
        </p>
      </div>
    </main>
  );
}
