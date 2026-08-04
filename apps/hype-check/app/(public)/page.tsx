import { EvidenceBadge, HowWeRateClaims, NewsletterSignupForm, RiskBadge, VideoCard } from "@menhealth/ui";
import { getFeaturedVideo, getTrendingVideos } from '@/lib/db/queries';
import { TOPIC_SEEDS } from '@/lib/youtube/topics';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: {
    absolute: "MenHealth Digest — Evidence-Aware Men's Health Summaries",
  },
  description:
    "Daily summaries of the most important men's health videos, ranked and fact-checked. Fitness, testosterone, sleep, nutrition, longevity — without the hype.",
  openGraph: {
    title: "MenHealth Digest — Evidence-Aware Men's Health Summaries",
    description:
      "Daily summaries of the most important men's health videos, ranked and fact-checked.",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MenHealth Digest',
    description:
      "Evidence-aware summaries of trending men's health content — without the hype.",
  },
};

function deriveEvidenceLabel(
  score: number | null | undefined
): string | undefined {
  if (score == null) return undefined;
  if (score < 0.35) return 'WEAK';
  if (score < 0.6) return 'MIXED';
  if (score < 0.8) return 'MODERATE';
  return 'SUPPORTED';
}

const FEATURED_TOPIC_SLUGS = [
  'testosterone',
  'sleep',
  'fitness-over-40',
  'nutrition',
  'longevity',
  'supplements',
  'weight-loss',
  'muscle-gain',
];

async function FeaturedInsight() {
  const featuredVideo = await getFeaturedVideo();
  if (!featuredVideo) return null;

  const featuredSummary = featuredVideo.summaries[0] ?? null;
  const featuredClaim = featuredVideo.claims[0] ?? null;
  const featuredWatchMin = featuredVideo.durationSeconds
    ? Math.ceil(featuredVideo.durationSeconds / 60)
    : null;

  if (!featuredSummary) return null;

  return (
    <section className="bg-slate-50 py-12">
      <div className="mx-auto max-w-[1120px] px-4">
        <p className="mb-5 text-sm font-semibold tracking-widest text-indigo-600 uppercase">
          Today&apos;s top insight
        </p>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          {featuredClaim && (
            <div className="mb-4">
              <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
                The claim
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                &ldquo;{featuredClaim.text}&rdquo;
              </p>
            </div>
          )}
          <div className="mb-5">
            <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
              Our take
            </p>
            <p className="mt-1 leading-relaxed text-gray-700">
              {featuredSummary.shortSummary}
            </p>
          </div>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {featuredClaim && (
              <EvidenceBadge status={featuredClaim.evidenceStatus} />
            )}
            <RiskBadge level={featuredVideo.riskLevel} />
            {featuredWatchMin && (
              <span className="text-xs text-gray-400">
                {featuredWatchMin} min watch
              </span>
            )}
            <span className="text-xs text-gray-400">~ 2 min read</span>
          </div>
          <Link
            href={`/videos/${featuredVideo.slug}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Read the breakdown &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}

async function TrendingVideos() {
  const [featuredVideo, allVideos] = await Promise.all([
    getFeaturedVideo(),
    getTrendingVideos(),
  ]);
  const videos = allVideos.filter((v) => v.id !== featuredVideo?.id);

  return (
    <section id="trending" className="py-14">
      <div className="mx-auto max-w-[1120px] px-4">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">
          Trending summaries
        </h2>
        {videos.length === 0 ? (
          <p className="text-gray-500">
            No published summaries yet. Check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video, index) => (
              <VideoCard
                key={video.id}
                slug={video.slug}
                title={video.title}
                channelTitle={video.channel?.title ?? ''}
                thumbnailUrl={video.thumbnailUrl}
                shortSummary={video.summaries[0]?.shortSummary ?? null}
                trendScore={video.trendScore}
                topicNames={video.topics.map((vt) => vt.topic.name)}
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
  );
}

export default async function HomePage() {
  const featuredTopics = TOPIC_SEEDS.filter((t) =>
    FEATURED_TOPIC_SLUGS.includes(t.slug)
  );
  const remainingTopics = TOPIC_SEEDS.filter(
    (t) => !FEATURED_TOPIC_SLUGS.includes(t.slug)
  );

  return (
    <main>
      {/* Hero */}
      <section className="border-b border-gray-100 bg-white py-16">
        <div className="mx-auto max-w-[1120px] px-4">
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Men&apos;s health trends,{' '}
            <span className="text-indigo-600">
              explained without the hype.
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-gray-600">
            We scan trending YouTube videos about fitness, sleep, testosterone,
            nutrition, longevity, and men&apos;s wellness — then summarise the
            key claims and check them against available evidence.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/digest"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Get the free digest
            </Link>
            <Link
              href="#trending"
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Explore trending videos
            </Link>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
            <li>✓ Official YouTube embeds</li>
            <li>✓ AI-assisted summaries</li>
            <li>✓ Evidence-aware claim checks</li>
          </ul>
        </div>
      </section>

      <Suspense
        fallback={
          <div
            className="min-h-[420px] bg-slate-50 py-12 lg:min-h-[358px]"
            aria-hidden
          />
        }
      >
        <FeaturedInsight />
      </Suspense>

      {/* Topic cards */}
      <section id="topics" className="py-14">
        <div className="mx-auto min-h-[652px] max-w-[1120px] px-4 lg:min-h-[354px]">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            Browse by topic
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {featuredTopics.map((topic) => (
              <Link
                key={topic.slug}
                href={`/topics/${topic.slug}`}
                className="group rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:border-indigo-300 hover:shadow-sm"
              >
                <p className="font-semibold text-gray-900 group-hover:text-indigo-700!">
                  {topic.name}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-snug text-gray-500">
                  {topic.description}
                </p>
                <p className="mt-3 text-xs font-medium text-indigo-600!">
                  Explore →
                </p>
              </Link>
            ))}
          </div>
          {remainingTopics.length > 0 && (
            <p className="mt-4 text-sm text-gray-500">
              More topics:{' '}
              {remainingTopics.map((t, i) => (
                <span key={t.slug}>
                  <Link
                    href={`/topics/${t.slug}`}
                    className="text-indigo-700 hover:text-indigo-500"
                  >
                    {t.name}
                  </Link>
                  {i < remainingTopics.length - 1 && ', '}
                </span>
              ))}
            </p>
          )}
        </div>
      </section>

      <Suspense
        fallback={
          <div className="py-14">
            <div className="mx-auto max-w-[1120px] px-4">
              <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200" />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-64 animate-pulse rounded-xl bg-gray-100"
                  />
                ))}
              </div>
            </div>
          </div>
        }
      >
        <TrendingVideos />
      </Suspense>

      {/* Newsletter */}
      <section className="bg-indigo-50 py-16">
        <div className="mx-auto max-w-lg px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Get the 5-minute Men&apos;s Health Digest
          </h2>
          <p className="mt-2 text-sm text-gray-600">Every week:</p>
          <ul className="mt-2 space-y-0.5 text-sm text-gray-600">
            <li>5 trending videos summarised</li>
            <li>3 claims checked</li>
            <li>1 practical takeaway</li>
            <li>No miracle-cure nonsense</li>
          </ul>
          <div className="mt-6">
            <NewsletterSignupForm />
          </div>
        </div>
      </section>

      {/* How we rate claims */}
      <HowWeRateClaims />
    </main>
  );
}
