// Mock aiClient for testing — avoids initializing real API clients in jsdom
// This stub is imported by lib/topics/discover-candidates.ts during tests

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
