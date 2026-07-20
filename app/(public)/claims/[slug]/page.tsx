import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db/prisma";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { NewsletterSignupForm } from "@/components/ui/NewsletterSignupForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbSchema } from "@/lib/seo/json-ld";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://menhealth-digest.com";

type Params = Promise<{ slug: string }>;

export const dynamic = "force-dynamic";

async function getClaim(slug: string) {
  // Try slug first, then fall back to id for older claims without a slug
  const claim = await db.claim.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    include: {
      sources: true,
      video: {
        include: {
          channel: true,
          topics: { include: { topic: true } },
          summaries: { take: 1, orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
  return claim;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const claim = await getClaim(slug);
  if (!claim || claim.video.status !== "PUBLISHED")
    return { title: "Claim Not Found" };

  const canonical = `${APP_URL}/claims/${claim.slug ?? claim.id}`;
  const description =
    claim.explanation ??
    `Evidence review: "${claim.text}" — see what the research actually says.`;

  return {
    title: `${claim.text} — Evidence Review`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${claim.text} — Evidence Review`,
      description,
      url: canonical,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: `${claim.text} — Evidence Review`,
      description,
    },
  };
}

export default async function ClaimPage({ params }: { params: Params }) {
  const { slug } = await params;
  const claim = await getClaim(slug);

  if (!claim || claim.video.status !== "PUBLISHED") notFound();

  const { video } = claim;
  const summary = video.summaries[0];
  const firstTopic = video.topics[0]?.topic;

  const canonicalSlug = claim.slug ?? claim.id;
  const breadcrumb = buildBreadcrumbSchema([
    { name: "Home", url: APP_URL },
    { name: "Claims", url: `${APP_URL}/claims` },
    {
      name: claim.text.slice(0, 60),
      url: `${APP_URL}/claims/${canonicalSlug}`,
    },
  ]);

  const EVIDENCE_EXPLANATION: Record<string, string> = {
    SUPPORTED:
      "Multiple well-designed studies consistently support this claim.",
    MIXED:
      "Some evidence supports this, but findings are inconsistent or limited in scope.",
    WEAK: "Limited or low-quality evidence — treat with caution.",
    UNSUPPORTED: "Available evidence does not support this claim.",
    NOT_CHECKED: "This claim has not yet been reviewed against the literature.",
  };

  const evidenceNote =
    EVIDENCE_EXPLANATION[claim.evidenceStatus] ??
    EVIDENCE_EXPLANATION["NOT_CHECKED"];

  return (
    <>
      <JsonLd schema={breadcrumb} />
      <main className="mx-auto max-w-2xl px-4 py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">
            Home
          </Link>
          <span>/</span>
          {firstTopic && (
            <>
              <Link
                href={`/topics/${firstTopic.slug}`}
                className="hover:text-gray-600"
              >
                {firstTopic.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-gray-600">Claim</span>
        </nav>

        {/* Claim heading */}
        <article>
          <p className="mb-3 text-xs font-semibold tracking-widest text-emerald-600 uppercase">
            Health claim
          </p>
          <h1 className="text-2xl leading-snug font-bold text-gray-900 sm:text-3xl">
            &ldquo;{claim.text}&rdquo;
          </h1>

          {/* Badges */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <EvidenceBadge status={claim.evidenceStatus} />
            <RiskBadge level={claim.riskLevel} />
            <span className="text-xs text-gray-400 capitalize">
              {claim.category.replace(/_/g, " ").toLowerCase()}
            </span>
          </div>

          {/* Evidence summary */}
          <section className="mt-8">
            <h2 className="mb-2 text-sm font-semibold tracking-wide text-gray-900 uppercase">
              Evidence Summary
            </h2>
            <p className="leading-relaxed text-gray-700">{evidenceNote}</p>
            {claim.explanation && (
              <p className="mt-3 leading-relaxed text-gray-600">
                {claim.explanation}
              </p>
            )}
          </section>

          {/* Sources */}
          {claim.sources.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-gray-900 uppercase">
                Sources reviewed
              </h2>
              <ul className="space-y-3">
                {claim.sources.map((source) => (
                  <li
                    key={source.id}
                    className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                  >
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-900 hover:text-emerald-700"
                    >
                      {source.title}
                    </a>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {source.source}
                      {source.year ? `, ${source.year}` : ""}
                    </p>
                    {source.summary && (
                      <p className="mt-1 text-sm text-gray-600">
                        {source.summary}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Source video */}
          <section className="mt-10 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="mb-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">
              Extracted from
            </p>
            <Link
              href={`/videos/${video.slug}`}
              className="mt-1 block text-base font-semibold text-gray-900 hover:text-emerald-700"
            >
              {video.title}
            </Link>
            <p className="mt-0.5 text-sm text-gray-500">
              {video.channel.title}
            </p>
            {summary && (
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {summary.shortSummary}
              </p>
            )}
            <Link
              href={`/videos/${video.slug}`}
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Watch breakdown →
            </Link>
          </section>
        </article>

        {/* Newsletter */}
        <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-gray-900">
            Get the weekly evidence digest
          </h2>
          <p className="mb-5 text-sm text-gray-500">
            5 claims reviewed each Friday. No hype.
          </p>
          <NewsletterSignupForm />
        </section>

        <div className="mt-10">
          <Disclaimer />
        </div>
      </main>
    </>
  );
}
