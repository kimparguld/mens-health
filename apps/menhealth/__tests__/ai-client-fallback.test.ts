import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGroqCreate = vi.hoisted(() => vi.fn());

vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create: mockGroqCreate } };
  },
}));

import { createAiClient } from "@menhealth/core-ai";

describe("createAiClient Groq empty-response fallback", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    mockGroqCreate.mockReset();
  });

  it("falls through to OpenRouter when Groq returns a 200 with empty content", async () => {
    mockGroqCreate.mockResolvedValue({
      choices: [{ message: { content: "" }, finish_reason: "length" }],
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "openrouter answer" } }],
      }),
    });

    const client = createAiClient({ groqApiKey: "groq-key", openRouterApiKey: "or-key" });

    const result = await client.anthropic.messages.create({
      model: "unused",
      max_tokens: 100,
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.content[0].text).toBe("openrouter answer");
    expect(fetchMock).toHaveBeenCalled();
  });

  it("returns Groq's content directly when it's non-empty", async () => {
    mockGroqCreate.mockResolvedValue({
      choices: [{ message: { content: "a real answer" }, finish_reason: "stop" }],
    });

    const client = createAiClient({ groqApiKey: "groq-key" });

    const result = await client.anthropic.messages.create({
      model: "unused",
      max_tokens: 100,
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.content[0].text).toBe("a real answer");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
