import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description:
    "Our affiliate disclosure policy in compliance with FTC endorsement guidelines.",
};

export default function AffiliateDisclosurePage() {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-12">
      <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900">
        Affiliate disclosure
      </h1>
      <p className="mb-8 text-lg leading-relaxed text-gray-600">
        MenHealth Digest is transparent about how we earn money from content on
        this site.
      </p>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">What this means</h2>
        <p>
          Some links on this site are affiliate links. This means that if you
          click a link and make a purchase, MenHealth Digest may earn a
          commission — at no additional cost to you.
        </p>
        <p>
          Affiliate links are always marked with a disclosure near the
          recommendation. We do not use hidden redirects or obscure affiliate
          relationships.
        </p>
      </section>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">
          Our editorial independence
        </h2>
        <p>
          Affiliate relationships do not influence our evidence ratings, claim
          analysis, or editorial summaries. We do not promote products in
          exchange for positive coverage, and we do not accept payment to rate
          claims favourably.
        </p>
        <p>We only include affiliate links for products that are:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Directly relevant to the topic being discussed</li>
          <li>
            From categories with a reasonable evidence base (e.g., creatine for
            muscle gain, not miracle supplements)
          </li>
          <li>
            Clearly identified as product recommendations, not editorial content
          </li>
        </ul>
      </section>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">
          Sponsored content
        </h2>
        <p>
          Occasionally, this site may feature sponsored placements from brands.
          These are clearly labelled as &ldquo;Sponsored&rdquo; and are separate
          from our editorial content. Sponsors do not have editorial control
          over summaries, evidence ratings, or any other non-sponsored content
          on this site.
        </p>
      </section>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">FTC compliance</h2>
        <p>
          This disclosure is provided in accordance with the U.S. Federal Trade
          Commission&apos;s guidelines on endorsements and testimonials in
          advertising (16 CFR Part 255). We disclose material connections
          between MenHealth Digest and any brands, products, or services
          featured or linked on this site.
        </p>
        <p>
          If you have questions about our affiliate relationships, please{" "}
          <a href="/contact" className="text-emerald-600 hover:underline">
            contact us
          </a>
          .
        </p>
      </section>
    </main>
  );
}
