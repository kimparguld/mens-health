import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TOPIC_SEEDS } from "@/lib/youtube/topics";
import { getTopicBySlug, getWeeklyRankingVideos } from "@/lib/db/queries";
import { createMetadata } from "@/lib/seo/site-metadata";
import { VideoCard, Disclaimer, EvidenceBadge, NewsletterInlineCTA, Breadcrumbs, JsonLd } from "@menhealth/ui";
import { MEDICAL_DISCLAIMER_TEXT } from "@/lib/site-brand";
import { buildBreadcrumbSchema } from "@menhealth/core-seo";
import { db } from "@/lib/db/prisma";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.menhealth-digest.com";

type Params = Promise<{ slug: string }>;

function getWeekLabel(): string {
  const now = new Date();
  const y = now.getFullYear();
  // ISO week number
  const start = new Date(y, 0, 1);
  const week = Math.ceil(
    ((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7,
  );
  return `Week ${week}, ${y}`;
}

export async function generateStaticParams() {
  return TOPIC_SEEDS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const seed = TOPIC_SEEDS.find((t) => t.slug === slug);
  if (!seed) return { title: "Not Found" };

  return createMetadata({
    title: `Best ${seed.name} Videos This Week — MenHealth Digest`,
    description: `The top trending ${seed.name.toLowerCase()} videos summarised this week. Evidence labels, practical takeaways, and claim checks — no hype.`,
    path: `/weekly/${slug}`,
  });
}

export default async function WeeklyTrendPage({ params }: { params: Params }) {
  const { slug } = await params;
  const seed = TOPIC_SEEDS.find((t) => t.slug === slug);
  if (!seed) notFound();

  const topic = await getTopicBySlug(slug);
  if (!topic) notFound();

  const videos = await getWeeklyRankingVideos(topic.id);
  const weekLabel = getWeekLabel();

  const topVideo = videos[0] ?? null;
  const topVideoSummary = topVideo?.summaries[0] ?? null;

  // Fetch checked claims from this week's videos (not NOT_CHECKED)
  const videoIds = videos.map((v) => v.id);
  const checkedClaims =
    videoIds.length > 0
      ? await db.claim.findMany({
          where: {
            videoId: { in: videoIds },
            evidenceStatus: { not: "NOT_CHECKED" },
            slug: { not: null },
          },
          take: 3,
          orderBy: { riskLevel: "desc" },
          select: {
            id: true,
            text: true,
            evidenceStatus: true,
            riskLevel: true,
            slug: true,
          },
        })
      : [];

  // Most overhyped = highest risk claim that is WEAK or UNSUPPORTED
  const overhypedClaim =
    (await (videoIds.length > 0
      ? db.claim.findFirst({
          where: {
            videoId: { in: videoIds },
            evidenceStatus: { in: ["WEAK", "UNSUPPORTED"] },
          },
          orderBy: { riskLevel: "desc" },
          select: { text: true, evidenceStatus: true, slug: true },
        })
      : null)) ?? null;

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: APP_URL },
    { name: "Weekly trends", url: `${APP_URL}/weekly` },
    { name: seed.name, url: `${APP_URL}/weekly/${slug}` },
  ]);

  return (
    <>
      <JsonLd schema={breadcrumbSchema} />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Breadcrumbs
          items={[
            { label: "Weekly trends", href: "/weekly" },
            { label: seed.name },
          ]}
        />

        <header className="mb-12">
          <p className="mb-1 text-xs font-semibold tracking-wide text-emerald-700 uppercase">
            {weekLabel}
          </p>
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900">
            Best {seed.name} Videos This Week
          </h1>
          <p className="text-base text-gray-600">
            The top trending {seed.name.toLowerCase()} content, summarised and
            checked. Evidence labels on every video. No miracle cures.
          </p>
        </header>

        {videos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
            <p className="text-gray-500">
              No videos published this week yet. Check back soon.
            </p>
            <Link
              href={`/topics/${slug}`}
              className="mt-3 inline-block text-sm font-semibold text-emerald-600 hover:underline"
            >
              Browse all {seed.name} videos →
            </Link>
          </div>
        ) : (
          <>
            {/* Top Video This Week */}
            {topVideo && (
              <section className="mb-12">
                <p className="mb-3 text-xs font-semibold tracking-wide text-emerald-700 uppercase">
                  Top Video This Week
                </p>
                <div className="rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                  <VideoCard
                    slug={topVideo.slug}
                    title={topVideo.title}
                    channelTitle={topVideo.channel.title}
                    thumbnailUrl={topVideo.thumbnailUrl}
                    shortSummary={topVideoSummary?.shortSummary ?? null}
                    trendScore={topVideo.trendScore}
                    topicNames={topVideo.topics.map((vt) => vt.topic.name)}
                    riskLevel={topVideo.riskLevel}
                    evidenceLabel={
                      topVideo.evidenceScore != null ? "SUPPORTED" : undefined
                    }
                    durationSeconds={topVideo.durationSeconds ?? undefined}
                    customSizes="100vw"
                    priority
                  />
                </div>
                {topVideoSummary?.takeaways &&
                  Array.isArray(topVideoSummary.takeaways) &&
                  (topVideoSummary.takeaways as string[]).length > 0 && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                      <p className="mb-2 text-xs font-semibold tracking-wide text-emerald-700 uppercase">
                        Practical Takeaway
                      </p>
                      <p className="text-sm text-emerald-800">
                        {(topVideoSummary.takeaways as string[])[0]}
                      </p>
                    </div>
                  )}
              </section>
            )}

            {/* 3 Claims Checked */}
            {checkedClaims.length > 0 && (
              <section className="mb-12">
                <p className="mb-3 text-xs font-semibold tracking-wide text-emerald-700 uppercase">
                  {checkedClaims.length} Claim
                  {checkedClaims.length !== 1 ? "s" : ""} Checked This Week
                </p>
                <ul className="space-y-3">
                  {checkedClaims.map((claim) => (
                    <li
                      key={claim.id}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm"
                    >
                      <span className="flex-1 text-gray-800">
                        &ldquo;{claim.text}&rdquo;
                      </span>
                      <EvidenceBadge status={claim.evidenceStatus} />
                      {claim.slug && (
                        <Link
                          href={`/claims/${claim.slug}`}
                          className="text-xs font-medium text-emerald-700 hover:underline"
                        >
                          See evidence →
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Most Overhyped Claim */}
            {overhypedClaim && (
              <section className="mb-12 rounded-xl border border-red-200 bg-red-50 px-5 py-5">
                <p className="mb-2 text-xs font-semibold tracking-wide text-red-700 uppercase">
                  Most Overhyped Claim This Week
                </p>
                <p className="text-sm font-medium text-gray-900">
                  &ldquo;{overhypedClaim.text}&rdquo;
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <EvidenceBadge status={overhypedClaim.evidenceStatus} />
                  {overhypedClaim.slug && (
                    <Link
                      href={`/claims/${overhypedClaim.slug}`}
                      className="text-xs text-red-700 hover:underline"
                    >
                      See the evidence →
                    </Link>
                  )}
                </div>
              </section>
            )}

            {/* All videos */}
            <p className="mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">
              All videos this week
            </p>
            <ol className="space-y-16">
              {videos.map((video, i) => {
                const summary = video.summaries[0];
                const topicNames = video.topics.map((vt) => vt.topic.name);

                return (
                  <li key={video.id} className="relative">
                    <div className="absolute -top-3 -left-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white bg-emerald-700 text-lg font-bold text-white">
                      {i + 1}
                    </div>
                    <VideoCard
                      slug={video.slug}
                      title={video.title}
                      channelTitle={video.channel.title}
                      thumbnailUrl={video.thumbnailUrl}
                      shortSummary={summary?.shortSummary ?? null}
                      trendScore={video.trendScore}
                      topicNames={topicNames}
                      riskLevel={video.riskLevel}
                      evidenceLabel={
                        video.evidenceScore != null
                          ? "SUPPORTED"
                          : "NOT_CHECKED"
                      }
                      durationSeconds={video.durationSeconds ?? undefined}
                      customSizes="100vw"
                    />
                    {summary?.takeaways &&
                      Array.isArray(summary.takeaways) &&
                      (summary.takeaways as string[]).length > 0 && (
                        <p className="mt-3 ml-3 text-sm text-gray-600">
                          <span className="font-medium">Takeaway: </span>
                          {(summary.takeaways as string[])[0]}
                        </p>
                      )}
                    <Link
                      href={`/videos/${video.slug}`}
                      className="mt-2 ml-3 inline-block text-sm font-medium text-emerald-700 hover:underline"
                    >
                      Read full summary →
                    </Link>
                  </li>
                );
              })}
            </ol>
          </>
        )}

        <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 px-5 py-5">
          <p className="mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Explore More
          </p>
          <ul className="flex flex-wrap gap-3 text-sm">
            <li>
              <Link
                href={`/topics/${slug}`}
                className="font-medium text-emerald-700 hover:underline"
              >
                {seed.name} topic hub →
              </Link>
            </li>
            <li>
              <Link
                href={`/rankings/${slug}`}
                className="font-medium text-emerald-700 hover:underline"
              >
                {seed.name} rankings →
              </Link>
            </li>
            <li>
              <Link
                href="/topics"
                className="font-medium text-gray-600 hover:underline"
              >
                All topics →
              </Link>
            </li>
            <li>
              <Link
                href="/creators"
                className="font-medium text-gray-600 hover:underline"
              >
                All creators →
              </Link>
            </li>
          </ul>
        </div>

        <div className="mt-10">
          <NewsletterInlineCTA
            headline={`Get next week's best ${seed.name.toLowerCase()} videos in your inbox`}
            description="5 trending videos summarised · 3 claims checked · 1 practical takeaway — every week. No miracle-cure nonsense."
          />
        </div>

        <nav className="mt-8 border-t border-gray-200 pt-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Other weekly trend pages
          </h2>
          <div className="flex flex-wrap gap-2">
            {TOPIC_SEEDS.filter((t) => t.slug !== slug).map((t) => (
              <Link
                key={t.slug}
                href={`/weekly/${t.slug}`}
                className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600 transition-colors hover:border-emerald-300 hover:text-emerald-800"
              >
                {t.name}
              </Link>
            ))}
          </div>
        </nav>

        <Disclaimer text={MEDICAL_DISCLAIMER_TEXT} className="mt-10" />
      </main>
    </>
  );
}
