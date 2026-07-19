import { Metadata } from "next";
import { db } from "@/lib/db/prisma";
import { VideoCard } from "@/components/video/VideoCard";
import { TOPIC_SEEDS } from "@/lib/youtube/topics";

export const metadata: Metadata = {
  title: "MenHealth Digest — Evidence-Aware Men's Health Summaries",
  description:
    "Daily summaries of the most important men's health videos, ranked and fact-checked. Fitness, testosterone, sleep, nutrition, longevity — without the hype.",
  openGraph: {
    title: "MenHealth Digest — Evidence-Aware Men's Health Summaries",
    description:
      "Daily summaries of the most important men's health videos, ranked and fact-checked.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MenHealth Digest",
    description:
      "Evidence-aware summaries of trending men's health content — without the hype.",
  },
};

export default async function HomePage() {
  const videos = await db.video.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { trendScore: "desc" },
    take: 20,
    include: {
      channel: true,
      summaries: { take: 1, orderBy: { createdAt: "desc" } },
      topics: { include: { topic: true } },
    },
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          MenHealth Digest
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Evidence-aware summaries of trending men&apos;s health content —
          without the hype.
        </p>
      </header>

      {/* Topic navigation */}
      <nav className="mb-8 flex flex-wrap gap-2" aria-label="Topics">
        {TOPIC_SEEDS.map((topic) => (
          <a
            key={topic.slug}
            href={`/topics/${topic.slug}`}
            className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:border-blue-400 hover:text-blue-700"
          >
            {topic.name}
          </a>
        ))}
      </nav>

      {videos.length === 0 ? (
        <p className="text-gray-500">
          No published summaries yet. Check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
            />
          ))}
        </div>
      )}
    </main>
  );
}
