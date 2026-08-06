'use client';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

type Status = 'idle' | 'loading' | 'success' | 'error';

type Props = {
  /** Compact layout: single-row with smaller input for sticky banners */
  compact?: boolean;
  className?: string;
};

export function NewsletterSignupForm({ compact = false, className }: Props) {
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
      data.alreadySubscribed ? "You're already subscribed!" : "You're in! Check your inbox for the next digest.",
    );
    setEmail('');
  }

  if (status === 'success') {
    return <p className="bg-success-bg text-success-text rounded-lg px-4 py-3 text-base">{message}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className={twMerge('flex flex-row gap-2 items-center', className)}>
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
        className={twMerge(
          'bg-bg-surface border-text-primary text-text-primary focus:border-text-primary focus:ring-text-primary flex-1 rounded-lg border px-4 py-2.5 text-sm focus:ring-1 focus:outline-none disabled:opacity-50',
          compact ? 'rounded px-2 py-1.5 text-xs' : '',
        )}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className={twMerge(
          'bg-accent rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-50',
          compact ? 'rounded px-3 py-1.5 text-xs' : '',
        )}
      >
        {status === 'loading' ? '…' : 'Subscribe'}
      </button>
      {status === 'error' && <p className="w-full text-xs text-error-text">{message}</p>}
    </form>
  );
}
