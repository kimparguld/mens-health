import { EvidenceBadge, HowWeRateClaims, NewsletterSignupForm, RiskBadge } from "@menhealth/ui";
import { HypeVideoCard } from '@/components/ui/HypeVideoCard';
import { VerdictStamp } from '@/components/ui/VerdictStamp';
import { getFeaturedVideo, getTrendingVideos } from '@/lib/db/queries';
import { TOPIC_SEEDS } from '@/lib/youtube/topics';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: {
    absolute: "Hype Check — Legit, or Just Hype?",
  },
  description:
    "Evidence-based verdicts on trending products, courses, side hustles, and investment apps — legit, misleading, overpriced, risky, or scam.",
  openGraph: {
    title: "Hype Check — Legit, or Just Hype?",
    description:
      "Evidence-based verdicts on trending products, courses, side hustles, and investment apps.",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hype Check',
    description:
      "Evidence-based verdicts on trending products, courses, and side hustles — without the hype.",
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
  'ai-tools',
  'side-hustles',
  'online-courses',
  'viral-products',
  'marketplaces',
  'investment-apps',
  'giveaways',
  'travel-hacks',
];

async function FeaturedInsight() {
  const featuredVideo = await getFeaturedVideo();
  if (!featuredVideo) return null;

  const featuredSummary = featuredVideo.sourceVideos[0]?.summaries[0] ?? null;
  const featuredClaim = featuredVideo.claims[0] ?? null;
  const featuredWatchMin = featuredVideo.durationSeconds
    ? Math.ceil(featuredVideo.durationSeconds / 60)
    : null;

  if (!featuredSummary) return null;

  return (
    <section className="bg-surface py-12">
      <div className="mx-auto max-w-[1120px] px-4">
        <p className="mb-5 text-sm font-semibold tracking-widest text-ink-muted uppercase">
          Today&apos;s top insight
        </p>
        <div className="rounded-md border border-hairline bg-paper p-6 sm:p-8">
          {featuredClaim && (
            <div className="mb-4">
              <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                The claim
              </p>
              <p className="mt-1 text-lg font-semibold text-ink">
                &ldquo;{featuredClaim.text}&rdquo;
              </p>
            </div>
          )}
          <div className="mb-5">
            <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
              Our take
            </p>
            <p className="mt-1 leading-relaxed text-ink">
              {featuredSummary.shortSummary}
            </p>
          </div>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {featuredVideo.verdict?.verdict ? (
              <VerdictStamp verdict={featuredVideo.verdict.verdict} />
            ) : (
              <>
                {featuredClaim && (
                  <EvidenceBadge status={featuredClaim.evidenceStatus} />
                )}
                <RiskBadge level={featuredVideo.riskLevel} />
              </>
            )}
            {featuredWatchMin && (
              <span className="text-xs text-ink-muted">
                {featuredWatchMin} min watch
              </span>
            )}
            <span className="text-xs text-ink-muted">~ 2 min read</span>
          </div>
          <Link
            href={`/videos/${featuredVideo.slug}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-ink underline decoration-hairline underline-offset-4 hover:decoration-ink"
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
        <h2 className="mb-6 font-slab text-2xl font-bold text-ink">
          Trending summaries
        </h2>
        {videos.length === 0 ? (
          <p className="text-ink-muted">
            No published summaries yet. Check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video, index) => (
              <HypeVideoCard
                key={video.id}
                slug={video.slug}
                title={video.editorialTitle ?? video.sourceVideos[0]?.title ?? video.name}
                channelTitle={video.channel?.title ?? ''}
                thumbnailUrl={video.thumbnailUrl}
                shortSummary={video.sourceVideos[0]?.summaries[0]?.shortSummary ?? null}
                trendScore={video.trendScore}
                topicNames={video.topics.map((vt) => vt.topic.name)}
                riskLevel={video.riskLevel}
                evidenceLabel={deriveEvidenceLabel(video.evidenceScore)}
                verdict={video.verdict?.verdict}
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
      <section className="border-b border-hairline bg-paper py-16">
        <div className="mx-auto max-w-[1120px] px-4">
          <h1 className="max-w-2xl font-slab text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Trending products and side hustles,{' '}
            <span className="underline decoration-ink decoration-4 underline-offset-4">
              explained without the hype.
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-muted">
            We scan trending YouTube videos about products, courses, side
            hustles, and investment apps — then summarise the key claims and
            check them against available evidence.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/digest"
              className="rounded-sm bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-ink-muted"
            >
              Get the free digest
            </Link>
            <Link
              href="#trending"
              className="rounded-sm border border-hairline px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
            >
              Explore trending videos
            </Link>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-muted">
            <li>✓ Official YouTube embeds</li>
            <li>✓ AI-assisted summaries</li>
            <li>✓ Evidence-aware claim checks</li>
          </ul>
        </div>
      </section>

      <Suspense
        fallback={
          <div
            className="min-h-[420px] bg-surface py-12 lg:min-h-[358px]"
            aria-hidden
          />
        }
      >
        <FeaturedInsight />
      </Suspense>

      {/* Topic cards */}
      <section id="topics" className="py-14">
        <div className="mx-auto min-h-[652px] max-w-[1120px] px-4 lg:min-h-[354px]">
          <h2 className="mb-6 font-slab text-2xl font-bold text-ink">
            Browse by topic
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {featuredTopics.map((topic) => (
              <Link
                key={topic.slug}
                href={`/topics/${topic.slug}`}
                className="group rounded-md border border-hairline bg-surface p-4 transition-colors hover:border-ink"
              >
                <p className="font-semibold text-ink">
                  {topic.name}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-snug text-ink-muted">
                  {topic.description}
                </p>
                <p className="mt-3 text-xs font-medium text-ink underline decoration-hairline underline-offset-2 group-hover:decoration-ink">
                  Explore →
                </p>
              </Link>
            ))}
          </div>
          {remainingTopics.length > 0 && (
            <p className="mt-4 text-sm text-ink-muted">
              More topics:{' '}
              {remainingTopics.map((t, i) => (
                <span key={t.slug}>
                  <Link
                    href={`/topics/${t.slug}`}
                    className="text-ink underline decoration-hairline hover:decoration-ink"
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
              <div className="mb-6 h-8 w-48 animate-pulse rounded bg-hairline/40" />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-64 animate-pulse rounded-md bg-hairline/20"
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
      <section className="bg-surface py-16">
        <div className="mx-auto max-w-lg px-4 text-center">
          <h2 className="font-slab text-2xl font-bold text-ink">
            Get the 5-minute Hype Check Digest
          </h2>
          <p className="mt-2 text-sm text-ink-muted">Every week:</p>
          <ul className="mt-2 space-y-0.5 text-sm text-ink-muted">
            <li>5 trending videos summarised</li>
            <li>3 claims checked</li>
            <li>1 practical takeaway</li>
            <li>No get-rich-quick nonsense</li>
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
