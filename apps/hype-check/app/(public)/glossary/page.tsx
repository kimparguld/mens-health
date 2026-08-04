import { GLOSSARY_TERMS } from '@/lib/seo/glossary';
import { DISCLAIMER_TEXT } from '@/lib/site-brand';
import { TOPIC_SEEDS } from '@/lib/youtube/topics';
import {
  buildBreadcrumbSchema,
  buildDefinedTermSetSchema,
} from '@menhealth/core-seo';
import { Disclaimer, JsonLd } from '@menhealth/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.hype-check.net';

export const metadata: Metadata = {
  title: 'Hype Check Glossary — Key Terms Explained',
  description:
    'Plain-English definitions for the terms that come up across trending products, courses, side hustles, and investment apps — evidence score, risk level, guaranteed returns, and more.',
  alternates: { canonical: `${APP_URL}/glossary` },
  openGraph: {
    title: 'Hype Check Glossary — Key Terms Explained',
    description:
      'Plain-English definitions for the terms that come up across trending products, courses, side hustles, and investment apps.',
    url: `${APP_URL}/glossary`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hype Check Glossary — Key Terms Explained',
  },
};

export default function GlossaryPage() {
  const sortedTerms = [...GLOSSARY_TERMS].sort((a, b) =>
    a.term.localeCompare(b.term)
  );

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: APP_URL },
    { name: 'Glossary', url: `${APP_URL}/glossary` },
  ]);

  const definedTermSetSchema = buildDefinedTermSetSchema({
    name: 'Hype Check Glossary',
    url: `${APP_URL}/glossary`,
    terms: sortedTerms.map((t) => ({
      name: t.term,
      description: t.shortDefinition,
      url: `${APP_URL}/glossary/${t.slug}`,
    })),
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <JsonLd schema={[breadcrumbSchema, definedTermSetSchema]} />

      <nav className="mb-3 text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:underline">
          Home
        </Link>{' '}
        / <span className="text-gray-900">Glossary</span>
      </nav>

      <header className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900">
          Hype Check Glossary
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-gray-600">
          Plain-English definitions for the evidence, risk, and marketing terms
          that come up again and again across the videos we review — so you can
          follow a video summary without Googling every other word.
        </p>
      </header>

      <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sortedTerms.map((term) => (
          <Link
            key={term.slug}
            href={`/glossary/${term.slug}`}
            className="hover:border-ink-muted/30 rounded-xl border border-gray-200 bg-white px-5 py-4 transition hover:shadow-sm"
          >
            <h2 className="font-semibold text-gray-900">{term.term}</h2>
            <p className="mt-1 text-sm text-gray-600">{term.shortDefinition}</p>
          </Link>
        ))}
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Browse by topic
        </h2>
        <div className="flex flex-wrap gap-2">
          {TOPIC_SEEDS.map((topic) => (
            <Link
              key={topic.slug}
              href={`/topics/${topic.slug}`}
              className="hover:text-ink-muted hover:border-ink-muted/30 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
            >
              {topic.name}
            </Link>
          ))}
        </div>
      </section>

      <Disclaimer
        text={DISCLAIMER_TEXT}
        className="border-gray-200 bg-white text-gray-500"
      />
    </main>
  );
}
