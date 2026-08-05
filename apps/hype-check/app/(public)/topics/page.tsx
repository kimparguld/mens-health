import { RiskStamp } from '@/components/ui/RiskStamp';
import { createCanonicalUrl, createMetadata } from '@/lib/seo/site-metadata';
import { TOPIC_SEEDS } from '@/lib/youtube/topics';
import { buildItemListSchema } from '@menhealth/core-seo';
import { JsonLd, PageBreadcrumbs } from '@menhealth/ui';
import type { Metadata } from 'next';
import Link from 'next/link';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.hype-check.net';

export const metadata: Metadata = createMetadata({
  title: 'Topics',
  description:
    'Browse every topic we track — AI tools, side hustles, online courses, viral products, investment apps, and more — each with evidence-checked video summaries and FAQs.',
  path: '/topics',
});

export default function TopicsIndexPage() {
  const itemListSchema = buildItemListSchema(
    'Hype Check Topics',
    TOPIC_SEEDS.map((topic) => ({
      name: topic.name,
      url: createCanonicalUrl(`/topics/${topic.slug}`),
    }))
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <PageBreadcrumbs
        baseUrl={APP_URL}
        trail={[{ label: 'Topics', href: '/topics' }]}
      />
      <JsonLd schema={itemListSchema} />
      <h1 className="heading">Topics</h1>
      <p className="mb-8 text-gray-600">
        Every topic we track, each with evidence-checked video summaries, common
        myths, and frequently asked questions.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {TOPIC_SEEDS.map((topic) => (
          <li key={topic.slug}>
            <Link
              href={`/topics/${topic.slug}`}
              className="group border-hairline hover:border-ink-muted flex flex-col rounded-md border bg-white p-4 px-5 py-4 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-gray-900">
                  {topic.name}
                </span>
                {topic.isHighRisk && <RiskStamp level="HIGH" />}
              </div>
              <span className="mt-1 text-sm text-gray-500">
                {topic.description}
              </span>
              <p className="text-ink decoration-hairline group-hover:decoration-ink mt-3 text-sm font-medium underline underline-offset-4">
                Explore →
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
