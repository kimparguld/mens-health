import { db } from "@/lib/db/prisma";
import { searchAndEnrichVideos } from "@/lib/youtube/client";
import { scoreVideo, detectsClickbait } from "@/lib/youtube/scoring";
import { TOPIC_SEEDS } from "@/lib/youtube/topics";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(title: string, videoId: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60)
    .replace(/-+$/, "");
  return `${base}-${videoId}`;
}

// ---------------------------------------------------------------------------
// Main sync function
// ---------------------------------------------------------------------------

export async function syncYouTubeVideos(): Promise<{
  processed: number;
  skipped: number;
  errors: number;
}> {
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const topic of TOPIC_SEEDS) {
    try {
      // Upsert topic
      await db.topic.upsert({
        where: { slug: topic.slug },
        create: {
          slug: topic.slug,
          name: topic.name,
          description: topic.description,
          isHighRisk: topic.isHighRisk,
        },
        update: {
          name: topic.name,
          description: topic.description,
          isHighRisk: topic.isHighRisk,
        },
      });

      const videos = await searchAndEnrichVideos(topic.query, 20);

      for (const video of videos) {
        // Skip videos already in the database
        const existing = await db.video.findUnique({
          where: { youtubeVideoId: video.videoId },
        });
        if (existing) {
          // Update view count and scores for existing videos
          const scores = scoreVideo(
            {
              viewCount: video.viewCount,
              likeCount: video.likeCount,
              commentCount: video.commentCount,
              publishedAt: video.publishedAt,
              channelTrustScore: 0.5,
              titleRelevance: 0.7,
              topicMatch: 0.8,
              containsHighRiskClaims: topic.isHighRisk,
            },
            video.title,
          );
          await db.video.update({
            where: { id: existing.id },
            data: {
              viewCount: video.viewCount,
              likeCount: video.likeCount,
              commentCount: video.commentCount,
              trendScore: scores.trendScore,
              relevanceScore: scores.relevanceScore,
            },
          });
          skipped++;
          continue;
        }

        // Upsert channel
        const channel = await db.channel.upsert({
          where: { youtubeId: video.channelId },
          create: {
            youtubeId: video.channelId,
            title: video.channelTitle,
          },
          update: { title: video.channelTitle },
        });

        const scores = scoreVideo(
          {
            viewCount: video.viewCount,
            likeCount: video.likeCount,
            commentCount: video.commentCount,
            publishedAt: video.publishedAt,
            channelTrustScore: channel.trustScore,
            titleRelevance: 0.7,
            topicMatch: 0.8,
            containsHighRiskClaims: topic.isHighRisk,
          },
          video.title,
        );

        const isClickbait = detectsClickbait(video.title);
        const riskLevel =
          topic.isHighRisk || isClickbait
            ? ("HIGH" as const)
            : ("LOW" as const);

        const newVideo = await db.video.create({
          data: {
            youtubeVideoId: video.videoId,
            title: video.title,
            description: video.description,
            channelId: channel.id,
            publishedAt: video.publishedAt,
            thumbnailUrl: video.thumbnailUrl,
            durationSeconds: video.durationSeconds,
            viewCount: video.viewCount,
            likeCount: video.likeCount,
            commentCount: video.commentCount,
            trendScore: scores.trendScore,
            relevanceScore: scores.relevanceScore,
            riskLevel,
            slug: generateSlug(video.title, video.videoId),
            status: "PENDING",
          },
        });

        // Link to topic
        await db.videoTopic.upsert({
          where: {
            videoId_topicId: {
              videoId: newVideo.id,
              topicId: (await db.topic.findUnique({
                where: { slug: topic.slug },
              }))!.id,
            },
          },
          create: {
            videoId: newVideo.id,
            topicId: (await db.topic.findUnique({
              where: { slug: topic.slug },
            }))!.id,
          },
          update: {},
        });

        // Queue for AI processing
        await db.processingJob.upsert({
          where: { videoId: newVideo.id },
          create: { videoId: newVideo.id, status: "QUEUED" },
          update: {},
        });

        processed++;
      }
    } catch (error) {
      console.error(`Error syncing topic "${topic.slug}":`, error);
      errors++;
    }
  }

  return { processed, skipped, errors };
}
