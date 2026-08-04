import type { Metadata } from "next";
import { HowWeRateClaims } from "@menhealth/ui";
export const metadata: Metadata = {
  title: "How We Rate Evidence",
  description:
    "How Hype Check evaluates product, course, and investment claims and assigns evidence ratings to video content.",
};

export default function HowWeRateEvidencePage() {
  return (
    <main className="pb-16">
      <div className="mx-auto max-w-[720px] px-4 py-12">
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900">
          How we rate evidence
        </h1>
        <p className="mb-8 text-lg leading-relaxed text-gray-600">
          Not all hype is equal. Here is how we assess the claims made in the
          videos we summarise.
        </p>

        <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
          <h2 className="text-xl font-semibold text-gray-900">
            Why evidence ratings matter
          </h2>
          <p>
            A YouTube creator can state almost anything with confidence —
            &ldquo;guaranteed returns,&rdquo; &ldquo;this course changed my
            life,&rdquo; &ldquo;proven to work.&rdquo; Our job is to give you
            context: is this claim backed by solid, verifiable evidence,
            mixed results, or mostly anecdote and marketing? Without that
            context, it is hard to know what to trust.
          </p>
          <p>
            Every claim we extract from a video is assigned one of five
            evidence ratings. These ratings reflect our best reading of the
            available information at time of review, not a comprehensive
            audit. They are a starting point for your own thinking — not a
            substitute for professional financial, legal, or other advice.
          </p>
        </section>

        <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
          <h2 className="text-xl font-semibold text-gray-900">
            What we look at
          </h2>
          <p>When rating a claim, we consider:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Whether independent, verifiable evidence (disclosed results,
              audited numbers, a public track record) supports the claim
            </li>
            <li>
              Whether outcomes replicate across different users, rather than
              relying on a handful of hand-picked testimonials
            </li>
            <li>
              Whether relevant regulators or consumer-protection bodies
              (FTC, SEC, BBB, etc.) have flagged or taken action on the
              product, course, or company
            </li>
            <li>
              The recency and relevance of any data or figures cited by the
              creator
            </li>
            <li>
              Whether the claim is plausible given how the product, business
              model, or market actually works, or is implausible on its face
              (e.g., a &ldquo;guaranteed&rdquo; investment return)
            </li>
          </ul>
        </section>

        <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
          <h2 className="text-xl font-semibold text-gray-900">
            Our limitations
          </h2>
          <p>
            Our evidence ratings are AI-assisted, not produced by financial
            or legal professionals. For high-risk categories — investment
            apps, side hustles, online courses, giveaways, remote job
            offers — ratings go through an additional human review step
            before publishing.
          </p>
          <p>
            Markets and companies change quickly. A claim rated
            &ldquo;mixed&rdquo; today may be re-rated as
            &ldquo;strong&rdquo; (or &ldquo;not supported&rdquo;) in future
            updates. We aim to refresh ratings periodically, but we cannot
            guarantee every rating reflects the very latest information.
          </p>
          <p>
            If you believe a rating is wrong, please{" "}
            <a href="/contact" className="text-indigo-600 hover:underline">
              contact us
            </a>
            .
          </p>
        </section>
      </div>

      {/* Evidence label grid */}
      <HowWeRateClaims />
    </main>
  );
}
