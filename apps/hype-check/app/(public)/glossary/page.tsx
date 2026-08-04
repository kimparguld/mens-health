import type { Metadata } from "next";
import Link from "next/link";
import { GLOSSARY_TERMS } from "@/lib/seo/glossary";
import { TOPIC_SEEDS } from "@/lib/youtube/topics";
import { JsonLd, Disclaimer } from "@menhealth/ui";
import { buildBreadcrumbSchema, buildDefinedTermSetSchema } from "@menhealth/core-seo";
import { DISCLAIMER_TEXT } from "@/lib/site-brand";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.hype-check.net";

export const metadata: Metadata = {
  title: "Men's Health Glossary — Key Terms Explained",
  description:
    "Plain-English definitions for the hormones, lab markers, treatments, and training terms that come up across men's health content — testosterone, DHT, PSA, VO2 max, and more.",
  alternates: { canonical: `${APP_URL}/glossary` },
  openGraph: {
    title: "Men's Health Glossary — Key Terms Explained",
    description:
      "Plain-English definitions for the hormones, lab markers, treatments, and training terms that come up across men's health content.",
    url: `${APP_URL}/glossary`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Men's Health Glossary — Key Terms Explained",
  },
};

export default function GlossaryPage() {
  const sortedTerms = [...GLOSSARY_TERMS].sort((a, b) =>
    a.term.localeCompare(b.term),
  );

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: APP_URL },
    { name: "Glossary", url: `${APP_URL}/glossary` },
  ]);

  const definedTermSetSchema = buildDefinedTermSetSchema({
    name: "Men's Health Glossary",
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
        </Link>{" "}
        / <span className="text-gray-900">Glossary</span>
      </nav>

      <header className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900">
          Men&apos;s Health Glossary
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-gray-600">
          Plain-English definitions for the hormones, lab markers, medications,
          and training terms that come up again and again across men&apos;s
          health content — so you can follow a video summary without
          Googling every other word.
        </p>
      </header>

      <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sortedTerms.map((term) => (
          <Link
            key={term.slug}
            href={`/glossary/${term.slug}`}
            className="rounded-xl border border-gray-200 bg-white px-5 py-4 transition hover:border-indigo-300 hover:shadow-sm"
          >
            <h2 className="font-semibold text-gray-900">{term.term}</h2>
            <p className="mt-1 text-sm text-gray-600">
              {term.shortDefinition}
            </p>
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
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-indigo-300 hover:text-indigo-700"
            >
              {topic.name}
            </Link>
          ))}
        </div>
      </section>

      <Disclaimer text={DISCLAIMER_TEXT} />
    </main>
  );
}
