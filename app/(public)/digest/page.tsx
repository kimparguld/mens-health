import { Metadata } from "next";
import { NewsletterSignupForm } from "@/components/ui/NewsletterSignupForm";
import { Disclaimer } from "@/components/ui/Disclaimer";

export const metadata: Metadata = {
  title: "Weekly Newsletter — MenHealth Digest",
  description:
    "Get the top men's health videos of the week delivered to your inbox — ranked, summarised, and fact-checked.",
  openGraph: {
    title: "Weekly Newsletter — MenHealth Digest",
    description:
      "Get the top men's health videos of the week delivered to your inbox.",
    type: "website",
  },
};

const SAMPLE_TOPICS = [
  "Testosterone & hormones",
  "Strength & muscle",
  "Sleep & recovery",
  "Mental health",
  "Nutrition & supplements",
  "Longevity",
];

export default function DigestPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      {/* Hero */}
      <div className="mb-10 text-center">
        <span className="mb-4 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold tracking-widest text-gray-600 uppercase">
          Free weekly newsletter
        </span>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900">
          Men&apos;s health intel,{" "}
          <span className="text-blue-600">without the noise</span>
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Every Thursday we pick the 5 best men&apos;s health videos of the
          week, summarise the key takeaways, and flag any questionable claims —
          so you get the signal, not the hype.
        </p>
      </div>

      {/* Sign-up card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">
          Join the digest
        </h2>
        <p className="mb-5 text-sm text-gray-500">
          Free. No spam. Unsubscribe any time.
        </p>
        <NewsletterSignupForm />
      </div>

      {/* What's inside */}
      <section className="mt-12">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          What&apos;s inside each issue
        </h2>
        <ul className="space-y-3 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-blue-500">✓</span>
            <span>
              <strong>Top 5 videos</strong> ranked by relevance, quality, and
              engagement — not just view count
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-blue-500">✓</span>
            <span>
              <strong>AI-generated summaries</strong> with key takeaways and
              actionable points
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-blue-500">✓</span>
            <span>
              <strong>Claim flags</strong> — high-risk or unsubstantiated health
              claims are highlighted
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-blue-500">✓</span>
            <span>
              <strong>Topic coverage:</strong> {SAMPLE_TOPICS.join(", ")}
            </span>
          </li>
        </ul>
      </section>

      <div className="mt-10">
        <Disclaimer />
      </div>
    </main>
  );
}
