import { createMetadata } from '@/lib/seo/site-metadata';
import { DISCLAIMER_TEXT } from '@/lib/site-brand';
import { Disclaimer, NewsletterSignupForm } from '@menhealth/ui';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = createMetadata({
  title: 'The 5-Minute Hype Check Digest — Free Weekly Newsletter',
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
    <main className="mx-auto max-w-2xl px-4 py-16">
      {/* Hero */}
      <header className="mb-12 text-center">
        <p className="text-ink-muted mb-2 text-xs font-semibold tracking-widest uppercase">
          Free newsletter
        </p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900">
          The 5-Minute Hype Check Digest
        </h1>
        <p className="mx-auto mb-8 max-w-md text-lg text-gray-600">
          Every week: 5 trending picks summarised, 3 claims checked, 1 takeaway.
          No fluff. No fear-mongering. Unsubscribe any time.
        </p>
        <div className="mx-auto">
          <NewsletterSignupForm className="flex-col items-stretch" />
          <p className="mt-2 text-xs text-gray-400">
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

      {/* Sample issue preview */}
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          What a typical issue looks like
        </h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {/* Issue header */}
          <div className="border-ink-muted/10 border-b bg-indigo-50 px-6 py-4">
            <p className="text-ink-muted text-xs font-semibold tracking-widest uppercase">
              Sample issue · Week of 16 June 2025
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Hype check intel, without the noise.
            </p>
          </div>

          <div className="divide-y divide-gray-100 text-sm">
            {/* Top Video */}
            <div className="px-6 py-5">
              <p className="mb-2 text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                Top Video This Week
              </p>
              <p className="font-semibold text-gray-900">
                &ldquo;This AI Trading Bot Promises 40% Monthly Returns —
                Legit?&rdquo;
              </p>
              <p className="mt-1 text-gray-500">
                Wealth Hacks Daily · 2.4M views
              </p>
              <p className="mt-2 text-gray-700">
                Claims a proprietary algorithm consistently outperforms the
                market. Backtested results look strong; independent,
                live-account verification is limited.
              </p>
            </div>

            {/* 3 Claims Checked */}
            <div className="px-6 py-5">
              <p className="mb-3 text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                3 Claims Checked
              </p>
              <ul className="space-y-3">
                {[
                  {
                    claim:
                      'Diversified index funds outperform actively picked stocks over time.',
                    badge: 'Claim checked — strong evidence',
                    color: 'bg-ink-muted/10 text-ink-muted/80',
                  },
                  {
                    claim:
                      'This course guarantees a 6-figure income within 90 days.',
                    badge: 'Claim checked — weak evidence',
                    color: 'bg-orange-100 text-orange-800',
                  },
                  {
                    claim:
                      "This app's 'auto-invest' feature beats manual investing.",
                    badge: 'Claim checked — mixed / early',
                    color: 'bg-amber-100 text-amber-800',
                  },
                ].map((item) => (
                  <li
                    key={item.claim}
                    className="flex flex-wrap items-start gap-2"
                  >
                    <span
                      className={`mt-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${item.color}`}
                    >
                      {item.badge}
                    </span>
                    <span className="text-gray-700">
                      &ldquo;{item.claim}&rdquo;
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Practical Takeaway */}
            <div className="bg-indigo-50 px-6 py-5">
              <p className="text-ink-muted/60 mb-1 text-[11px] font-semibold tracking-widest uppercase">
                Practical Takeaway
              </p>
              <p className="text-ink-muted/90 font-medium">
                Start with a low-cost index fund before paying for any
                &ldquo;proprietary&rdquo; trading course. The evidence for
                boring, diversified investing is substantially stronger than for
                most marketed strategies.
              </p>
            </div>

            {/* Most Overhyped */}
            <div className="bg-red-50 px-6 py-5">
              <p className="mb-1 text-[11px] font-semibold tracking-widest text-red-600 uppercase">
                Most Overhyped Claim This Week
              </p>
              <p className="text-gray-700">
                &ldquo;This one course turned a broke college dropout into a
                millionaire in 6 months.&rdquo; —
                <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                  Claim checked — not supported
                </span>
              </p>
            </div>

            {/* Explore More */}
            <div className="px-6 py-5">
              <p className="mb-3 text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                Explore More
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <Link
                  href="/topics/investment-apps"
                  className="text-ink-muted hover:underline"
                >
                  Investment apps hub →
                </Link>
                <Link
                  href="/rankings/investment-apps"
                  className="text-ink-muted hover:underline"
                >
                  Weekly rankings →
                </Link>
                <Link href="/topics" className="text-gray-500 hover:underline">
                  All topics →
                </Link>
                <Link
                  href="/creators"
                  className="text-gray-500 hover:underline"
                >
                  All creators →
                </Link>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-gray-400">
          Sample only. Actual claims and evidence ratings are generated from
          real published videos and reviewed before sending.
        </p>
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
          <NewsletterSignupForm />
        </div>
      </section>

      <Disclaimer
        text={DISCLAIMER_TEXT}
        className="mt-10 border-gray-200 bg-white text-gray-500"
      />
    </main>
  );
}
