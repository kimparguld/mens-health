import { createCanonicalUrl, createMetadata } from '@/lib/seo/site-metadata';
import { TOPIC_SEEDS } from '@/lib/youtube/topics';
import { buildItemListSchema } from '@menhealth/core-seo';
import { JsonLd } from '@menhealth/ui';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = createMetadata({
  title: 'Weekly Video Rankings — Hype Check',
  description:
    'The top-ranked videos by topic this week — scored for evidence quality, trending reach, and practical value.',
  path: '/rankings',
});

export default function RankingsIndexPage() {
  const itemListSchema = buildItemListSchema(
    'Weekly Hype Check Video Rankings',
    TOPIC_SEEDS.map((topic) => ({
      name: topic.name,
      url: createCanonicalUrl(`/rankings/${topic.slug}`),
    }))
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd schema={itemListSchema} />
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900">
        Weekly Rankings
      </h1>
      <p className="mb-8 text-gray-600">
        Each week we score and rank the top videos by topic. Choose a topic to
        see this week&apos;s leaderboard.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {TOPIC_SEEDS.map((topic) => (
          <li key={topic.slug}>
            <Link
              href={`/rankings/${topic.slug}`}
              className="group border-hairline hover:border-ink-muted flex flex-col rounded-md border bg-white p-4 px-5 py-4 transition-colors"
            >
              <span className="text-base font-semibold text-gray-900">
                {topic.name}
              </span>
              <span className="mt-1 text-sm text-gray-500">
                {topic.description}
              </span>
              <p className="text-ink decoration-hairline group-hover:decoration-ink mt-3 text-xs font-medium underline underline-offset-4">
                Explore →
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
