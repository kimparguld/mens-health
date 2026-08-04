export { createYouTubeClient } from "./client";
export type {
  YouTubeSearchResult,
  YouTubeVideoDetail,
  YouTubeVideoEnriched,
} from "./client";

export { detectsClickbait, scoreVideo } from "./scoring";
export type { ScoreInput, ScoreOutput } from "./scoring";

export {
  TopicCandidateSchema,
  scoreTopicPopularity,
  isHighRiskCandidate,
  mergeTopicSeeds,
} from "./topic-discovery";
export type { TopicCandidate, TopicSeedLike } from "./topic-discovery";
