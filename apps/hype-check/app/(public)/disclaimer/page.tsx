import { createMetadata } from '@/lib/seo/site-metadata';
import { DISCLAIMER_TEXT } from '@/lib/site-brand';
import { Disclaimer } from '@menhealth/ui';
import type { Metadata } from 'next';
export const metadata: Metadata = createMetadata({
  title: 'Disclaimer',
  description:
    'Important information about the nature of Hype Check content and its limitations.',
  path: '/disclaimer',
});

export default function DisclaimerPage() {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-12">
      <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900">
        Disclaimer
      </h1>
      <p className="mb-8 text-lg leading-relaxed text-gray-600">
        Please read this carefully before acting on any content you read here.
      </p>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">
          This is not financial, legal, or professional advice
        </h2>
        <p>
          Hype Check publishes summaries and verdicts (legit, misleading,
          overpriced, risky, or scam) on products, courses, side hustles,
          investment apps, and similar claims found in publicly available
          YouTube videos and other public sources, for informational and
          educational purposes only. Nothing on this website constitutes
          financial, legal, investment, or other professional advice.
        </p>
        <p>
          The claims, evidence reviews, and verdicts published on this site are
          generated with AI assistance and reviewed editorially. A verdict is
          our independent assessment based on available evidence at the time of
          review — it is not a guarantee, certification, or warranty about any
          product, company, or individual.
        </p>
      </section>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">
          Do your own research
        </h2>
        <p>
          Before making any purchase, investment, or business decision based on
          content discussed on this site, do your own research and, where
          appropriate, consult a qualified financial, legal, or other
          professional who can evaluate your individual circumstances.
        </p>
      </section>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">
          Accuracy and currency of information
        </h2>
        <p>
          Products, companies, and offers change quickly. Information on this
          site may become outdated. We make reasonable efforts to keep content
          current but cannot guarantee that every verdict reflects the latest
          state of a product or company. Verdicts are reviewed periodically but
          are not updated in real time.
        </p>
        <p>
          Hype Check is not responsible for any actions taken based on the
          content of this website, or for any consequences arising from reliance
          on information presented here.
        </p>
      </section>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">
          Third-party content
        </h2>
        <p>
          The videos embedded on this site are produced by third-party YouTube
          creators. Hype Check does not endorse the views, claims, or advice of
          any individual creator. Verdicts and evidence reviews represent our
          independent editorial assessment, not the creator&apos;s own
          statements.
        </p>
      </section>

      <Disclaimer
        text={DISCLAIMER_TEXT}
        className="border-gray-200 bg-white text-gray-500"
      />
    </main>
  );
}
