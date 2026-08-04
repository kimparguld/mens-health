import { RelatedTopics } from '@/components/topic/RelatedTopics';
import { adsConfig } from '@/lib/ads-config';
import { db } from '@/lib/db/prisma';
import { getTopicBySlug, getTopicVideos } from '@/lib/db/queries';
import {
  getActiveSponsor,
  getAffiliateLinksForTopic,
} from '@/lib/monetization/resolvers';
import { getTopicContent } from '@/lib/seo/topic-content';
import { getTopicSeo } from '@/lib/seo/topic-faq';
import { DISCLAIMER_TEXT } from '@/lib/site-brand';
import { TOPIC_SEEDS } from '@/lib/youtube/topics';
import type { FaqEntry } from '@menhealth/core-seo';
import {
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildItemListSchema,
} from '@menhealth/core-seo';
import {
  AdSlot,
  AffiliateDisclosure,
  Disclaimer,
  EvidenceBadge,
  JsonLd,
  NewsletterFooterCTA,
  NewsletterStickyCTA,
  RiskBadge,
  SponsorBlock,
  VideoCard,
} from '@menhealth/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.hype-check.net';

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ page?: string }>;

export async function generateStaticParams() {
  return TOPIC_SEEDS.map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = TOPIC_SEEDS.find((t) => t.slug === slug);
  if (!topic) return { title: 'Topic Not Found' };

  const seo = getTopicSeo(slug);
  const description = seo?.intro ?? topic.description;
  const canonical = `${APP_URL}/topics/${slug}`;

  return {
    title: `${topic.name} — Hype Check`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${topic.name} — Hype Check`,
      description,
      url: canonical,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${topic.name} — Hype Check`,
      description,
    },
    keywords: [
      topic.name,
      'legit or scam',
      'evidence-based review',
      'is it worth it',
    ],
  };
}

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? '1', 10));
  const topicSeed = TOPIC_SEEDS.find((t) => t.slug === slug);
  if (!topicSeed) notFound();

  const staticSeo = getTopicSeo(slug);
  const staticContent = getTopicContent(slug);

  const topic = await getTopicBySlug(slug);

  // Merge DB-generated FAQs over static fallback
  const dbFaq = topic?.faqJson != null ? (topic.faqJson as FaqEntry[]) : null;
  const seo = {
    intro: topic?.faqIntro ?? staticSeo?.intro ?? topicSeed.description,
    faq: dbFaq ?? staticSeo?.faq ?? [],
  };

  // Fetch up to 3 related claims for this topic
  const topicClaims = topic
    ? await db.claim.findMany({
        where: {
          subject: {
            status: 'PUBLISHED',
            topics: { some: { topicId: topic.id } },
          },
          slug: { not: null },
        },
        take: 3,
        orderBy: { riskLevel: 'desc' },
        select: { id: true, text: true, evidenceStatus: true, slug: true },
      })
    : [];

  // Evidence overview: aggregate claim verdicts across all videos in this topic.
  // `_count: true` counts rows per `evidenceStatus` group as a plain number —
  // the object form (`_count: { _all: true }`) mistypes here because Prisma's
  // groupBy payload resolves `_count` against the *input* filter shape (not
  // the count output type) when a select object is used, so `_all` never
  // actually lands on the result as a required field.
  const topicClaimStatusCounts = topic
    ? await db.claim.groupBy({
        by: ['evidenceStatus'],
        where: {
          subject: {
            status: 'PUBLISHED',
            topics: { some: { topicId: topic.id } },
          },
        },
        _count: true,
      })
    : [];
  const evidenceOverview = {
    claimsAssessed: topicClaimStatusCounts.reduce(
      (sum, c) => sum + c._count,
      0
    ),
    supported:
      topicClaimStatusCounts.find((c) => c.evidenceStatus === 'SUPPORTED')
        ?._count ?? 0,
    mixed:
      topicClaimStatusCounts.find((c) => c.evidenceStatus === 'MIXED')
        ?._count ?? 0,
    weak:
      topicClaimStatusCounts.find((c) => c.evidenceStatus === 'WEAK')?._count ??
      0,
    unsupported:
      topicClaimStatusCounts.find((c) => c.evidenceStatus === 'UNSUPPORTED')
        ?._count ?? 0,
    notChecked:
      topicClaimStatusCounts.find((c) => c.evidenceStatus === 'NOT_CHECKED')
        ?._count ?? 0,
  };

  const [topicResult, featuredResult] = await Promise.all([
    topic ? getTopicVideos(topic.id, slug, page) : null,
    topic && page > 1 ? getTopicVideos(topic.id, slug, 1) : null,
  ]);
  const publishedVideos = topicResult?.videos ?? [];
  const totalPages = topicResult?.totalPages ?? 1;
  // Always show the same top-3 featured videos regardless of current page
  const featuredVideos =
    page === 1
      ? publishedVideos.slice(0, 3)
      : (featuredResult?.videos ?? []).slice(0, 3);
  // On page 1, exclude featured from the "All videos" grid to avoid duplication
  const allVideos = page === 1 ? publishedVideos.slice(3) : publishedVideos;

  const [sponsor, affiliateLinks] = await Promise.all([
    getActiveSponsor(),
    getAffiliateLinksForTopic(slug),
  ]);

  // JSON-LD schemas
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: APP_URL },
    { name: topicSeed.name, url: `${APP_URL}/topics/${slug}` },
  ]);

  const itemListSchema =
    publishedVideos.length > 0
      ? buildItemListSchema(
          `${topicSeed.name} Videos`,
          publishedVideos.map((v: (typeof publishedVideos)[number]) => ({
            name: v.editorialTitle ?? v.sourceVideos[0]?.title ?? v.name,
            url: `${APP_URL}/videos/${v.slug}`,
          }))
        )
      : null;

  const faqSchema = seo && seo.faq.length > 0 ? buildFaqSchema(seo.faq) : null;

  const schemas = [
    breadcrumbSchema,
    ...(itemListSchema ? [itemListSchema] : []),
    ...(faqSchema ? [faqSchema] : []),
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      {/* Inject JSON-LD */}
      {schemas.map((schema, i) => (
        <JsonLd key={i} schema={schema} />
      ))}

      {/* Hero */}
      <header className="mb-8">
        <nav className="mb-3 text-sm text-gray-500" aria-label="Breadcrumb">
          <Link href="/" className="hover:underline">
            Home
          </Link>{' '}
          / <span className="text-gray-900">{topicSeed.name}</span>
        </nav>

        <div className="mb-2 flex items-center gap-2">
          {topicSeed.isHighRisk && <RiskBadge level="HIGH" />}
        </div>

        <h1 className="text-4xl font-bold text-gray-900">{topicSeed.name}</h1>

        {seo ? (
          <p className="mt-3 text-lg leading-relaxed text-gray-600">
            {seo.intro}
          </p>
        ) : (
          <p className="mt-2 text-lg text-gray-600">{topicSeed.description}</p>
        )}
      </header>

      {/* Beginner Guide */}
      {staticContent?.beginnerGuide && (
        <section className="border-ink-muted/20 mb-10 rounded-xl border bg-indigo-50 px-6 py-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {staticContent.beginnerGuide.heading}
          </h2>
          <ol className="space-y-2">
            {staticContent.beginnerGuide.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-700">
                <span className="bg-ink-muted/60 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Evidence overview */}
      {evidenceOverview.claimsAssessed > 0 && (
        <section className="mb-10">
          <h2 className="mb-1 text-xl font-semibold text-gray-900">
            Evidence overview
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            How claims about {topicSeed.name.toLowerCase()} across all reviewed
            videos stack up against the evidence.
          </p>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              {
                label: 'Claims assessed',
                value: evidenceOverview.claimsAssessed,
              },
              {
                label: 'Strongly supported',
                value: evidenceOverview.supported,
              },
              { label: 'Mixed evidence', value: evidenceOverview.mixed },
              { label: 'Weak evidence', value: evidenceOverview.weak },
              { label: 'Unsupported', value: evidenceOverview.unsupported },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3"
              >
                <dt className="text-xs text-gray-500">{row.label}</dt>
                <dd className="mt-1 text-xl font-semibold text-gray-900">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <AdSlot slot="between-content" className="mb-10" config={adsConfig} />

      {/* Top Claims */}
      {(topicClaims.length > 0 ||
        (staticContent?.topClaims?.length ?? 0) > 0) && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Top claims in this topic
          </h2>
          <ul className="space-y-3">
            {topicClaims.length > 0
              ? topicClaims.map((claim) => (
                  <li
                    key={claim.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-4"
                  >
                    <span className="flex-1 text-sm text-gray-800">
                      &ldquo;{claim.text}&rdquo;
                    </span>
                    <EvidenceBadge
                      status={claim.evidenceStatus}
                      showNotChecked
                    />
                    {claim.slug && (
                      <Link
                        href={`/claims/${claim.slug}`}
                        className="text-ink-muted text-xs font-medium hover:underline"
                      >
                        See evidence →
                      </Link>
                    )}
                  </li>
                ))
              : staticContent?.topClaims?.map((claim, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-4"
                  >
                    <span className="flex-1 text-sm text-gray-800">
                      &ldquo;{claim.text}&rdquo;
                    </span>
                    <EvidenceBadge status={claim.evidenceStatus} />
                  </li>
                ))}
          </ul>
          <Link
            href={`/rankings/${slug}`}
            className="text-ink-muted mt-3 inline-block text-sm font-medium hover:underline"
          >
            See top-ranked videos for {topicSeed.name} →
          </Link>
        </section>
      )}

      {/* Common Myths */}
      {staticContent?.commonMyths && staticContent.commonMyths.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Common myths about {topicSeed.name.toLowerCase()}
          </h2>
          <div className="divide-y rounded-xl border bg-white">
            {staticContent.commonMyths.map((item, i) => (
              <div key={i} className="px-5 py-4">
                <p className="text-sm font-semibold text-red-700">
                  Myth: &ldquo;{item.myth}&rdquo;
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  <span className="text-ink-muted font-medium">Reality:</span>{' '}
                  {item.reality}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Evidence-Aware Takeaways */}
      {staticContent?.takeaways && staticContent.takeaways.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Evidence-aware takeaways
          </h2>
          <ul className="space-y-2">
            {staticContent.takeaways.map((takeaway, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-700">
                <span className="text-ink-muted/60 mt-0.5">✓</span>
                {takeaway}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Video grid */}
      {publishedVideos.length === 0 ? (
        <p className="text-gray-500">No published videos for this topic yet.</p>
      ) : (
        <section className="mb-12">
          {/* Featured this week: always top 3 across all pages */}
          {featuredVideos.length >= 3 && (
            <>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                Featured this week
              </h2>
              <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {featuredVideos.map((video, index) => (
                  <VideoCard
                    key={video.id}
                    slug={video.slug}
                    title={
                      video.editorialTitle ??
                      video.sourceVideos[0]?.title ??
                      video.name
                    }
                    channelTitle={video.channel?.title ?? ''}
                    thumbnailUrl={video.thumbnailUrl}
                    shortSummary={
                      video.sourceVideos[0]?.summaries[0]?.shortSummary ?? null
                    }
                    trendScore={video.trendScore}
                    topicNames={video.topics.map(
                      (vt: (typeof video.topics)[number]) => vt.topic.name
                    )}
                    riskLevel={video.riskLevel}
                    durationSeconds={video.durationSeconds ?? undefined}
                    priority={index === 0}
                  />
                ))}
              </div>
            </>
          )}

          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            All videos
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {allVideos.map((video: (typeof publishedVideos)[number]) => (
              <VideoCard
                key={video.id}
                slug={video.slug}
                title={
                  video.editorialTitle ??
                  video.sourceVideos[0]?.title ??
                  video.name
                }
                channelTitle={video.channel?.title ?? ''}
                thumbnailUrl={video.thumbnailUrl}
                shortSummary={
                  video.sourceVideos[0]?.summaries[0]?.shortSummary ?? null
                }
                trendScore={video.trendScore}
                topicNames={video.topics.map(
                  (vt: (typeof video.topics)[number]) => vt.topic.name
                )}
                riskLevel={video.riskLevel}
                durationSeconds={video.durationSeconds ?? undefined}
              />
            ))}
          </div>
        </section>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          className="mb-12 flex items-center justify-between text-sm"
          aria-label="Pagination"
        >
          <span className="text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/topics/${slug}?page=${page - 1}`}
                className="rounded border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                ← Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/topics/${slug}?page=${page + 1}`}
                className="rounded border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Next →
              </Link>
            )}
          </div>
        </nav>
      )}
      <RelatedTopics currentSlug={slug} />

      {seo && seo.faq.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            Frequently Asked Questions
          </h2>
          <div className="divide-y rounded-xl border bg-white">
            {seo.faq.map((item, i) => (
              <details key={i} className="group px-5 py-4">
                <summary className="group-open:text-ink-muted cursor-pointer list-none text-base font-medium text-gray-900">
                  <span className="mr-2 inline-block transition-transform group-open:rotate-90">
                    ›
                  </span>
                  {item.question}
                </summary>
                <p className="mt-3 pl-5 text-sm leading-relaxed text-gray-600">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}

      <AdSlot slot="article-footer" className="mb-10" config={adsConfig} />

      {/* Sponsor placement */}
      {sponsor && (
        <div className="mb-10">
          <SponsorBlock
            name={sponsor.name}
            copyText={sponsor.copyText}
            ctaText={sponsor.ctaText}
            ctaUrl={sponsor.ctaUrl}
          />
        </div>
      )}

      {/* Affiliate links */}
      {affiliateLinks.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Recommended products
          </h2>
          <ul className="mb-3 space-y-2">
            {affiliateLinks.map((link) => (
              <li key={link.id}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="text-ink text-sm font-medium hover:underline"
                >
                  {link.label}
                </a>
                {link.commission && (
                  <span className="ml-2 text-xs text-gray-400">
                    ({link.commission} commission)
                  </span>
                )}
              </li>
            ))}
          </ul>
          <AffiliateDisclosure />
        </section>
      )}

      {/* Newsletter CTA */}
      <div className="mb-10">
        <NewsletterFooterCTA
          headline="Get the weekly digest"
          description="5 videos summarised · 3 claims checked · 1 practical takeaway"
        />
      </div>

      <Disclaimer text={DISCLAIMER_TEXT} />
      <NewsletterStickyCTA label="Free weekly Hype Check digest" />
    </main>
  );
}
