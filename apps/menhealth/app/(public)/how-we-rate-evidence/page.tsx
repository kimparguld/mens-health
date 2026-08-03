import type { Metadata } from "next";
import { HowWeRateClaims } from "@menhealth/ui";
export const metadata: Metadata = {
  title: "How We Rate Evidence",
  description:
    "How MenHealth Digest evaluates health claims and assigns evidence ratings to video content.",
};

export default function HowWeRateEvidencePage() {
  return (
    <main className="pb-16">
      <div className="mx-auto max-w-[720px] px-4 py-12">
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900">
          How we rate evidence
        </h1>
        <p className="mb-8 text-lg leading-relaxed text-gray-600">
          Not all health claims are equal. Here is how we assess the claims made
          in the videos we summarise.
        </p>

        <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
          <h2 className="text-xl font-semibold text-gray-900">
            Why evidence ratings matter
          </h2>
          <p>
            A YouTube creator can state almost anything with confidence. Our job
            is to give you context: is this claim backed by solid science, mixed
            findings, or mostly anecdote? Without that context, it is hard to
            know what to act on.
          </p>
          <p>
            Every claim we extract from a video is assigned one of five evidence
            ratings. These ratings reflect our best reading of the available
            literature at time of review, not a comprehensive systematic review.
            They are a starting point for your own thinking — not a substitute
            for professional medical advice.
          </p>
        </section>

        <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
          <h2 className="text-xl font-semibold text-gray-900">
            What we look at
          </h2>
          <p>When rating a claim, we consider:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Whether multiple high-quality randomised controlled trials (RCTs)
              or meta-analyses support the claim
            </li>
            <li>
              Whether findings replicate across different populations and study
              designs
            </li>
            <li>
              Whether clinical guidelines from major health bodies (NHS, AHA,
              ADA, etc.) endorse the claim
            </li>
            <li>
              The recency and relevance of the studies cited (if any) by the
              creator
            </li>
            <li>
              Whether the claim has plausible biological mechanisms or is
              implausible based on current understanding
            </li>
          </ul>
        </section>

        <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
          <h2 className="text-xl font-semibold text-gray-900">
            Our limitations
          </h2>
          <p>
            Our evidence ratings are AI-assisted, not produced by clinicians.
            For high-risk topics — testosterone, mental health, supplements,
            fertility, prostate health, erectile dysfunction — ratings go
            through an additional human review step before publishing.
          </p>
          <p>
            Science evolves. A claim rated &ldquo;mixed&rdquo; today may be
            re-rated as &ldquo;strong&rdquo; (or &ldquo;not supported&rdquo;) in
            future updates. We aim to refresh ratings periodically, but we
            cannot guarantee every rating reflects the very latest research.
          </p>
          <p>
            If you believe a rating is wrong, please{" "}
            <a href="/contact" className="text-emerald-600 hover:underline">
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
