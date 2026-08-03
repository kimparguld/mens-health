import { createMetadata } from '@/lib/seo/site-metadata';
import { Disclaimer, NewsletterSignupForm } from '@menhealth/ui';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = createMetadata({
  title: "The 5-Minute Men's Health Digest — Free Weekly Newsletter",
  description:
    "Get 5 trending men's health videos summarised, 3 claims checked against the evidence, and 1 practical takeaway — every week. No miracle cures.",
  path: '/newsletter',
});

const benefits = [
  {
    icon: '📺',
    title: '5 trending videos summarised',
    body: "We watch and summarise the week's biggest men's health videos so you don't have to.",
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
    title: 'No miracle-cure nonsense',
    body: 'High-risk claims are labelled. We tell you when the evidence is weak.',
  },
];

export default function NewsletterPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      {/* Hero */}
      <header className="mb-12 text-center">
        <p className="mb-2 text-xs font-semibold tracking-widest text-emerald-700 uppercase">
          Free newsletter
        </p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900">
          The 5-Minute Men&apos;s Health Digest
        </h1>
        <p className="mx-auto mb-8 max-w-md text-lg text-gray-600">
          Every week: 5 videos summarised, 3 claims checked, 1 takeaway. No
          hype. No fear-mongering. Unsubscribe any time.
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
          <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-4">
            <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase">
              Sample issue · Week of 16 June 2025
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Men&apos;s health intel, without the noise.
            </p>
          </div>

          <div className="divide-y divide-gray-100 text-sm">
            {/* Top Video */}
            <div className="px-6 py-5">
              <p className="mb-2 text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                Top Video This Week
              </p>
              <p className="font-semibold text-gray-900">
                &ldquo;Morning Sunlight for Testosterone — Does It Actually
                Work?&rdquo;
              </p>
              <p className="mt-1 text-gray-500">
                Andrew Huberman Lab · 2.4M views
              </p>
              <p className="mt-2 text-gray-700">
                Claims morning light exposure boosts testosterone via cortisol
                rhythm. Mechanistic plausibility is solid; direct RCT evidence
                in humans is limited.
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
                      'Sleep matters more than supplements for testosterone.',
                    badge: 'Claim checked — strong evidence',
                    color: 'bg-emerald-100 text-emerald-800',
                  },
                  {
                    claim:
                      'Cold showers significantly raise testosterone levels.',
                    badge: 'Claim checked — weak evidence',
                    color: 'bg-orange-100 text-orange-800',
                  },
                  {
                    claim: 'Creatine accelerates hair loss in young men.',
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
            <div className="bg-emerald-50 px-6 py-5">
              <p className="mb-1 text-[11px] font-semibold tracking-widest text-emerald-600 uppercase">
                Practical Takeaway
              </p>
              <p className="font-medium text-emerald-900">
                Prioritise 7–9 hours of sleep before adding any supplement
                stack. The evidence for sleep is substantially stronger than for
                most marketed testosterone boosters.
              </p>
            </div>

            {/* Most Overhyped */}
            <div className="bg-red-50 px-6 py-5">
              <p className="mb-1 text-[11px] font-semibold tracking-widest text-red-600 uppercase">
                Most Overhyped Claim This Week
              </p>
              <p className="text-gray-700">
                &ldquo;This one herb doubled testosterone in 30 days.&rdquo; —
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
                  href="/topics/testosterone"
                  className="text-emerald-700 hover:underline"
                >
                  Testosterone hub →
                </Link>
                <Link
                  href="/rankings/testosterone"
                  className="text-emerald-700 hover:underline"
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
              desc: 'Deep dives into testosterone, sleep, longevity, and more.',
            },
            {
              href: '/rankings',
              title: 'Weekly Rankings',
              desc: "Top-ranked men's health videos scored by evidence quality.",
            },
            {
              href: '/creators',
              title: 'Creators',
              desc: 'See which channels we cover and their claim track record.',
            },
            {
              href: '/weekly/testosterone',
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
              className="rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-emerald-300 hover:shadow-sm"
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
          We take health content seriously
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          High-risk claims are labelled and reviewed before publishing. AI
          summaries are editorial aids, not medical advice.
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
          <Link
            href="/medical-disclaimer"
            className="underline hover:text-gray-900"
          >
            Medical disclaimer
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
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
        <h2 className="mb-2 text-xl font-bold text-emerald-900">
          Ready to get the digest?
        </h2>
        <p className="mb-6 text-sm text-emerald-700">
          Join readers who want clear, evidence-aware men&apos;s health content.
        </p>
        <div className="mx-auto max-w-sm">
          <NewsletterSignupForm />
        </div>
      </section>

      <Disclaimer className="mt-10" />
    </main>
  );
}
