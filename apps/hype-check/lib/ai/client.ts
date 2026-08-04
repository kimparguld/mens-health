import { env } from "@/env";
import { createAiClient } from "@menhealth/core-ai";

export const aiClient = createAiClient({
  anthropicApiKey: env.ANTHROPIC_API_KEY,
  groqApiKey: env.GROQ_API_KEY,
  groqModel: env.GROQ_MODEL,
  openRouterApiKey: env.OPENROUTER_API_KEY,
  openRouterModels: [
    env.OPENROUTER_MODEL_1 ?? "openai/gpt-oss-120b:free",
    env.OPENROUTER_MODEL_2 ?? "openai/gpt-oss-20b:free",
    env.OPENROUTER_MODEL_3 ?? "mistralai/mistral-7b-instruct:free",
    env.OPENROUTER_MODEL_4 ?? "microsoft/phi-3-mini-128k-instruct:free",
  ],
  openAiApiKey: env.OPENAI_API_KEY,
  geminiApiKey: env.GEMINI_API_KEY,
});

// Kept for existing callers that reach for the raw client shape directly
// (e.g. lib/social/generate-social-post.ts) — same names as before the move.
export const anthropic = aiClient.anthropic;
export const DEFAULT_MODEL = aiClient.defaultModel;
