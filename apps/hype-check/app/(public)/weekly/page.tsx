import { createMetadata } from '@/lib/seo/site-metadata';
import { TOPIC_SEEDS } from '@/lib/youtube/topics';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = createMetadata({
  title: 'Weekly Trend Pages',
  description:
    'The top trending videos summarised each week by topic. Evidence labels, claim checks, practical takeaways.',
  path: '/weekly',
});

export default function WeeklyIndexPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900">
        Weekly Trend Pages
      </h1>
      <p className="mb-8 text-gray-600">
        Choose a topic to see the week&apos;s best videos, summarised and
        evidence-checked.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {TOPIC_SEEDS.map((topic) => (
          <li key={topic.slug}>
            <Link
              href={`/weekly/${topic.slug}`}
              className="group border-hairline hover:border-ink-muted flex flex-col rounded-md border bg-white p-4 px-5 py-4 transition-colors"
            >
              <span className="text-base font-semibold text-gray-900">
                Best {topic.name} videos this week
              </span>
              <span className="mt-1 text-sm text-gray-500">
                {topic.description}
              </span>
              <p className="text-ink decoration-hairline group-hover:decoration-ink mt-3 text-sm font-medium underline underline-offset-4">
                Read more →
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
