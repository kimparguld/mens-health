import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editorial Process",
  description:
    "How MenHealth Digest finds, processes, and publishes men's health video summaries.",
};

export default function EditorialProcessPage() {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-12">
      <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900">
        Our editorial process
      </h1>
      <p className="mb-8 text-lg leading-relaxed text-gray-600">
        How a YouTube video goes from discovery to a published summary on
        MenHealth Digest.
      </p>

      <section className="mb-10 space-y-6 leading-relaxed text-gray-700">
        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            Step 1 — Discovery
          </h2>
          <p>
            We use the YouTube Data API v3 to search for trending content across
            16 men&apos;s health topics. Searches are run on a scheduled basis.
            We track videos from a curated list of channels known to cover these
            topics — ranging from academic researchers and clinicians to
            evidence-based fitness creators.
          </p>
          <p className="mt-2">
            Each video is scored on recency, view velocity, engagement, channel
            authority, and topical relevance. Only videos above a minimum
            threshold are processed further.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            Step 2 — AI summarisation
          </h2>
          <p>
            A large language model (Anthropic Claude) reads the video metadata,
            title, and description to produce:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>A short summary (2–3 sentences)</li>
            <li>A long summary (200–400 words)</li>
            <li>Key takeaways</li>
            <li>Warnings and caveats</li>
            <li>
              Extracted health claims, each rated for evidence and risk level
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            Step 3 — Human review (for high-risk topics)
          </h2>
          <p>
            Videos covering testosterone, mental health, supplements, fertility,
            prostate health, and erectile dysfunction do not publish
            automatically. They enter a review queue visible to our editorial
            team. A human reviewer checks the AI output for accuracy, flags
            overreaching claims, and either approves or rejects the summary
            before it goes live.
          </p>
          <p className="mt-2">
            All other topics are reviewed on a sampling basis.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            Step 4 — Publication
          </h2>
          <p>
            Approved summaries are published with the official YouTube embed,
            evidence ratings, takeaways, warnings, and the mandatory health
            disclaimer. We never download, modify, or rehost YouTube videos.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            Corrections policy
          </h2>
          <p>
            If you find a factual error in a summary or an incorrect evidence
            rating,{" "}
            <a href="/contact" className="text-emerald-600 hover:underline">
              please contact us
            </a>
            . We will review and correct the content as quickly as possible. We
            do not silently edit summaries — significant corrections are noted
            on the page.
          </p>
        </div>
      </section>
    </main>
  );
}
