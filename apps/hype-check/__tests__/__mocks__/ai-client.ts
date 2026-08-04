// Mock aiClient for testing — avoids initializing real API clients in jsdom
// This stub is imported by lib/ai/extract-warnings-costs-disclosures.ts during tests

export const aiClient = {
  anthropic: {
    messages: {
      create: async () => ({
        content: [{ type: "text" as const, text: "{}" }],
      }),
    },
  },
  defaultModel: "claude-3-5-sonnet-20241022",
};

export const anthropic = aiClient.anthropic;
export const DEFAULT_MODEL = aiClient.defaultModel;
