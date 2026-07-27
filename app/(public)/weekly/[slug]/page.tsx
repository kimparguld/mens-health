import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TOPIC_SEEDS } from "@/lib/youtube/topics";
import { getTopicBySlug, getWeeklyRankingVideos } from "@/lib/db/queries";
import { createMetadata } from "@/lib/seo/createMetadata";
import { VideoCard } from "@/components/video/VideoCard";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { NewsletterInlineCTA } from "@/components/newsletter/NewsletterInlineCTA";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbSchema } from "@/lib/seo/json-ld";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://menhealth-digest.com";

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

  const videos = await getWeeklyRankingVideos(topic.id, topic.slug);
  const weekLabel = getWeekLabel();

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
          <p className="text-gray-500">
            No videos published this week yet. Check back soon.
          </p>
        ) : (
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
                      video.evidenceScore != null ? "SUPPORTED" : "NOT_CHECKED"
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
        )}

        <div className="mt-10">
          <NewsletterInlineCTA
            headline={`Get next week's best ${seed.name.toLowerCase()} videos in your inbox`}
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

        <Disclaimer className="mt-10" />
      </main>
    </>
  );
}
