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

    expect(result.content[0]?.text).toBe("openrouter answer");
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

    expect(result.content[0]?.text).toBe("a real answer");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("createAiClient JSON-mode enforcement", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    mockGroqCreate.mockReset();
  });

  // Every caller of createAiClient() JSON.parse()s the response text (see
  // generate-social-post.ts, pipeline.ts, discover-candidates.ts). Without
  // requesting structured output, a reasoning-capable free-tier model can
  // return prose (its own chain-of-thought) instead of JSON, which fails
  // JSON.parse downstream. Providers that support it should be asked for
  // JSON mode so this happens at the API level instead.
  it("asks Groq for JSON-object output", async () => {
    mockGroqCreate.mockResolvedValue({
      choices: [{ message: { content: "{}" }, finish_reason: "stop" }],
    });

    const client = createAiClient({ groqApiKey: "groq-key" });
    await client.anthropic.messages.create({
      model: "unused",
      max_tokens: 100,
      messages: [{ role: "user", content: "Respond ONLY with a JSON object: {}" }],
    });

    const callArgs = mockGroqCreate.mock.calls[0]?.[0] as { response_format?: unknown };
    expect(callArgs.response_format).toEqual({ type: "json_object" });
  });

  it("asks OpenRouter for JSON-object output", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "{}" } }] }),
    });

    const client = createAiClient({ openRouterApiKey: "or-key" });
    await client.anthropic.messages.create({
      model: "unused",
      max_tokens: 100,
      messages: [{ role: "user", content: "Respond ONLY with a JSON object: {}" }],
    });

    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string) as {
      response_format?: unknown;
    };
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("asks OpenAI for JSON-object output", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "{}" } }] }),
    });

    const client = createAiClient({ openAiApiKey: "oa-key" });
    await client.anthropic.messages.create({
      model: "unused",
      max_tokens: 100,
      messages: [{ role: "user", content: "Respond ONLY with a JSON object: {}" }],
    });

    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string) as {
      response_format?: unknown;
    };
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("asks Gemini for application/json output", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }),
    });

    const client = createAiClient({ geminiApiKey: "gem-key" });
    await client.anthropic.messages.create({
      model: "unused",
      max_tokens: 100,
      messages: [{ role: "user", content: "Respond ONLY with a JSON object: {}" }],
    });

    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string) as {
      generationConfig?: { responseMimeType?: string };
    };
    expect(body.generationConfig?.responseMimeType).toBe("application/json");
  });
});
