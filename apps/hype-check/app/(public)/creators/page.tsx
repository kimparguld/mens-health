import type { Metadata } from "next";
import { createMetadata, createCanonicalUrl } from "@/lib/seo/site-metadata";
import { CREATOR_SEEDS } from "@/lib/youtube/creators";
import { JsonLd } from "@menhealth/ui";
import { buildItemListSchema } from "@menhealth/core-seo";
import Link from "next/link";

export const metadata: Metadata = createMetadata({
  title: "Men's Health Video Creators — MenHealth Digest",
  description:
    "Browse the top men's health YouTube creators we track. Each creator's videos are summarised, scored, and checked for evidence quality.",
  path: "/creators",
});

export default function CreatorsIndexPage() {
  const itemListSchema = buildItemListSchema(
    "Men's Health Video Creators",
    CREATOR_SEEDS.map((creator) => ({
      name: creator.name,
      url: createCanonicalUrl(`/creators/${creator.slug}`),
    })),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd schema={itemListSchema} />
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900">
        Creators
      </h1>
      <p className="mb-8 text-gray-600">
        We track and analyse videos from these men&apos;s health creators.
        Browse their top videos, summaries, and evidence ratings.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {CREATOR_SEEDS.map((creator) => (
          <li key={creator.slug}>
            <Link
              href={`/creators/${creator.slug}`}
              className="flex flex-col rounded-xl border border-gray-200 bg-white px-5 py-4 transition-colors hover:border-indigo-300"
            >
              <span className="text-base font-semibold text-gray-900">
                {creator.name}
              </span>
              {creator.credentials && (
                <span className="mt-0.5 text-xs font-medium text-indigo-700">
                  {creator.credentials}
                </span>
              )}
              <span className="mt-1 text-sm text-gray-500">
                {creator.description}
              </span>
              <span className="mt-2 text-xs text-gray-400">
                {creator.specialty}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
