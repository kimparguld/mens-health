import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TOPIC_SEEDS } from "@/lib/youtube/topics";
import { VideoCard } from "@/components/video/VideoCard";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { NewsletterSignupForm } from "@/components/ui/NewsletterSignupForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbSchema, buildItemListSchema } from "@/lib/seo/json-ld";
import { getTopicBySlug, getWeeklyRankingVideos } from "@/lib/db/queries";

function deriveEvidenceLabel(
  score: number | null | undefined,
): string | undefined {
  if (score == null) return undefined;
  if (score < 0.35) return "Weak";
  if (score < 0.6) return "Mixed";
  if (score < 0.8) return "Moderate";
  return "Strong";
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://menhealth-digest.com";

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
  if (!seed) return { title: "Not Found" };

  const title = `Best ${seed.name} Videos This Week`;
  const description = `The top-ranked ${seed.name.toLowerCase()} videos this week — summarised, scored, and checked for evidence quality.`;
  const canonical = `${APP_URL}/rankings/${topic}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
    twitter: { card: "summary_large_image", title, description },
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
    ? await getWeeklyRankingVideos(topicRecord.id, topic)
    : [];
  const isFallback = false;

  const breadcrumb = buildBreadcrumbSchema([
    { name: "Home", url: APP_URL },
    { name: "Rankings", url: `${APP_URL}/rankings` },
    { name: seed.name, url: `${APP_URL}/rankings/${topic}` },
  ]);

  const listSchema = buildItemListSchema(
    `Best ${seed.name} Videos This Week`,
    displayVideos.map((v) => ({
      name: v.title,
      url: `${APP_URL}/videos/${v.slug}`,
    })),
  );

  const now = new Date();
  const weekLabel = now.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <JsonLd schema={breadcrumb} />
      <JsonLd schema={listSchema} />
      <main>
        {/* Header */}
        <section className="border-b border-gray-100 bg-white py-12">
          <div className="mx-auto max-w-[1120px] px-4">
            <nav className="mb-4 flex items-center gap-2 text-xs text-gray-400">
              <Link href="/" className="hover:text-gray-600">
                Home
              </Link>
              <span>/</span>
              <Link href={`/topics/${topic}`} className="hover:text-gray-600">
                {seed.name}
              </Link>
              <span>/</span>
              <span className="text-gray-600">This Week</span>
            </nav>
            <p className="mb-2 text-xs font-semibold tracking-widest text-emerald-600 uppercase">
              Weekly ranking
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Best {seed.name} Videos This Week
            </h1>
            <p className="mt-3 max-w-xl text-base text-gray-500">
              {isFallback
                ? `Top-ranked ${seed.name.toLowerCase()} videos on YouTube — summarised and scored for evidence quality.`
                : `Top-ranked ${seed.name.toLowerCase()} videos added this week — summarised and scored for evidence quality.`}
            </p>
            <p className="mt-2 text-xs text-gray-400">
              {isFallback ? "All-time top picks" : `Updated ${weekLabel}`}
            </p>
          </div>
        </section>

        {/* Video list */}
        <section className="py-10">
          <div className="mx-auto max-w-[1120px] px-4">
            {displayVideos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
                <p className="text-gray-500">
                  No videos indexed yet for this topic.{" "}
                  <Link href="/" className="text-emerald-600 hover:underline">
                    Browse all topics →
                  </Link>
                </p>
              </div>
            ) : (
              <ol className="space-y-4">
                {displayVideos.map((video, index) => (
                  <li key={video.id} className="flex items-start gap-4">
                    <span className="mt-4 w-8 shrink-0 text-center text-xl font-bold text-gray-200">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <VideoCard
                        slug={video.slug}
                        title={video.title}
                        channelTitle={video.channel?.title ?? ""}
                        thumbnailUrl={video.thumbnailUrl}
                        shortSummary={video.summaries[0]?.shortSummary ?? null}
                        trendScore={video.trendScore}
                        topicNames={video.topics.map((vt) => vt.topic.name)}
                        riskLevel={video.riskLevel}
                        evidenceLabel={deriveEvidenceLabel(video.evidenceScore)}
                        durationSeconds={video.durationSeconds ?? undefined}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        {/* Cross-links to other weekly rankings */}
        <section className="border-t border-gray-100 bg-gray-50 py-10">
          <div className="mx-auto max-w-[1120px] px-4">
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
        <section className="py-12">
          <div className="mx-auto max-w-xl px-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h2 className="mb-1 text-base font-semibold text-gray-900">
                Get the weekly {seed.name} digest
              </h2>
              <p className="mb-5 text-sm text-gray-500">
                Top 5 videos, summarised claims, and evidence notes — every
                Friday.
              </p>
              <NewsletterSignupForm />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1120px] px-4 pb-10">
          <Disclaimer />
        </div>
      </main>
    </>
  );
}
