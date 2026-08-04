import { env } from "@/env";
import { createYouTubeClient } from "@menhealth/core-youtube";

export const { searchVideos, fetchVideoDetails, searchAndEnrichVideos } =
  createYouTubeClient(env.YOUTUBE_API_KEY);
