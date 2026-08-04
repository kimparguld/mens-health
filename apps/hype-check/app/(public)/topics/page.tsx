import { JsonLd, RiskBadge } from "@menhealth/ui";
import { createCanonicalUrl, createMetadata } from '@/lib/seo/site-metadata';
import { buildItemListSchema } from '@menhealth/core-seo';
import { TOPIC_SEEDS } from '@/lib/youtube/topics';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = createMetadata({
  title: "Men's Health Topics — MenHealth Digest",
  description:
    "Browse every men's health topic we track — testosterone, sleep, muscle gain, longevity, and more — each with evidence-checked video summaries and FAQs.",
  path: '/topics',
});

export default function TopicsIndexPage() {
  const itemListSchema = buildItemListSchema(
    "Men's Health Topics",
    TOPIC_SEEDS.map((topic) => ({
      name: topic.name,
      url: createCanonicalUrl(`/topics/${topic.slug}`),
    }))
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd schema={itemListSchema} />
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900">
        Topics
      </h1>
      <p className="mb-8 text-gray-600">
        Every men&apos;s health topic we track, each with evidence-checked video
        summaries, common myths, and frequently asked questions.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {TOPIC_SEEDS.map((topic) => (
          <li key={topic.slug}>
            <Link
              href={`/topics/${topic.slug}`}
              className="flex flex-col rounded-xl border border-gray-200 bg-white px-5 py-4 transition-colors hover:border-indigo-300"
            >
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-gray-900">
                  {topic.name}
                </span>
                {topic.isHighRisk && <RiskBadge level="HIGH" />}
              </div>
              <span className="mt-1 text-sm text-gray-500">
                {topic.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
