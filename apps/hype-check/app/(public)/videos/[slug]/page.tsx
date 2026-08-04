import { EvidenceStamp } from '@/components/ui/EvidenceStamp';
import { RiskStamp } from '@/components/ui/RiskStamp';
import { VerdictHero } from '@/components/ui/VerdictHero';
import { adsConfig } from '@/lib/ads-config';
import {
  getPublishedVideoSlugByYouTubeId,
  getRelatedVideos,
  getVideoBySlug,
  getVideoBySlugForMeta,
} from '@/lib/db/queries';
import {
  getActiveSponsor,
  getAffiliateLinksForTopic,
} from '@/lib/monetization/resolvers';
import { getGlossaryTermsForTopics } from '@/lib/seo/glossary';
import { DISCLAIMER_TEXT, SITE_NAME } from '@/lib/site-brand';
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildVideoObjectSchema,
} from '@menhealth/core-seo';
import {
  AdSlot,
  AffiliateDisclosure,
  Disclaimer,
  JsonLd,
  NewsletterSignupForm,
  NewsletterStickyCTA,
  SponsorBlock,
  YouTubePlayer,
} from '@menhealth/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { PremiumSection } from './PremiumSection';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.hype-check.net';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const video = await getVideoBySlugForMeta(slug);

  if (!video) return { title: 'Video Not Found' };

  const sourceVideo = video.sourceVideos[0];
  const description =
    sourceVideo?.summaries[0]?.shortSummary ?? video.description ?? '';
  const canonical = `${APP_URL}/videos/${slug}`;
  const displayTitle = video.editorialTitle ?? sourceVideo?.title ?? video.name;
  const publishedAt =
    video.publishedAt ?? sourceVideo?.publishedAt ?? video.createdAt;

  return {
    title: displayTitle,
    description,
    alternates: { canonical },
    keywords: [
      'legit or scam',
      'video review summary',
      'evidence-based review',
      displayTitle,
    ],
    openGraph: {
      title: displayTitle,
      description,
      url: canonical,
      type: 'article',
      publishedTime: new Date(publishedAt).toISOString(),
      modifiedTime: new Date(video.updatedAt).toISOString(),
      images: video.thumbnailUrl ? [{ url: video.thumbnailUrl }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: displayTitle,
      description,
      images: video.thumbnailUrl ? [video.thumbnailUrl] : [],
    },
  };
}

/**
 * Extracts the YouTube video ID from a slug.
 * Slugs are generated as `${titleBase}-${youtubeVideoId}` where videoId is 11 chars.
 */
function extractYouTubeId(slug: string): string | null {
  // YouTube IDs are exactly 11 chars: letters, digits, - and _
  const match = slug.match(/[-_a-zA-Z0-9]{11}$/);
  return match?.[0] ?? null;
}

