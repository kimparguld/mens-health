import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db/prisma";
import { CREATOR_SEEDS } from "@/lib/youtube/creators";
import { VideoCard } from "@/components/video/VideoCard";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { NewsletterSignupForm } from "@/components/ui/NewsletterSignupForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbSchema } from "@/lib/seo/json-ld";

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

type Params = Promise<{ slug: string }>;


export async function generateStaticParams() {
  return CREATOR_SEEDS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const creator = CREATOR_SEEDS.find((c) => c.slug === slug);
  if (!creator) return { title: "Creator Not Found" };

  const title = `${creator.name} — Men's Health Videos`;
  const description = `${creator.description} Browse ${creator.name}'s top men's health videos, summarised and fact-checked.`;
  const canonical = `${APP_URL}/creators/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
    keywords: [
      creator.name,
      `${creator.name} videos`,
      `${creator.name} YouTube`,
      "men's health",
      creator.specialty,
    ],
  };
}

export default async function CreatorPage({ params }: { params: Params }) {
  const { slug } = await params;
  const creator = CREATOR_SEEDS.find((c) => c.slug === slug);
  if (!creator) notFound();

  // Look up the channel by its YouTube channel ID
  const channel = await db.channel.findUnique({
    where: { youtubeId: creator.youtubeChannelId },
  });

  const videos = channel
    ? await db.video.findMany({
        where: { status: "PUBLISHED", channelId: channel.id },
        orderBy: { trendScore: "desc" },
        take: 20,
        include: {
          channel: true,
          summaries: { take: 1, orderBy: { createdAt: "desc" } },
          topics: { include: { topic: true } },
        },
      })
    : [];

  const breadcrumb = buildBreadcrumbSchema([
    { name: "Home", url: APP_URL },
    { name: "Creators", url: `${APP_URL}/creators` },
    { name: creator.name, url: `${APP_URL}/creators/${slug}` },
  ]);

  return (
    <>
      <JsonLd schema={breadcrumb} />
      <main>
        {/* Header */}
        <section className="border-b border-gray-100 bg-white py-12">
          <div className="mx-auto max-w-[1120px] px-4">
            <nav className="mb-4 flex items-center gap-2 text-xs text-gray-400">
              <Link href="/" className="hover:text-gray-600">
                Home
              </Link>
              <span>/</span>
              <span className="text-gray-600">Creators</span>
              <span>/</span>
              <span className="text-gray-600">{creator.name}</span>
            </nav>

            <p className="mb-2 text-xs font-semibold tracking-widest text-emerald-600 uppercase">
              Creator profile
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {creator.name}
            </h1>
            {creator.credentials && (
              <p className="mt-1 text-sm font-medium text-gray-500">
                {creator.credentials}
              </p>
            )}
            <p className="mt-3 max-w-xl text-base leading-relaxed text-gray-600">
              {creator.description}
            </p>

            {/* Specialty tags */}
            <div className="mt-4 flex flex-wrap gap-2">
              {creator.specialty.split(", ").map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* External link */}
            <a
              href={`https://www.youtube.com/channel/${creator.youtubeChannelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50"
            >
              <svg
                className="h-4 w-4 text-red-500"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5L15.8 12l-6.1 3.5z" />
              </svg>
              View on YouTube
            </a>

            {/* Trust score if available */}
            {channel && (
              <p className="mt-3 text-xs text-gray-400">
                Trust score:{" "}
                <span className="font-medium text-gray-600">
                  {(channel.trustScore * 100).toFixed(0)}
                  /100
                </span>{" "}
                · {videos.length} videos indexed
              </p>
            )}
          </div>
        </section>

        {/* Videos */}
        <section className="py-10">
          <div className="mx-auto max-w-[1120px] px-4">
            <h2 className="mb-6 text-lg font-semibold text-gray-900">
              {videos.length > 0
                ? `${creator.name}'s Top Videos`
                : "No videos indexed yet"}
            </h2>

            {videos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
                <p className="text-gray-500">
                  {channel
                    ? "Videos from this creator will appear here once they've been indexed."
                    : "This creator has not been indexed yet. Check back soon."}
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-block text-sm font-semibold text-emerald-600 hover:underline"
                >
                  Browse all videos →
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {videos.map((video) => (
                  <VideoCard
                    key={video.id}
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
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Other creators */}
        <section className="border-t border-gray-100 bg-gray-50 py-10">
          <div className="mx-auto max-w-[1120px] px-4">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">
              More creators
            </h2>
            <div className="flex flex-wrap gap-2">
              {CREATOR_SEEDS.filter((c) => c.slug !== slug).map((c) => (
                <Link
                  key={c.slug}
                  href={`/creators/${c.slug}`}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-emerald-300 hover:text-emerald-700"
                >
                  {c.name}
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
                Follow the evidence, not the hype
              </h2>
              <p className="mb-5 text-sm text-gray-500">
                Get the 5-minute Men&apos;s Health Digest every Friday —
                trending videos, summarised claims, evidence notes.
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
