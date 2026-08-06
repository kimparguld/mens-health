'use client';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

type Status = 'idle' | 'loading' | 'success' | 'error';

type Props = {
  /** Compact layout: single-row with smaller input for sticky banners */
  compact?: boolean;
  className?: string;
  site?: string;
};

export function NewsletterSignupForm({ compact = false, className, site = 'menhealth' }: Props) {
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

  let successClass = 'bg-green-50 text-green-800';

  let inputClass =
    'flex-1 rounded-lg border bg-white border-gray-800 px-4 py-2.5 text-sm text-black focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none disabled:opacity-50';

  let btnClass =
    'rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50';

  if (site === 'hype-check') {
    successClass = 'bg-white text-accent';
    inputClass =
      'flex-1 rounded-lg border bg-white border-gray-800 px-4 py-2.5 text-sm text-black focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none disabled:opacity-50';
    btnClass =
      'rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/80 disabled:opacity-50';
  }

  if (status === 'success') {
    return <p className={twMerge('rounded-lg px-4 py-3 text-base', successClass)}>{message}</p>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={twMerge('flex lg:flex-row flex-col gap-2 lg:items-center items-stretch', className)}
    >
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
        className={twMerge(inputClass, compact ? 'rounded px-2 py-1.5 text-xs' : '')}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className={twMerge(btnClass, compact ? 'rounded px-3 py-1.5 text-xs' : '')}
      >
        {status === 'loading' ? '…' : 'Subscribe'}
      </button>
      {status === 'error' && <p className="w-full text-xs text-red-600">{message}</p>}
    </form>
  );
}
