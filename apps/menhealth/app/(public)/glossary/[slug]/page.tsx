import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { GLOSSARY_TERMS, getGlossaryTerm } from "@/lib/seo/glossary";
import { TOPIC_SEEDS } from "@/lib/youtube/topics";
import { JsonLd, Disclaimer, RiskBadge } from "@menhealth/ui";
import { buildBreadcrumbSchema, buildDefinedTermSchema } from "@menhealth/core-seo";
import { MEDICAL_DISCLAIMER_TEXT } from "@/lib/site-brand";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.menhealth-digest.com";

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
  if (!term) return { title: "Term Not Found" };

  const canonical = `${APP_URL}/glossary/${slug}`;
  const title = `What is ${term.term}? — Men's Health Glossary`;

  return {
    title,
    description: term.longDefinition,
    alternates: { canonical },
    openGraph: {
      title,
      description: term.shortDefinition,
      url: canonical,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: term.shortDefinition,
    },
  };
}

export default async function GlossaryTermPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const term = getGlossaryTerm(slug);
  if (!term) notFound();

  const relatedTopics = TOPIC_SEEDS.filter((t) =>
    term.relatedTopicSlugs.includes(t.slug),
  );
  const isHighRiskTerm = relatedTopics.some((t) => t.isHighRisk);

  const otherTerms = GLOSSARY_TERMS.filter((t) => t.slug !== term.slug).slice(
    0,
    6,
  );

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: APP_URL },
    { name: "Glossary", url: `${APP_URL}/glossary` },
    { name: term.term, url: `${APP_URL}/glossary/${slug}` },
  ]);

  const definedTermSchema = buildDefinedTermSchema({
    name: term.term,
    description: term.longDefinition,
    url: `${APP_URL}/glossary/${slug}`,
    inDefinedTermSetUrl: `${APP_URL}/glossary`,
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd schema={[breadcrumbSchema, definedTermSchema]} />

      <nav className="mb-3 text-sm text-gray-700" aria-label="Breadcrumb">
        <Link href="/" className="hover:underline">
          Home
        </Link>{" "}
        /{" "}
        <Link href="/glossary" className="hover:underline">
          Glossary
        </Link>{" "}
        / <span className="text-gray-900">{term.term}</span>
      </nav>

      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          {isHighRiskTerm && <RiskBadge level="HIGH" />}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          {term.term}
        </h1>
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
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
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
              className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 hover:border-emerald-300 hover:text-emerald-700"
            >
              {t.term}
            </Link>
          ))}
        </div>
        <Link
          href="/glossary"
          className="mt-3 inline-block text-sm font-medium text-emerald-700 hover:underline"
        >
          Browse the full glossary →
        </Link>
      </section>

      <Disclaimer text={MEDICAL_DISCLAIMER_TEXT} />
    </main>
  );
}
