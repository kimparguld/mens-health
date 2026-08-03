'use client';

import { useState } from 'react';

type Status = 'idle' | 'loading' | 'success' | 'error';

type Props = {
  /** Compact layout: single-row with smaller input for sticky banners */
  compact?: boolean;
};

export function NewsletterSignupForm({ compact = false }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');

    const res = await fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = (await res.json()) as {
      ok?: boolean;
      alreadySubscribed?: boolean;
      error?: string;
    };

    if (!res.ok || !data.ok) {
      setStatus('error');
      setMessage(data.error ?? 'Something went wrong. Please try again.');
      return;
    }

    setStatus('success');
    setMessage(
      data.alreadySubscribed
        ? "You're already subscribed!"
        : "You're in! Check your inbox for the next digest."
    );
    setEmail('');
  }

  if (status === 'success') {
    return (
      <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
        {message}
      </p>
    );
  }

  const inputClass = compact
    ? 'flex-1 rounded border bg-white border-gray-800 px-2 py-1.5 text-xs text-black focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none disabled:opacity-50'
    : 'flex-1 rounded-lg border bg-white border-gray-800 px-4 py-2.5 text-sm text-black focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none disabled:opacity-50';

  const btnClass = compact
    ? 'rounded bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50'
    : 'rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50';

  return (
    <form onSubmit={handleSubmit} className="flex flex-row gap-2">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        disabled={status === 'loading'}
        className={inputClass}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className={btnClass}
      >
        {status === 'loading' ? '…' : 'Subscribe'}
      </button>
      {status === 'error' && (
        <p className="w-full text-xs text-red-600">{message}</p>
      )}
    </form>
  );
}
