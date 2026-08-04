import {
  detectsClickbait as baseDetectsClickbait,
  scoreVideo as baseScoreVideo,
  type ScoreInput,
  type ScoreOutput,
} from "@menhealth/core-youtube";

export type { ScoreInput, ScoreOutput } from "@menhealth/core-youtube";

// Men's-health-specific clickbait phrasing, on top of the universal set
// baked into @menhealth/core-youtube.
const SITE_CLICKBAIT_PATTERNS = [/\d+x\s+(testosterone|growth|muscle)/i];

export function detectsClickbait(title: string): boolean {
  return baseDetectsClickbait(title, SITE_CLICKBAIT_PATTERNS);
}

export function scoreVideo(input: ScoreInput, title: string): ScoreOutput {
  return baseScoreVideo(input, title, SITE_CLICKBAIT_PATTERNS);
}
