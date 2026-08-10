import { env } from '@/env';
import { createAiClient } from '@menhealth/core-ai';

export const aiClient = createAiClient({
  groqApiKey: env.GROQ_API_KEY,
  openRouterApiKey: env.OPENROUTER_API_KEY,
  openAiApiKey: env.OPENAI_API_KEY,
  geminiApiKey: env.GEMINI_API_KEY,
});

// Kept for existing callers that reach for the raw client shape directly
// (e.g. lib/social/generate-social-post.ts) — same names as before the move.
export const anthropic = aiClient.anthropic;
export const DEFAULT_MODEL = aiClient.defaultModel;
