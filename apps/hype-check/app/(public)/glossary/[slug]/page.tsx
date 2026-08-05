import { RiskStamp } from '@/components/ui/RiskStamp';
import { GLOSSARY_TERMS, getGlossaryTerm } from '@/lib/seo/glossary';
import { DISCLAIMER_TEXT } from '@/lib/site-brand';
import { TOPIC_SEEDS } from '@/lib/youtube/topics';
import { buildDefinedTermSchema } from '@menhealth/core-seo';
import { Disclaimer, JsonLd, PageBreadcrumbs } from '@menhealth/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.hype-check.net';

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return GLOSSARY_TERMS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const term = getGlossaryTerm(slug);
  if (!term) return { title: 'Term Not Found' };

  const canonical = `${APP_URL}/glossary/${slug}`;
  const title = `What is ${term.term}? — Glossary`;

  return {
    title,
    description: term.longDefinition,
    alternates: { canonical },
    openGraph: {
      title,
      description: term.shortDefinition,
      url: canonical,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: term.shortDefinition,
    },
  };
}

export default async function GlossaryTermPage({ params }: { params: Params }) {
  const { slug } = await params;
  const term = getGlossaryTerm(slug);
  if (!term) notFound();

  const relatedTopics = TOPIC_SEEDS.filter((t) =>
    term.relatedTopicSlugs.includes(t.slug)
  );
  const isHighRiskTerm = relatedTopics.some((t) => t.isHighRisk);

  const otherTerms = GLOSSARY_TERMS.filter((t) => t.slug !== term.slug).slice(
    0,
    6
  );

  const definedTermSchema = buildDefinedTermSchema({
    name: term.term,
    description: term.longDefinition,
    url: `${APP_URL}/glossary/${slug}`,
    inDefinedTermSetUrl: `${APP_URL}/glossary`,
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <PageBreadcrumbs
        baseUrl={APP_URL}
        trail={[
          { label: 'Glossary', href: '/glossary' },
          { label: term.term, href: `/glossary/${slug}` },
        ]}
      />
      <JsonLd schema={definedTermSchema} />

      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          {isHighRiskTerm && <RiskStamp level="HIGH" />}
        </div>
        <h1 className="heading">{term.term}</h1>
        <p className="mt-4 text-lg leading-relaxed text-gray-600">
          {term.longDefinition}
        </p>
      </header>

      {relatedTopics.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Related topics
          </h2>
          <div className="flex flex-wrap gap-2">
            {relatedTopics.map((topic) => (
              <Link
                key={topic.slug}
                href={`/topics/${topic.slug}`}
                className="text-ink-muted border-ink-muted/20 hover:border-ink-muted/60 rounded-full border bg-white px-3 py-1.5 text-sm font-medium"
              >
                {topic.name} →
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Other terms
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {otherTerms.map((t) => (
            <Link
              key={t.slug}
              href={`/glossary/${t.slug}`}
              className="hover:text-ink-muted hover:border-ink-muted/30 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800"
            >
              {t.term}
            </Link>
          ))}
        </div>
        <Link
          href="/glossary"
          className="link text-ink-muted mt-3 inline-block text-sm font-medium hover:underline"
        >
          Browse the full glossary →
        </Link>
      </section>

      <Disclaimer
        text={DISCLAIMER_TEXT}
        className="border-gray-200 bg-white text-gray-500"
      />
    </main>
  );
}
