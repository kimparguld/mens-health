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
    <section className="border-hairline bg-surface-alt border-y py-12">
      <div className="mx-auto max-w-[1120px] px-4">
        <p className="mb-5 text-sm font-semibold tracking-widest text-emerald-700 uppercase">
          Today&apos;s top insight
        </p>
        <div className="border-hairline rounded-xl border bg-white p-6 shadow-sm sm:p-8">
          {featuredClaim && (
            <div className="mb-4">
              <p className="text-text-subtle text-xs font-semibold tracking-wide uppercase">
                The claim
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                &ldquo;{featuredClaim.text}&rdquo;
              </p>
            </div>
          )}
          <div className="mb-5">
            <p className="text-text-subtle text-xs font-semibold tracking-wide uppercase">
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
              <span className="text-sm text-gray-600">
                {featuredWatchMin} min watch
              </span>
            )}
            <span className="text-sm text-gray-600">~ 2 min read</span>
          </div>
          <Link
            href={`/videos/${featuredVideo.slug}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
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
        <h2 className="mb-6 text-3xl font-bold text-gray-900">
          Trending summaries
        </h2>
        {videos.length === 0 ? (
          <p className="text-gray-700">
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
      <section className="border-hairline border-b bg-white py-16">
        <div className="mx-auto max-w-[1120px] px-4">
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Men&apos;s health trends,{' '}
            <span className="text-emerald-700">
              explained without the hype.
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-gray-700">
            We scan trending YouTube videos about fitness, sleep, testosterone,
            nutrition, longevity, and men&apos;s wellness — then summarise the
            key claims and check them against available evidence.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/digest"
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
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
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700">
            <li>✓ Official YouTube embeds</li>
            <li>✓ AI-assisted summaries</li>
            <li>✓ Evidence-aware claim checks</li>
          </ul>
        </div>
      </section>

      <Suspense
        fallback={
          <div
            className="bg-surface-alt min-h-[420px] py-12 lg:min-h-[358px]"
            aria-hidden
          />
        }
      >
        <FeaturedInsight />
      </Suspense>

      {/* Topic cards */}
      <section id="topics" className="py-14">
        <div className="mx-auto min-h-[652px] max-w-[1120px] px-4 lg:min-h-[354px]">
          <h2 className="mb-6 text-3xl font-bold text-gray-900">
            Browse by topic
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {featuredTopics.map((topic) => (
              <Link
                key={topic.slug}
                href={`/topics/${topic.slug}`}
                className="border-hairline group rounded-xl border bg-white p-4 transition-shadow hover:border-emerald-300 hover:shadow-sm"
              >
                <p className="font-semibold text-gray-900 group-hover:text-emerald-700!">
                  {topic.name}
                </p>
                <p className="mt-1 line-clamp-2 text-sm leading-snug text-gray-700">
                  {topic.description}
                </p>
                <p className="mt-3 text-sm font-medium text-emerald-700!">
                  Explore →
                </p>
              </Link>
            ))}
          </div>
          {remainingTopics.length > 0 && (
            <p className="mt-4 text-sm text-gray-700">
              More topics:{' '}
              {remainingTopics.map((t, i) => (
                <span key={t.slug}>
                  <Link
                    href={`/topics/${t.slug}`}
                    className="text-emerald-700 hover:text-emerald-800"
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
      <section className="border-hairline border-t bg-emerald-50 py-16">
        <div className="mx-auto max-w-lg px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Get the 5-minute Men&apos;s Health Digest
          </h2>
          <p className="mt-2 text-sm text-gray-700">Every week:</p>
          <ul className="mt-2 space-y-0.5 text-sm text-gray-700">
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
