import { DISCLAIMER_TEXT } from '@/lib/site-brand';
import { Disclaimer } from '@menhealth/ui';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Why Hype Check exists, what we do, and how we approach reviews of trending products, courses, and investment apps.',
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-12">
      <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900">
        About Hype Check
      </h1>
      <p className="mb-8 text-lg leading-relaxed text-gray-600">
        We help you cut through the hype around trending products, courses, and
        investment apps — without telling you what to buy.
      </p>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">Why we exist</h2>
        <p>
          YouTube is full of hype around trending products, courses, side
          hustles, and investment apps. Some of it is genuinely useful. A lot of
          it is oversimplified, sensationalised, or financially motivated by an
          affiliate link or a course sale. Distinguishing between the two takes
          time most people don&apos;t have.
        </p>
        <p>
          Hype Check was built to do that work for you. We scan trending videos,
          summarise the key claims in plain English, and label each one with an
          evidence rating — so you can quickly understand what the creator is
          arguing, how well-supported it is, and whether it&apos;s worth your
          time.
        </p>
        <p>
          We are not trying to tell you what to buy. We are trying to give you a
          clearer picture of what the evidence actually says.
        </p>
      </section>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">What we cover</h2>
        <p>
          We focus on categories where YouTube hype is particularly active and
          where the cost of a bad decision is high: side hustles, online courses
          and coaching programmes, viral products, investment and trading apps,
          giveaways and sweepstakes, marketplace apps, remote job offers, and
          more.
        </p>
        <p>
          For each category, we track the most-viewed and fastest-rising
          content, identify the core claims, and rate the quality of evidence
          behind them.
        </p>
      </section>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">How we work</h2>
        <p>
          Our pipeline uses AI-assisted summarisation to extract claims from
          videos and generate plain-English summaries. Every summary and claim
          rating is produced using large language models — but high-risk
          categories (investment apps, side hustles, online courses, and
          giveaways) require human review before publishing.
        </p>
        <p>
          We do not host, restream, or download YouTube videos. Every video
          embed on this site is an official YouTube player.
        </p>
        <p>
          Want to know more about how our evidence labels work?{' '}
          <a
            href="/how-we-rate-evidence"
            className="text-ink-muted/60 hover:underline"
          >
            Read our evidence rating guide →
          </a>
        </p>
      </section>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">Our commitments</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            We will never present AI-generated content as financial, legal, or
            professional advice.
          </li>
          <li>
            We will always include a disclaimer on content covering products,
            courses, or investment claims.
          </li>
          <li>
            We will always disclose affiliate relationships clearly and close to
            the relevant content.
          </li>
          <li>
            We will maintain a human review process for high-risk claims before
            they are published.
          </li>
        </ul>
      </section>

      <Disclaimer text={DISCLAIMER_TEXT} />
    </main>
  );
}
