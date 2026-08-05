import { createMetadata } from '@/lib/seo/site-metadata';
import { DISCLAIMER_TEXT } from '@/lib/site-brand';
import {
  Disclaimer,
  NewsletterSignupForm,
  PageBreadcrumbs,
} from '@menhealth/ui';
import type { Metadata } from 'next';
import Link from 'next/link';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.hype-check.net';

export const metadata: Metadata = createMetadata({
  title: 'The 5-Minute Digest — Free Weekly Newsletter',
  description:
    'Get 5 trending products, courses, and side hustles summarised, 3 claims checked against the evidence, and 1 practical takeaway — every week. No miracle-earnings nonsense.',
  path: '/newsletter',
});

const benefits = [
  {
    icon: '📺',
    title: '5 trending picks summarised',
    body: "We review the week's biggest trending products, courses, and side hustles so you don't have to.",
  },
  {
    icon: '🔬',
    title: '3 claims checked',
    body: 'Popular claims are checked against available evidence — not just repeated.',
  },
  {
    icon: '✅',
    title: '1 practical takeaway',
    body: 'One clear, evidence-aware action you can actually use.',
  },
  {
    icon: '🚫',
    title: 'No miracle-earnings nonsense',
    body: 'Risky and scam-adjacent claims are labelled. We tell you when the evidence is weak.',
  },
];

export default function NewsletterPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <PageBreadcrumbs
        baseUrl={APP_URL}
        trail={[{ label: 'Newsletter', href: '/newsletter' }]}
      />
      {/* Hero */}
      <header className="mb-12 text-center">
        <p className="text-ink-muted mb-2 text-sm font-semibold tracking-widest uppercase">
          Free newsletter
        </p>
        <h1 className="heading">The 5-Minute Hype Check Digest</h1>
        <p className="mx-auto mb-8 max-w-md text-lg text-gray-600">
          Every week: 5 trending picks summarised, 3 claims checked, 1 takeaway.
          No fluff. No fear-mongering. Unsubscribe any time.
        </p>
        <div className="mx-auto">
          <NewsletterSignupForm
            className="flex-col items-stretch"
            site="hype-check"
          />
          <p className="mt-2 text-sm text-gray-400">
            Free forever. Unsubscribe any time.
          </p>
        </div>
      </header>

      {/* Benefits */}
      <section className="mb-12">
        <h2 className="mb-6 text-center text-xl font-bold text-gray-900">
          What you get every week
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {benefits.map((b) => (
            <li
              key={b.title}
              className="rounded-xl border border-gray-200 bg-white px-5 py-4"
            >
              <span className="text-2xl" aria-hidden="true">
                {b.icon}
              </span>
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                {b.title}
              </h3>
              <p className="mt-1 text-sm text-gray-500">{b.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Explore links */}
      <section className="mb-12">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          Browse while you wait for the next issue
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              href: '/topics',
              title: 'Topic Hubs',
              desc: 'Deep dives into investment apps, side hustles, courses, and more.',
            },
            {
              href: '/rankings',
              title: 'Weekly Rankings',
              desc: 'Top-ranked trending products and courses scored by evidence quality.',
            },
            {
              href: '/creators',
              title: 'Creators',
              desc: 'See which channels we cover and their claim track record.',
            },
            {
              href: '/weekly/investment-apps',
              title: "This Week's Picks",
              desc: 'Top videos, claims checked, and a practical takeaway.',
            },
            {
              href: '/newsletter/archive',
              title: 'Newsletter Archive',
              desc: 'Every past issue, published as a permanent page.',
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group border-hairline hover:border-ink-muted flex flex-col rounded-md border bg-white p-4 px-5 py-4 transition-colors"
            >
              <p className="font-semibold text-gray-900">{item.title} →</p>
              <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust block */}
      <section className="mb-12 text-center">
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          We take evidence seriously
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          Risky and scam-adjacent claims are labelled and reviewed before
          publishing. AI summaries are editorial aids, not financial or legal
          advice.
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
          <Link href="/disclaimer" className="underline hover:text-gray-900">
            Disclaimer
          </Link>
          <Link
            href="/editorial-process"
            className="underline hover:text-gray-900"
          >
            How we review content
          </Link>
          <Link
            href="/how-we-rate-evidence"
            className="underline hover:text-gray-900"
          >
            How we rate evidence
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-hairline bg-ink-muted rounded-xl border px-6 py-8 text-center">
        <h2 className="mb-2 text-xl font-bold text-white">
          Ready to get the digest?
        </h2>
        <p className="mb-6 text-sm text-white/60">
          Join readers who want clear, evidence-aware verdicts on trending hype.
        </p>
        <div className="mx-auto max-w-sm">
          <NewsletterSignupForm site="hype-check" />
        </div>
      </section>

      <Disclaimer
        text={DISCLAIMER_TEXT}
        className="mt-10 border-gray-200 bg-white text-gray-500"
      />
    </main>
  );
}
