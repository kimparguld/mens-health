import { db } from '@/lib/db/prisma';
import { MEDICAL_DISCLAIMER_TEXT } from '@/lib/site-brand';
import { CREATOR_SEEDS } from '@/lib/youtube/creators';
import { buildPersonSchema } from '@menhealth/core-seo';
import {
  Disclaimer,
  EvidenceBadge,
  JsonLd,
  NewsletterFooterCTA,
  PageBreadcrumbs,
  VideoCard,
} from '@menhealth/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

function deriveEvidenceLabel(
  score: number | null | undefined
): string | undefined {
  if (score == null) return undefined;
  if (score < 0.35) return 'WEAK';
  if (score < 0.6) return 'MIXED';
  if (score < 0.8) return 'MODERATE';
  return 'SUPPORTED';
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.menhealth-digest.com';

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return CREATOR_SEEDS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const creator = CREATOR_SEEDS.find((c) => c.slug === slug);
  if (!creator) return { title: 'Creator Not Found' };

  const title = `${creator.name} — Men's Health Videos`;
  const description = `${creator.description} Browse ${creator.name}'s top men's health videos, summarised and fact-checked.`;
  const canonical = `${APP_URL}/creators/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'profile' },
    twitter: { card: 'summary_large_image', title, description },
    keywords: [
      creator.name,
      `${creator.name} videos`,
      `${creator.name} YouTube`,
      "men's health",
      creator.specialty,
    ],
  };
}

export default async function CreatorPage({ params }: { params: Params }) {
  const { slug } = await params;
  const creator = CREATOR_SEEDS.find((c) => c.slug === slug);
  if (!creator) notFound();

  // Look up the channel by its YouTube channel ID
  const channel = await db.channel.findUnique({
    where: { youtubeId: creator.youtubeChannelId },
  });

  const videos = channel
    ? await db.video.findMany({
        where: { status: 'PUBLISHED', channelId: channel.id },
        orderBy: { trendScore: 'desc' },
        take: 20,
        include: {
          channel: true,
          summaries: { take: 1, orderBy: { createdAt: 'desc' } },
          topics: { include: { topic: true } },
        },
      })
    : [];

  // Derive most common topics from indexed videos
  const topicFrequency = new Map<
    string,
    { name: string; slug: string; count: number }
  >();
  for (const video of videos) {
    for (const vt of video.topics) {
      const existing = topicFrequency.get(vt.topic.id);
      if (existing) {
        existing.count++;
      } else {
        topicFrequency.set(vt.topic.id, {
          name: vt.topic.name,
          slug: vt.topic.slug,
          count: 1,
        });
      }
    }
  }
  const topTopics = Array.from(topicFrequency.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Fetch extracted claims from this creator's videos
  const videoIds = videos.map((v) => v.id);

  // Evidence scorecard: full aggregate counts (not limited like the claims list below)
  const claimStatusCounts =
    videoIds.length > 0
      ? await db.claim.groupBy({
          by: ['evidenceStatus'],
          where: { videoId: { in: videoIds } },
          _count: { _all: true },
        })
      : [];
  const sourcesCited =
    videoIds.length > 0
      ? await db.evidenceSource.count({
          where: { claim: { videoId: { in: videoIds } } },
        })
      : 0;
  const scorecard = {
    videosReviewed: videos.length,
    claimsAssessed: claimStatusCounts.reduce(
      (sum, c) => sum + c._count._all,
      0
    ),
    supported:
      claimStatusCounts.find((c) => c.evidenceStatus === 'SUPPORTED')?._count
        ._all ?? 0,
    mixed:
      claimStatusCounts.find((c) => c.evidenceStatus === 'MIXED')?._count
        ._all ?? 0,
    weak:
      claimStatusCounts.find((c) => c.evidenceStatus === 'WEAK')?._count._all ??
      0,
    unsupported:
      claimStatusCounts.find((c) => c.evidenceStatus === 'UNSUPPORTED')?._count
        ._all ?? 0,
    notChecked:
      claimStatusCounts.find((c) => c.evidenceStatus === 'NOT_CHECKED')?._count
        ._all ?? 0,
    sourcesCited,
  };

  const claims =
    videoIds.length > 0
      ? await db.claim.findMany({
          where: {
            videoId: { in: videoIds },
            slug: { not: null },
          },
          take: 6,
          orderBy: { riskLevel: 'desc' },
          select: {
            id: true,
            text: true,
            evidenceStatus: true,
            riskLevel: true,
            slug: true,
          },
        })
      : [];

  const personSchema = buildPersonSchema({
    name: creator.name,
    description: creator.description,
    url: `${APP_URL}/creators/${slug}`,
    credentials: creator.credentials,
    jobTitle: creator.specialty.split(', ')[0],
  });

  return (
    <>
      <main>
        {/* Header */}
        <section className="border-hairline border-b bg-white py-6">
          <PageBreadcrumbs
            baseUrl={APP_URL}
            trail={[
              { label: 'Creators', href: '/creators' },
              { label: creator.name, href: `/creators/${slug}` },
            ]}
          />
          <JsonLd schema={personSchema} />
          <div className="mx-auto max-w-4xl px-4">
            <p className="mb-2 text-xs font-semibold tracking-widest text-emerald-600 uppercase">
              Creator profile
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {creator.name}
            </h1>
            {creator.credentials && (
              <p className="mt-1 text-sm font-medium text-gray-700">
                {creator.credentials}
              </p>
            )}
            <p className="mt-3 max-w-xl text-base leading-relaxed text-gray-600">
              {creator.description}
            </p>

            {/* Specialty tags */}
            <div className="mt-4 flex flex-wrap gap-2">
              {creator.specialty.split(', ').map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* External link */}
            <a
              href={`https://www.youtube.com/channel/${creator.youtubeChannelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50"
            >
              <svg
                className="h-4 w-4 text-red-500"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5L15.8 12l-6.1 3.5z" />
              </svg>
              View on YouTube
            </a>

            {/* Trust score if available */}
            {channel && (
              <p className="mt-3 text-xs text-gray-600">
                Trust score:{' '}
                <span className="font-medium text-gray-600">
                  {(channel.trustScore * 100).toFixed(0)}
                  /100
                </span>{' '}
                · {videos.length} videos indexed
              </p>
            )}
          </div>
        </section>

        {/* Evidence scorecard */}
        {scorecard.claimsAssessed > 0 && (
          <section className="border-hairline border-b bg-white py-10">
            <div className="mx-auto max-w-4xl px-4">
              <h2 className="mb-1 text-lg font-semibold text-gray-900">
                Evidence Scorecard
              </h2>
              <p className="mb-6 text-sm text-gray-700">
                A factual summary of claims we&apos;ve checked from{' '}
                {creator.name}&apos;s videos — not an overall opinion of the
                creator.
              </p>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: 'Videos reviewed', value: scorecard.videosReviewed },
                  { label: 'Claims assessed', value: scorecard.claimsAssessed },
                  {
                    label: 'Strongly supported',
                    value: scorecard.supported,
                  },
                  { label: 'Mixed evidence', value: scorecard.mixed },
                  { label: 'Weak evidence', value: scorecard.weak },
                  { label: 'Unsupported', value: scorecard.unsupported },
                  { label: 'Not yet checked', value: scorecard.notChecked },
                  { label: 'Sources cited', value: scorecard.sourcesCited },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="border-hairline rounded-xl border bg-gray-50 px-4 py-3"
                  >
                    <dt className="text-xs text-gray-700">{row.label}</dt>
                    <dd className="mt-1 text-xl font-semibold text-gray-900">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        {/* Videos */}
        <section className="py-10">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="mb-6 text-lg font-semibold text-gray-900">
              {videos.length > 0
                ? `${creator.name}'s Top Videos`
                : 'No videos indexed yet'}
            </h2>

            {videos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
                <p className="text-gray-700">
                  {channel
                    ? "Videos from this creator will appear here once they've been indexed."
                    : "We haven't indexed any videos from this creator yet — our system surfaces videos by topic, so coverage varies by creator."}
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-block text-sm font-semibold text-emerald-600 hover:underline"
                >
                  Browse all videos →
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {videos.map((video, index) => (
                  <VideoCard
                    key={video.id}
                    slug={video.slug}
                    title={video.title}
                    channelTitle={video.channel?.title ?? ''}
                    thumbnailUrl={video.thumbnailUrl}
                    shortSummary={video.summaries[0]?.shortSummary ?? null}
                    trendScore={video.trendScore}
                    topics={video.topics.map((vt) => ({
                      name: vt.topic.name,
                      slug: vt.topic.slug,
                    }))}
                    riskLevel={video.riskLevel}
                    evidenceLabel={deriveEvidenceLabel(video.evidenceScore)}
                    durationSeconds={video.durationSeconds ?? undefined}
                    priority={index === 0}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Other creators */}
        <section className="border-hairline border-t bg-gray-50 py-10">
          <div className="mx-auto max-w-4xl px-4">
            {/* Most common topics */}
            {topTopics.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 text-sm font-semibold text-gray-700">
                  Most covered topics
                </h2>
                <div className="flex flex-wrap gap-2">
                  {topTopics.map((t) => (
                    <Link
                      key={t.slug}
                      href={`/topics/${t.slug}`}
                      className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-emerald-300 hover:text-emerald-700"
                    >
                      {t.name}{' '}
                      <span className="text-gray-600">({t.count})</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted claims */}
            {claims.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 text-sm font-semibold text-gray-700">
                  Claims extracted from {creator.name}&apos;s videos
                </h2>
                <ul className="space-y-2">
                  {claims.map((claim) => (
                    <li
                      key={claim.id}
                      className="border-hairline flex flex-wrap items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm"
                    >
                      <span className="flex-1 text-gray-800">
                        &ldquo;{claim.text}&rdquo;
                      </span>
                      <EvidenceBadge
                        status={claim.evidenceStatus}
                        showNotChecked
                      />
                      {claim.slug && (
                        <Link
                          href={`/claims/${claim.slug}`}
                          className="text-xs text-emerald-700 hover:underline"
                        >
                          See evidence →
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Creator disclaimer */}
            <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              MenHealth Digest does not endorse, represent, or have an
              affiliation with {creator.name}. This page presents an independent
              summary of publicly available content. Always evaluate health
              information critically and consult a qualified healthcare
              professional for personal medical decisions.
            </div>

            <h2 className="mb-4 text-sm font-semibold text-gray-700">
              More creators
            </h2>
            <div className="flex flex-wrap gap-2">
              {CREATOR_SEEDS.filter((c) => c.slug !== slug).map((c) => (
                <Link
                  key={c.slug}
                  href={`/creators/${c.slug}`}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-emerald-300 hover:text-emerald-700"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <NewsletterFooterCTA
          headline="Follow the evidence, not the hype"
          description="Get the 5-minute Men's Health Digest every Friday — trending videos, summarised claims, evidence notes."
        />

        <div className="mx-auto max-w-4xl px-4 pb-10">
          <Disclaimer text={MEDICAL_DISCLAIMER_TEXT} />
        </div>
      </main>
    </>
  );
}
