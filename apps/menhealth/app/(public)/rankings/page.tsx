import type { Metadata } from "next";
import { createMetadata, createCanonicalUrl } from "@/lib/seo/site-metadata";
import { TOPIC_SEEDS } from "@/lib/youtube/topics";
import { JsonLd } from "@menhealth/ui";
import { buildItemListSchema } from "@menhealth/core-seo";
import Link from "next/link";

export const metadata: Metadata = createMetadata({
  title: "Weekly Men's Health Video Rankings — MenHealth Digest",
  description:
    "The top-ranked men's health videos by topic this week — scored for evidence quality, trending reach, and practical value.",
  path: "/rankings",
});

export default function RankingsIndexPage() {
  const itemListSchema = buildItemListSchema(
    "Weekly Men's Health Video Rankings",
    TOPIC_SEEDS.map((topic) => ({
      name: topic.name,
      url: createCanonicalUrl(`/rankings/${topic.slug}`),
    })),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd schema={itemListSchema} />
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900">
        Weekly Rankings
      </h1>
      <p className="mb-8 text-gray-600">
        Each week we score and rank the top men&apos;s health videos by topic.
        Choose a topic to see this week&apos;s leaderboard.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {TOPIC_SEEDS.map((topic) => (
          <li key={topic.slug}>
            <Link
              href={`/rankings/${topic.slug}`}
              className="flex flex-col rounded-xl border border-gray-200 bg-white px-5 py-4 transition-colors hover:border-emerald-300"
            >
              <span className="text-base font-semibold text-gray-900">
                {topic.name}
              </span>
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
