import { db } from "@/lib/db/prisma";
import { generateTopicFaq } from "@/lib/ai/generate-topic-faq";

const VIDEO_CONTEXT_LIMIT = 8;

export async function refreshTopicFaqs(): Promise<{
  updated: number;
  failed: number;
}> {
  let updated = 0;
  let failed = 0;

  const topics = await db.topic.findMany();

  for (const topic of topics) {
    try {
      // Fetch recent published video titles + short summaries for context
      const videos = await db.subject.findMany({
        where: {
          status: "PUBLISHED",
          topics: { some: { topicId: topic.id } },
        },
        orderBy: { trendScore: "desc" },
        take: VIDEO_CONTEXT_LIMIT,
        include: {
          sourceVideos: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: {
              summaries: { take: 1, orderBy: { createdAt: "desc" } },
            },
          },
        },
      });

      const videoSummaries = videos
        .map((v) => ({
          title: v.editorialTitle ?? v.sourceVideos[0]?.title ?? v.name,
          shortSummary: v.sourceVideos[0]?.summaries[0]?.shortSummary ?? "",
        }))
        .filter((v) => v.shortSummary.length > 0);

      const result = await generateTopicFaq({
        topicName: topic.name,
        topicDescription: topic.description ?? "",
        videoSummaries,
      });

      if (!result.ok) {
        console.error(
          `FAQ generation failed for topic ${topic.slug}: ${result.error.message}`,
        );
        failed++;
        continue;
      }

      await db.topic.update({
        where: { id: topic.id },
        data: {
          faqIntro: result.value.intro,
          faqJson: result.value.faq,
          faqUpdatedAt: new Date(),
        },
      });

      updated++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`FAQ refresh failed for topic ${topic.slug}:`, message);
      failed++;
    }
  }

  return { updated, failed };
}
