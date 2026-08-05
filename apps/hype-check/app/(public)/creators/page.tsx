import { createCanonicalUrl, createMetadata } from '@/lib/seo/site-metadata';
import { CREATOR_SEEDS } from '@/lib/youtube/creators';
import { buildItemListSchema } from '@menhealth/core-seo';
import { JsonLd, PageBreadcrumbs } from '@menhealth/ui';
import type { Metadata } from 'next';
import Link from 'next/link';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.hype-check.net';

export const metadata: Metadata = createMetadata({
  title: 'Video Creators',
  description:
    "Browse the top YouTube creators we track across trending products, courses, side hustles, and investment apps. Each creator's videos are summarised, scored, and checked for evidence quality.",
  path: '/creators',
});

export default function CreatorsIndexPage() {
  const itemListSchema = buildItemListSchema(
    'Hype Check Video Creators',
    CREATOR_SEEDS.map((creator) => ({
      name: creator.name,
      url: createCanonicalUrl(`/creators/${creator.slug}`),
    }))
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <PageBreadcrumbs
        baseUrl={APP_URL}
        trail={[{ label: 'Creators', href: '/creators' }]}
      />
      <JsonLd schema={itemListSchema} />
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900">
        Creators
      </h1>
      <p className="mb-8 text-gray-600">
        We track and analyse videos from these creators. Browse their top
        videos, summaries, and evidence ratings.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {CREATOR_SEEDS.map((creator) => (
          <li key={creator.slug}>
            <Link
              href={`/creators/${creator.slug}`}
              className="border-hairline hover:border-ink-muted flex flex-col rounded-md border bg-white px-5 py-4 transition-all"
            >
              <span className="text-base font-semibold text-gray-900">
                {creator.name}
              </span>
              {creator.credentials && (
                <span className="text-ink mt-0.5 text-sm font-medium">
                  {creator.credentials}
                </span>
              )}
              <span className="mt-1 text-sm text-gray-500">
                {creator.description}
              </span>
              <span className="mt-2 text-sm text-gray-400">
                {creator.specialty}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
