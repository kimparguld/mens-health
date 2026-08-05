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
import { MEDICAL_DISCLAIMER_TEXT, SITE_NAME } from '@/lib/site-brand';
import {
  buildArticleSchema,
  buildVideoObjectSchema,
} from '@menhealth/core-seo';
import {
  AdSlot,
  AffiliateDisclosure,
  Disclaimer,
  EvidenceBadge,
  JsonLd,
  NewsletterFooterCTA,
  NewsletterInlineCTA,
  PageBreadcrumbs,
  RiskBadge,
  SponsorBlock,
  YouTubePlayer,
} from '@menhealth/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';
import { PremiumSection } from './PremiumSection';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.menhealth-digest.com';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const video = await getVideoBySlugForMeta(slug);

  if (!video) return { title: 'Video Not Found' };

  const description =
    video.summaries[0]?.shortSummary ?? video.description ?? '';
  const canonical = `${APP_URL}/videos/${slug}`;
  const displayTitle = video.editorialTitle ?? video.title;

  return {
    title: displayTitle,
    description,
    alternates: { canonical },
    keywords: [
      "men's health",
      'health video summary',
      'evidence-based health',
      video.title,
    ],
    openGraph: {
      title: displayTitle,
      description,
      url: canonical,
      type: 'article',
      publishedTime: new Date(video.publishedAt).toISOString(),
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
        permanentRedirect(`/videos/${canonicalSlug}`);
      }
    }
    notFound();
  }

  const summary = video.summaries[0];
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

  const videoSchema = buildVideoObjectSchema({
    title: video.title,
    description: summary?.shortSummary ?? video.description ?? '',
    thumbnailUrl: video.thumbnailUrl,
    publishedAt: video.publishedAt,
    channelTitle: video.channel.title,
    youtubeVideoId: video.youtubeVideoId,
    appUrl: APP_URL,
    slug: video.slug,
    durationSeconds: video.durationSeconds,
  });

  const displayTitle = video.editorialTitle ?? video.title;

  const articleSchema = buildArticleSchema({
    headline: displayTitle,
    description: summary?.shortSummary ?? video.description ?? '',
    imageUrl: video.thumbnailUrl,
    publishedAt: video.publishedAt,
    updatedAt: video.updatedAt,
    authorName: summary?.reviewerName ?? undefined,
    url: `${APP_URL}/videos/${video.slug}`,
    siteName: SITE_NAME,
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <PageBreadcrumbs
        baseUrl={APP_URL}
        trail={[
          ...(firstTopic
            ? [{ label: firstTopic.name, href: `/topics/${firstTopic.slug}` }]
            : []),
          { label: displayTitle, href: `/videos/${video.slug}` },
        ]}
      />
      <JsonLd schema={videoSchema} />
      <JsonLd schema={articleSchema} />

      {/* Metadata badges */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {video.topics.slice(0, 2).map((vt) => (
          <Link
            key={vt.topicId}
            href={`/topics/${vt.topic.slug}`}
            className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 hover:bg-emerald-200"
          >
            {vt.topic.name}
          </Link>
        ))}
        <EvidenceBadge
          status={video.claims[0]?.evidenceStatus ?? 'NOT_CHECKED'}
        />
        <RiskBadge level={video.riskLevel} />
      </div>

      {/* Title */}
      <h1 className="mb-2 text-3xl leading-tight font-bold text-gray-900">
        {displayTitle}
      </h1>
      {video.editorialTitle && video.editorialTitle !== video.title && (
        <p className="mb-2 text-sm text-gray-600">
          Originally titled: &ldquo;{video.title}&rdquo;
        </p>
      )}

      {/* Meta */}
      <p className="mb-1 text-sm text-gray-700">
        Channel:{' '}
        <a
          href={`https://www.youtube.com/channel/${video.channel.youtubeId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {video.channel.title}
        </a>
        {' · '}
        <a
          href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Watch on YouTube ↗
        </a>
      </p>
      {summary?.reviewerName && (
        <p className="mb-1 text-sm text-gray-700">
          Reviewed by {summary.reviewerName}
          {summary.reviewerCredentials
            ? `, ${summary.reviewerCredentials}`
            : ''}
        </p>
      )}
      <p className="mb-6 text-xs text-gray-600">
        Published {new Date(video.publishedAt).toLocaleDateString()}
        {new Date(video.updatedAt).getTime() !==
          new Date(video.publishedAt).getTime() &&
          ` · Updated ${new Date(video.updatedAt).toLocaleDateString()}`}
      </p>

      {/* Official YouTube embed */}
      <div className="mb-8">
        <YouTubePlayer
          videoId={video.youtubeVideoId}
          title={video.title}
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
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <span className="font-semibold">Best for: </span>
              {summary.targetAudience}
            </div>
          )}
          {warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span className="font-semibold">Be careful: </span>
              {warnings[0]}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <>
          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">
              Summary
            </h2>
            <p className="text-gray-700">{summary.longSummary}</p>
          </section>

          {takeaways.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-xl font-semibold text-gray-900">
                Key Takeaways
              </h2>
              <ul className="space-y-2">
                {takeaways.map((item, index) => (
                  <li key={index} className="flex gap-2 text-gray-700">
                    <span className="mt-0.5 text-emerald-500">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {warnings.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-xl font-semibold text-gray-900">
                What to Be Careful About
              </h2>
              <ul className="space-y-2">
                {warnings.map((item, index) => (
                  <li key={index} className="flex gap-2 text-gray-700">
                    <span className="mt-0.5 text-amber-500">⚠</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <NewsletterInlineCTA
        headline="Enjoying this breakdown? Get one every week."
        description="5 trending videos summarised · 3 claims checked · 1 practical takeaway — every week. No miracle-cure nonsense."
      />

      <AdSlot slot="between-content" className="mb-8" config={adsConfig} />

      {/* Claims */}
      {video.claims.length > 0 && (
        <section className="my-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">
            Health Claims in This Video
          </h2>
          <div className="space-y-4">
            {video.claims
              .slice(0, 3)
              .map((claim: (typeof video.claims)[number]) => (
                <Link
                  key={claim.id}
                  href={`/claims/${claim.slug ?? claim.id}`}
                  className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-emerald-300"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <RiskBadge level={claim.riskLevel} />
                    <EvidenceBadge status={claim.evidenceStatus} />
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {claim.text}
                  </p>
                  {claim.explanation && (
                    <p className="mt-1 text-xs text-gray-700">
                      {claim.explanation}
                    </p>
                  )}
                  <p className="mt-2 text-xs font-medium text-emerald-600">
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
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Topics</h2>
          <div className="flex flex-wrap gap-2">
            {video.topics.map((vt: (typeof video.topics)[number]) => (
              <Link
                key={vt.topicId}
                href={`/topics/${vt.topic.slug}`}
                className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800 hover:bg-emerald-200"
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
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Key terms in this video
          </h2>
          <div className="flex flex-wrap gap-2">
            {glossaryTerms.map((term) => (
              <Link
                key={term.slug}
                href={`/glossary/${term.slug}`}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-emerald-300 hover:text-emerald-700"
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
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Related reviews
          </h2>
          <ul className="space-y-2">
            {relatedVideos.map((rv) => (
              <li key={rv.id}>
                <Link
                  href={`/videos/${rv.slug}`}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  {rv.title}
                </Link>
                <span className="ml-2 text-xs text-gray-600">
                  {rv.channel.title}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AdSlot slot="article-footer" className="mb-8" config={adsConfig} />

      {/* Embeddable badge */}
      <section className="mb-8 rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">
          Are you the creator of this video?
        </h2>
        <p className="mb-3 text-sm text-gray-700">
          Embed this badge on your site or in your video description to link
          back to our review.
        </p>
        <img
          src={`${APP_URL}/badge/${video.slug}`}
          alt="Reviewed by MenHealth Digest"
          width={210}
          height={50}
          className="mb-3"
        />
        <textarea
          readOnly
          rows={2}
          className="w-full rounded border border-gray-200 bg-gray-50 p-2 font-mono text-xs text-gray-600"
          defaultValue={`<a href="${APP_URL}/videos/${video.slug}"><img src="${APP_URL}/badge/${video.slug}" alt="Reviewed by MenHealth Digest" width="210" height="50" /></a>`}
        />
      </section>

      {/* Affiliate links */}
      {affiliateLinks.length > 0 && (
        <section className="mb-8">
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
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  {link.label}
                </a>
                {link.commission && (
                  <span className="ml-2 text-xs text-gray-600">
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
      <div className="mb-8">
        <NewsletterFooterCTA
          headline="Get the weekly digest"
          description="5 videos summarised · 3 claims checked · 1 practical takeaway"
        />
      </div>

      {/* Disclaimer — required on every video page */}
      <Disclaimer text={MEDICAL_DISCLAIMER_TEXT} />
    </main>
  );
}
