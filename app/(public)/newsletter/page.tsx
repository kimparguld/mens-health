import { Metadata } from "next";
import { createMetadata } from "@/lib/seo/createMetadata";
import { NewsletterSignupForm } from "@/components/ui/NewsletterSignupForm";
import { Disclaimer } from "@/components/ui/Disclaimer";
import Link from "next/link";

export const metadata: Metadata = createMetadata({
  title: "The 5-Minute Men's Health Digest — Free Weekly Newsletter",
  description:
    "Get 5 trending men's health videos summarised, 3 claims checked against the evidence, and 1 practical takeaway — every week. No miracle cures.",
  path: "/newsletter",
});

const benefits = [
  {
    icon: "📺",
    title: "5 trending videos summarised",
    body: "We watch and summarise the week's biggest men's health videos so you don't have to.",
  },
  {
    icon: "🔬",
    title: "3 claims checked",
    body: "Popular claims are checked against available evidence — not just repeated.",
  },
  {
    icon: "✅",
    title: "1 practical takeaway",
    body: "One clear, evidence-aware action you can actually use.",
  },
  {
    icon: "🚫",
    title: "No miracle-cure nonsense",
    body: "High-risk claims are labelled. We tell you when the evidence is weak.",
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
        <div className="mx-auto max-w-sm">
          <NewsletterSignupForm />
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

      {/* Example digest section */}
      <section className="mb-12 rounded-xl border border-gray-200 bg-gray-50 px-6 py-6">
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          Example issue
        </h2>
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>This week&apos;s top claim:</strong> &ldquo;Sleep matters
            more than supplements for testosterone.&rdquo; — Evidence: moderate.
            What the data actually says…
          </p>
          <p>
            <strong>Trending video:</strong> Andrew Huberman on morning
            sunlight. Main claim, evidence level, practical takeaway.
          </p>
          <p>
            <strong>Practical takeaway:</strong> One concrete action from this
            week&apos;s best evidence.
          </p>
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
          Join readers who want clear, evidence-aware men's health content.
        </p>
        <div className="mx-auto max-w-sm">
          <NewsletterSignupForm />
        </div>
      </section>

      <Disclaimer className="mt-10" />
    </main>
  );
}