export default async function VideoPage({ params }: { params: Params }) {
  const { slug } = await params;
  const video = await getVideoBySlug(slug);

  if (!video) {
    // Slug may have changed (e.g. after clean-video-titles migration).
    // Try to find the video by its YouTube ID embedded at the end of the slug.
    const youtubeId = extractYouTubeId(slug);
    if (youtubeId) {
      const canonicalSlug = await getPublishedVideoSlugByYouTubeId(youtubeId);
      if (canonicalSlug && canonicalSlug !== slug) {
        redirect(`/videos/${canonicalSlug}`);
      }
    }
    notFound();
  }

  const sourceVideo = video.sourceVideos[0];
  const summary = sourceVideo?.summaries[0];
  const youtubeVideoId =
    video.youtubeVideoId ?? sourceVideo?.youtubeVideoId ?? '';
  const publishedAt =
    video.publishedAt ?? sourceVideo?.publishedAt ?? video.createdAt;
  const takeaways: string[] = Array.isArray(summary?.takeaways)
    ? (summary.takeaways as string[])
    : [];
  const warnings: string[] = Array.isArray(summary?.warnings)
    ? (summary.warnings as string[])
    : [];

  const firstTopic = video.topics[0]?.topic;
  const glossaryTerms = getGlossaryTermsForTopics(
    video.topics.map((vt: (typeof video.topics)[number]) => vt.topic.slug)
  );

  const [sponsor, affiliateLinks, relatedVideos] = await Promise.all([
    getActiveSponsor(),
    getAffiliateLinksForTopic(firstTopic?.slug ?? null),
    getRelatedVideos(firstTopic?.id, video.id),
  ]);

  const displayTitle = video.editorialTitle ?? sourceVideo?.title ?? video.name;

  const videoSchema = buildVideoObjectSchema({
    title: displayTitle,
    description: summary?.shortSummary ?? video.description ?? '',
    thumbnailUrl: video.thumbnailUrl,
    publishedAt,
    channelTitle: video.channel?.title ?? '',
    youtubeVideoId,
    appUrl: APP_URL,
    slug: video.slug,
    durationSeconds: video.durationSeconds,
  });

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: APP_URL },
    ...(firstTopic
      ? [{ name: firstTopic.name, url: `${APP_URL}/topics/${firstTopic.slug}` }]
      : []),
    { name: displayTitle, url: `${APP_URL}/videos/${video.slug}` },
  ]);

  const articleSchema = buildArticleSchema({
    headline: displayTitle,
    description: summary?.shortSummary ?? video.description ?? '',
    imageUrl: video.thumbnailUrl,
    publishedAt,
    updatedAt: video.updatedAt,
    authorName: summary?.reviewerName ?? undefined,
    url: `${APP_URL}/videos/${video.slug}`,
    siteName: SITE_NAME,
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd schema={videoSchema} />
      <JsonLd schema={breadcrumbSchema} />
      <JsonLd schema={articleSchema} />

      {/* Breadcrumb */}
      <nav className="text-ink-muted/60 mb-6 text-sm">
        <Link href="/" className="hover:underline">
          Home
        </Link>{' '}
        /{' '}
        {video.topics[0] && (
          <>
            <Link
              href={`/topics/${video.topics[0].topic.slug}`}
              className="hover:underline"
            >
              {video.topics[0].topic.name}
            </Link>{' '}
            /{' '}
          </>
        )}
        <span className="text-ink-muted">{displayTitle}</span>
      </nav>

      {/* Metadata badges */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {video.topics.slice(0, 2).map((vt) => (
          <Link
            key={vt.topicId}
            href={`/topics/${vt.topic.slug}`}
            className="bg-ink-muted/10 hover:bg-ink-muted/20 text-ink-muted/80 rounded-full px-2.5 py-0.5 text-xs font-medium"
          >
            {vt.topic.name}
          </Link>
        ))}
        <EvidenceStamp
          status={video.claims[0]?.evidenceStatus ?? 'NOT_CHECKED'}
        />
        <RiskStamp level={video.riskLevel} />
      </div>

      {/* Title */}
      <h1 className="text-ink-muted mb-2 text-3xl leading-tight font-bold">
        {displayTitle}
      </h1>
      {video.editorialTitle &&
        sourceVideo?.title &&
        video.editorialTitle !== sourceVideo.title && (
          <p className="text-ink-muted/50 mb-2 text-sm">
            Originally titled: &ldquo;{sourceVideo.title}&rdquo;
          </p>
        )}

      {/* Meta */}
      <p className="text-ink-muted/60 mb-1 text-sm">
        Channel:{' '}
        <a
          href={`https://www.youtube.com/channel/${video.channel?.youtubeId ?? ''}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink hover:underline"
        >
          {video.channel?.title ?? ''}
        </a>
        {' · '}
        <a
          href={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink hover:underline"
        >
          Watch on YouTube ↗
        </a>
      </p>
      {summary?.reviewerName && (
        <p className="text-ink-muted/60 mb-1 text-sm">
          Reviewed by {summary.reviewerName}
          {summary.reviewerCredentials
            ? `, ${summary.reviewerCredentials}`
            : ''}
        </p>
      )}
      <p className="text-ink-muted/50 mb-6 text-xs">
        Published {new Date(publishedAt).toLocaleDateString()}
        {new Date(video.updatedAt).getTime() !==
          new Date(publishedAt).getTime() &&
          ` · Updated ${new Date(video.updatedAt).toLocaleDateString()}`}
      </p>

      {/* Verdict */}
      <VerdictHero
        verdict={video.verdict?.verdict}
        rationale={video.verdict?.rationale}
      />

      {/* Official YouTube embed */}
      <div className="mb-8">
        <YouTubePlayer
          videoId={youtubeVideoId}
          title={displayTitle}
          thumbnailUrl={video.thumbnailUrl}
        />
      </div>

      {/* Sponsor placement */}
      {sponsor && (
        <div className="mb-8">
          <SponsorBlock
            name={sponsor.name}
            copyText={sponsor.copyText}
            ctaText={sponsor.ctaText}
            ctaUrl={sponsor.ctaUrl}
          />
        </div>
      )}

      {/* Target audience + warnings teaser */}
      {summary && (
        <div className="mb-8 space-y-3">
          {summary.targetAudience && (
            <div className="border-hairline text-ink-muted/90 bg-paper rounded-lg border px-4 py-3 text-sm">
              <span className="font-semibold">Best for: </span>
              {summary.targetAudience}
            </div>
          )}
          {warnings.length > 0 && (
            <div className="border-verdict-risky/30 bg-verdict-risky/10 text-ink-muted rounded-lg border px-4 py-3 text-sm">
              <span className="text-verdict-risky font-semibold">
                Be careful:{' '}
              </span>
              {warnings[0]}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <>
          <section className="mb-8">
            <h2 className="text-ink-muted mb-3 text-xl font-semibold">
              Summary
            </h2>
            <p className="text-ink-muted/90">{summary.longSummary}</p>
          </section>

          {takeaways.length > 0 && (
            <section className="mb-8">
              <h2 className="text-ink-muted mb-3 text-xl font-semibold">
                Key Takeaways
              </h2>
              <ul className="space-y-2">
                {takeaways.map((item, index) => (
                  <li key={index} className="text-ink-muted/90 flex gap-2">
                    <span className="text-ink">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {warnings.length > 0 && (
            <section className="mb-8">
              <h2 className="text-ink-muted mb-3 text-xl font-semibold">
                What to Be Careful About
              </h2>
              <ul className="space-y-2">
                {warnings.map((item, index) => (
                  <li key={index} className="text-ink-muted/90 flex gap-2">
                    <span className="text-verdict-risky">⚠</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <AdSlot slot="between-content" className="mb-8" config={adsConfig} />

      {/* Claims */}
      {video.claims.length > 0 && (
        <section className="mb-8">
          <h2 className="text-ink-muted mb-3 text-xl font-semibold">
            Claims in This Video
          </h2>
          <div className="space-y-4">
            {video.claims
              .slice(0, 3)
              .map((claim: (typeof video.claims)[number]) => (
                <Link
                  key={claim.id}
                  href={`/claims/${claim.slug ?? claim.id}`}
                  className="hover:border-ink-muted/30 border-hairline block rounded-lg border p-4 transition-colors"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <RiskStamp level={claim.riskLevel} />
                    <EvidenceStamp status={claim.evidenceStatus} />
                  </div>
                  <p className="text-ink-muted text-sm font-medium">
                    {claim.text}
                  </p>
                  {claim.explanation && (
                    <p className="text-ink-muted/60 mt-1 text-xs">
                      {claim.explanation}
                    </p>
                  )}
                  <p className="text-ink-muted/60 mt-2 text-xs font-medium">
                    View evidence review →
                  </p>
                </Link>
              ))}
          </div>
          {video.claims.length > 3 && (
            <div className="mt-4">
              <Suspense fallback={null}>
                <PremiumSection
                  claims={video.claims.slice(3).map((c) => ({
                    id: c.id,
                    text: c.text,
                    riskLevel: c.riskLevel,
                    evidenceStatus: c.evidenceStatus,
                    explanation: c.explanation ?? null,
                  }))}
                />
              </Suspense>
            </div>
          )}
        </section>
      )}

      {/* Topics */}
      {video.topics.length > 0 && (
        <section className="mt-8 mb-8">
          <h2 className="text-ink-muted mb-3 text-xl font-semibold">Topics</h2>
          <div className="flex flex-wrap gap-2">
            {video.topics.map((vt: (typeof video.topics)[number]) => (
              <Link
                key={vt.topicId}
                href={`/topics/${vt.topic.slug}`}
                className="bg-ink-muted/10 hover:bg-ink-muted/20 text-ink-muted/80 rounded-full px-3 py-1 text-sm font-medium"
              >
                {vt.topic.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Key terms */}
      {glossaryTerms.length > 0 && (
        <section className="mb-8">
          <h2 className="text-ink-muted mb-3 text-lg font-semibold">
            Key terms in this video
          </h2>
          <div className="flex flex-wrap gap-2">
            {glossaryTerms.map((term) => (
              <Link
                key={term.slug}
                href={`/glossary/${term.slug}`}
                className="hover:text-ink-muted hover:border-ink-muted/30 border-hairline text-ink-muted/90 rounded-full border bg-white px-3 py-1.5 text-sm"
                title={term.shortDefinition}
              >
                {term.term}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Related reviews */}
      {relatedVideos.length > 0 && (
        <section className="mb-8">
          <h2 className="text-ink-muted mb-3 text-lg font-semibold">
            Related reviews
          </h2>
          <ul className="space-y-2">
            {relatedVideos.map((rv) => (
              <li key={rv.id}>
                <Link
                  href={`/videos/${rv.slug}`}
                  className="text-ink text-sm font-medium hover:underline"
                >
                  {rv.editorialTitle ?? rv.name}
                </Link>
                <span className="text-ink-muted/50 ml-2 text-xs">
                  {rv.channel?.title ?? ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AdSlot slot="article-footer" className="mb-8" config={adsConfig} />

      {/* Embeddable badge */}
      <section className="border-hairline mb-8 rounded-lg border p-4">
        <h2 className="text-ink-muted mb-2 text-sm font-semibold">
          Are you the creator of this video?
        </h2>
        <p className="text-ink-muted/60 mb-3 text-sm">
          Embed this badge on your site or in your video description to link
          back to our review.
        </p>
        <img
          src={`${APP_URL}/badge/${video.slug}`}
          alt="Reviewed by Hype Check"
          width={210}
          height={50}
          className="mb-3"
        />
        <textarea
          readOnly
          rows={2}
          className="border-hairline bg-paper text-ink-muted/60 w-full rounded border p-2 font-mono text-xs"
          defaultValue={`<a href="${APP_URL}/videos/${video.slug}"><img src="${APP_URL}/badge/${video.slug}" alt="Reviewed by Hype Check" width="210" height="50" /></a>`}
        />
      </section>

      {/* Affiliate links */}
      {affiliateLinks.length > 0 && (
        <section className="mb-8">
          <h2 className="text-ink-muted mb-3 text-lg font-semibold">
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
                  <span className="text-ink-muted/50 ml-2 text-xs">
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

      <section className="border-hairline bg-ink-muted mb-8 rounded-xl border px-6 py-8 text-center">
        <div className="mx-auto max-w-xl px-4 text-center">
          <p className="text-ink mb-1 text-xs font-semibold tracking-wide uppercase">
            Free newsletter
          </p>
          <h2 className="mb-2 text-2xl font-bold text-white">
            Get the weekly digest
          </h2>
          <p className="mb-6 text-sm text-white/60">
            Join readers who want clear, evidence-aware verdicts on trending
            hype.
          </p>
          <NewsletterSignupForm />
          <p className="mt-3 text-xs text-white/40">
            Unsubscribe any time. No spam.
          </p>
        </div>
      </section>

      {/* Disclaimer — required on every video page */}
      <Disclaimer
        text={DISCLAIMER_TEXT}
        className="border-gray-200 bg-white text-gray-500"
      />
      <NewsletterStickyCTA label="Free weekly Hype Check digest" />
    </main>
  );
}
