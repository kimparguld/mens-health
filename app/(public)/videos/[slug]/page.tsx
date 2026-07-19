import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db/prisma";
import { YouTubePlayer } from "@/components/video/YouTubePlayer";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  buildVideoObjectSchema,
  buildBreadcrumbSchema,
} from "@/lib/seo/json-ld";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://menhealthdigest.com";

type Params = Promise<{ slug: string }>;

export const revalidate = 3600; // ISR: regenerate every hour

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const video = await db.video.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: { summaries: { take: 1, orderBy: { createdAt: "desc" } } },
  });

  if (!video) return { title: "Video Not Found" };

  const description =
    video.summaries[0]?.shortSummary ?? video.description ?? "";
  const canonical = `${APP_URL}/videos/${slug}`;

  return {
    title: video.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: video.title,
      description,
      url: canonical,
      type: "article",
      images: video.thumbnailUrl ? [{ url: video.thumbnailUrl }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: video.title,
      description,
      images: video.thumbnailUrl ? [video.thumbnailUrl] : [],
    },
  };
}

export default async function VideoPage({ params }: { params: Params }) {
  const { slug } = await params;
  const video = await db.video.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      channel: true,
      summaries: { take: 1, orderBy: { createdAt: "desc" } },
      claims: { include: { sources: true }, orderBy: { riskLevel: "desc" } },
      topics: { include: { topic: true } },
    },
  });

  if (!video) notFound();

  const summary = video.summaries[0];
  const takeaways: string[] = Array.isArray(summary?.takeaways)
    ? (summary.takeaways as string[])
    : [];
  const warnings: string[] = Array.isArray(summary?.warnings)
    ? (summary.warnings as string[])
    : [];

  const firstTopic = video.topics[0]?.topic;

  const videoSchema = buildVideoObjectSchema({
    title: video.title,
    description: summary?.shortSummary ?? video.description ?? "",
    thumbnailUrl: video.thumbnailUrl,
    publishedAt: video.publishedAt,
    channelTitle: video.channel.title,
    youtubeVideoId: video.youtubeVideoId,
    appUrl: APP_URL,
    slug: video.slug,
  });

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: APP_URL },
    ...(firstTopic
      ? [{ name: firstTopic.name, url: `${APP_URL}/topics/${firstTopic.slug}` }]
      : []),
    { name: video.title, url: `${APP_URL}/videos/${video.slug}` },
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd schema={videoSchema} />
      <JsonLd schema={breadcrumbSchema} />

      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:underline">
          Home
        </Link>{" "}
        /{" "}
        {video.topics[0] && (
          <>
            <Link
              href={`/topics/${video.topics[0].topic.slug}`}
              className="hover:underline"
            >
              {video.topics[0].topic.name}
            </Link>{" "}
            /{" "}
          </>
        )}
        <span className="text-gray-900">{video.title}</span>
      </nav>

      {/* Title */}
      <h1 className="mb-2 text-3xl leading-tight font-bold text-gray-900">
        {video.title}
      </h1>

      {/* Meta */}
      <p className="mb-6 text-sm text-gray-500">
        Channel:{" "}
        <a
          href={`https://www.youtube.com/channel/${video.channel.youtubeId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {video.channel.title}
        </a>
        {" · "}
        <a
          href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Watch on YouTube ↗
        </a>
      </p>

      {/* Official YouTube embed */}
      <div className="mb-8">
        <YouTubePlayer videoId={video.youtubeVideoId} title={video.title} />
      </div>

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
                    <span className="mt-0.5 text-blue-500">✓</span>
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

      {/* Claims */}
      {video.claims.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">
            Health Claims in This Video
          </h2>
          <div className="space-y-4">
            {video.claims.map((claim) => (
              <div
                key={claim.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      claim.riskLevel === "HIGH"
                        ? "bg-red-100 text-red-800"
                        : claim.riskLevel === "MEDIUM"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-green-100 text-green-800"
                    }`}
                  >
                    {claim.riskLevel} risk
                  </span>
                  <span className="text-xs text-gray-400">
                    Evidence: {claim.evidenceStatus.replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {claim.text}
                </p>
                {claim.explanation && (
                  <p className="mt-1 text-xs text-gray-500">
                    {claim.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Topics */}
      {video.topics.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Topics</h2>
          <div className="flex flex-wrap gap-2">
            {video.topics.map((vt) => (
              <Link
                key={vt.topicId}
                href={`/topics/${vt.topic.slug}`}
                className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 hover:bg-blue-200"
              >
                {vt.topic.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Disclaimer — required on every video page */}
      <Disclaimer />
    </main>
  );
}
