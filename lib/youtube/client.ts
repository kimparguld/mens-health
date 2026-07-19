import { z } from "zod";
import { env } from "@/env";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

// ---------------------------------------------------------------------------
// Response schemas — all external API data is validated at the boundary
// ---------------------------------------------------------------------------

const SearchItemSchema = z.object({
  id: z.object({ videoId: z.string() }),
  snippet: z.object({
    title: z.string(),
    description: z.string(),
    channelId: z.string(),
    channelTitle: z.string(),
    publishedAt: z.string(),
    thumbnails: z.object({
      high: z.object({ url: z.string() }).optional(),
      medium: z.object({ url: z.string() }).optional(),
      default: z.object({ url: z.string() }).optional(),
    }),
  }),
});

const SearchResponseSchema = z.object({
  items: z.array(SearchItemSchema).default([]),
  nextPageToken: z.string().optional(),
});

const VideoDetailItemSchema = z.object({
  id: z.string(),
  contentDetails: z.object({
    duration: z.string(), // ISO 8601 e.g. PT4M13S
  }),
  statistics: z.object({
    viewCount: z.string().optional(),
    likeCount: z.string().optional(),
    commentCount: z.string().optional(),
  }),
});

const VideoDetailsResponseSchema = z.object({
  items: z.array(VideoDetailItemSchema).default([]),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type YouTubeSearchResult = z.infer<typeof SearchItemSchema>;

export type YouTubeVideoDetail = z.infer<typeof VideoDetailItemSchema>;

export type YouTubeVideoEnriched = {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: Date;
  thumbnailUrl: string;
  durationSeconds: number;
  viewCount: number;
  likeCount: number | undefined;
  commentCount: number | undefined;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDurationToSeconds(iso8601: string): number {
  const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] ?? "0", 10);
  const minutes = parseInt(match[2] ?? "0", 10);
  const seconds = parseInt(match[3] ?? "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function parseThumbnail(
  thumbnails: YouTubeSearchResult["snippet"]["thumbnails"],
): string {
  return (
    thumbnails.high?.url ??
    thumbnails.medium?.url ??
    thumbnails.default?.url ??
    ""
  );
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `YouTube API request failed: ${response.status} ${response.statusText}`,
    );
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function searchVideos(
  query: string,
  maxResults = 25,
): Promise<YouTubeSearchResult[]> {
  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: String(maxResults),
    relevanceLanguage: "en",
    safeSearch: "moderate",
    key: env.YOUTUBE_API_KEY,
  });

  const raw = await fetchJson(`${YOUTUBE_API_BASE}/search?${params}`);
  const parsed = SearchResponseSchema.parse(raw);
  return parsed.items;
}

export async function fetchVideoDetails(
  videoIds: string[],
): Promise<YouTubeVideoDetail[]> {
  if (videoIds.length === 0) return [];

  // YouTube videos.list accepts up to 50 IDs per request — batch accordingly
  const BATCH_SIZE = 50;
  const results: YouTubeVideoDetail[] = [];

  for (let i = 0; i < videoIds.length; i += BATCH_SIZE) {
    const batch = videoIds.slice(i, i + BATCH_SIZE);
    const params = new URLSearchParams({
      part: "contentDetails,statistics",
      id: batch.join(","),
      key: env.YOUTUBE_API_KEY,
    });

    const raw = await fetchJson(`${YOUTUBE_API_BASE}/videos?${params}`);
    const parsed = VideoDetailsResponseSchema.parse(raw);
    results.push(...parsed.items);
  }

  return results;
}

export async function searchAndEnrichVideos(
  query: string,
  maxResults = 25,
): Promise<YouTubeVideoEnriched[]> {
  const searchResults = await searchVideos(query, maxResults);
  const videoIds = searchResults.map((item) => item.id.videoId);
  const details = await fetchVideoDetails(videoIds);

  const detailMap = new Map(details.map((d) => [d.id, d]));

  return searchResults
    .map((item) => {
      const detail = detailMap.get(item.id.videoId);
      if (!detail) return null;

      return {
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        publishedAt: new Date(item.snippet.publishedAt),
        thumbnailUrl: parseThumbnail(item.snippet.thumbnails),
        durationSeconds: parseDurationToSeconds(detail.contentDetails.duration),
        viewCount: parseInt(detail.statistics.viewCount ?? "0", 10),
        likeCount: detail.statistics.likeCount
          ? parseInt(detail.statistics.likeCount, 10)
          : undefined,
        commentCount: detail.statistics.commentCount
          ? parseInt(detail.statistics.commentCount, 10)
          : undefined,
      };
    })
    .filter((v): v is YouTubeVideoEnriched => v !== null);
}
