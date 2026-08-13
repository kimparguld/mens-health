import { getTopicBySlug, getWeeklyRankingVideos } from '@/lib/db/queries';
import { MEDICAL_DISCLAIMER_TEXT } from '@/lib/site-brand';
import { TOPIC_SEEDS } from '@/lib/youtube/topics';
import { buildItemListSchema } from '@menhealth/core-seo';
import {
  Disclaimer,
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

type Params = Promise<{ topic: string }>;

export async function generateStaticParams() {
  return TOPIC_SEEDS.map((t) => ({ topic: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { topic } = await params;
  const seed = TOPIC_SEEDS.find((t) => t.slug === topic);
  if (!seed) return { title: 'Not Found' };

  const title = `Best ${seed.name} Videos This Week`;
  const description = `The top-ranked ${seed.name.toLowerCase()} videos this week — summarised, scored, and checked for evidence quality.`;
  const canonical = `${APP_URL}/rankings/${topic}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
    keywords: [
      `best ${seed.name.toLowerCase()} videos`,
      `best ${seed.name.toLowerCase()} videos this week`,
      `top ${seed.name.toLowerCase()} youtube videos`,
      "men's health videos",
    ],
  };
}

export default async function WeeklyRankingPage({
  params,
}: {
  params: Params;
}) {
  const { topic } = await params;
  const seed = TOPIC_SEEDS.find((t) => t.slug === topic);
  if (!seed) notFound();

  const topicRecord = await getTopicBySlug(topic);

  const displayVideos = topicRecord
    ? await getWeeklyRankingVideos(topicRecord.id)
    : [];
  const isFallback = false;

  const listSchema = buildItemListSchema(
    `Best ${seed.name} Videos This Week`,
    displayVideos.map((v) => ({
      name: v.title,
      url: `${APP_URL}/videos/${v.slug}`,
    }))
  );

  const now = new Date();
  const weekLabel = now.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <main>
        {/* Header */}
        <section className="border-hairline border-b bg-white py-6">
          <div className="mx-auto max-w-4xl px-4">
            <PageBreadcrumbs
              baseUrl={APP_URL}
              trail={[
                { label: 'Rankings', href: '/rankings' },
                { label: seed.name, href: `/rankings/${topic}` },
              ]}
            />
            <JsonLd schema={listSchema} />
            <p className="mb-2 text-xs font-semibold tracking-widest text-emerald-600 uppercase">
              Weekly ranking
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Best {seed.name} Videos This Week
            </h1>
            <p className="mt-3 max-w-xl text-base text-gray-700">
              {isFallback
                ? `Top-ranked ${seed.name.toLowerCase()} videos on YouTube — summarised and scored for evidence quality.`
                : `Top-ranked ${seed.name.toLowerCase()} videos added this week — summarised and scored for evidence quality.`}
            </p>
            <p className="mt-2 text-xs text-gray-600">
              {isFallback ? 'All-time top picks' : `Updated ${weekLabel}`}
            </p>
          </div>
        </section>

        {/* How rankings work */}
        <section className="border-hairline border-b bg-gray-50 py-8">
          <div className="mx-auto max-w-4xl px-4">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-gray-700">
                <span className="transition-transform group-open:rotate-90">
                  ›
                </span>
                How rankings work
              </summary>
              <div className="mt-3 grid gap-3 pl-5 text-xs text-gray-600 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    icon: '📅',
                    label: 'Recency',
                    desc: 'Videos published this week rank higher — fresh content first.',
                  },
                  {
                    icon: '📊',
                    label: 'Engagement',
                    desc: 'Views, likes, and comments relative to channel size.',
                  },
                  {
                    icon: '🎯',
                    label: 'Topic relevance',
                    desc: "How closely the video matches this topic's core questions.",
                  },
                  {
                    icon: '⚠️',
                    label: 'Risk penalties',
                    desc: "High-risk or unsubstantiated claims reduce a video's score.",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-3"
                  >
                    <p className="font-semibold text-gray-800">
                      {item.icon} {item.label}
                    </p>
                    <p className="mt-1 text-gray-700">{item.desc}</p>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </section>

        {/* Video list */}
        <section className="py-10">
          <div className="mx-auto max-w-4xl px-4">
            {displayVideos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
                <p className="text-gray-700">
                  No videos indexed yet for this topic.{' '}
                  <Link href="/" className="text-emerald-600 hover:underline">
                    Browse all topics →
                  </Link>
                </p>
              </div>
            ) : (
              <ol className="space-y-12">
                {displayVideos.map((video, index) => (
                  <li
                    key={video.id}
                    className="relative flex items-start gap-4"
                  >
                    <div className="absolute -top-3 -left-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white bg-emerald-700 text-lg font-bold text-white">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <VideoCard
                        slug={video.slug}
                        title={video.title}
                        channelTitle={video.channel?.title ?? ''}
                        thumbnailUrl={video.thumbnailUrl}
                        shortSummary={video.summaries[0]?.shortSummary ?? null}
                        trendScore={video.trendScore}
                        topicNames={video.topics.map((vt) => vt.topic.name)}
                        topics={video.topics.map((vt) => ({ name: vt.topic.name, slug: vt.topic.slug }))}
                        riskLevel={video.riskLevel}
                        evidenceLabel={deriveEvidenceLabel(video.evidenceScore)}
                        durationSeconds={video.durationSeconds ?? undefined}
                        customSizes="100vw"
                        priority={index === 0}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        {/* Navigation links */}
        <section className="border-hairline border-t bg-gray-50 py-8">
          <div className="mx-auto flex max-w-4xl flex-wrap gap-4 px-4">
            <Link
              href={`/topics/${topic}`}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
            >
              ← {seed.name} topic hub
            </Link>
            <Link
              href={`/weekly/${topic}`}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-emerald-300"
            >
              Weekly {seed.name} picks →
            </Link>
          </div>
        </section>

        {/* Cross-links to other weekly rankings */}
        <section className="border-hairline border-t bg-gray-50 py-10">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">
              Other weekly rankings
            </h2>
            <div className="flex flex-wrap gap-2">
              {TOPIC_SEEDS.filter((t) => t.slug !== topic)
                .slice(0, 8)
                .map((t) => (
                  <Link
                    key={t.slug}
                    href={`/rankings/${t.slug}`}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-emerald-300 hover:text-emerald-700"
                  >
                    {t.name}
                  </Link>
                ))}
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <NewsletterFooterCTA
          headline={`Get the weekly ${seed.name} digest`}
          description="Top 5 videos, summarised claims, and evidence notes — every Friday."
        />

        <div className="mx-auto max-w-4xl px-4 pb-10">
          <Disclaimer text={MEDICAL_DISCLAIMER_TEXT} />
        </div>
      </main>
    </>
  );
}
