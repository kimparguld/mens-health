import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAiCreate } = vi.hoisted(() => ({
  mockAiCreate: vi.fn(),
}));

vi.mock("@/lib/ai/client", () => ({
  aiClient: {
    defaultModel: "test-model",
    anthropic: { messages: { create: mockAiCreate } },
  },
}));

import { createVideoPlan } from "@/lib/social/video-plan";

function aiJsonResponse(body: object) {
  return { content: [{ type: "text", text: JSON.stringify(body) }] };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createVideoPlan", () => {
  it("returns a validated plan from a well-formed AI response", async () => {
    mockAiCreate.mockResolvedValue(
      aiJsonResponse({
        narration:
          "Creatine is one of the most studied supplements for strength training. Research consistently links it to modest gains in muscle strength.",
        captionChunks: [
          "Creatine: one of the most studied supplements",
          "Linked to modest strength gains",
          "Always talk to a doctor before starting anything new",
        ],
      }),
    );

    const result = await createVideoPlan({
      hook: "Is creatine actually worth it?",
      script: "Creatine is one of the most studied supplements...",
      platform: "TIKTOK",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.value.captionChunks.length).toBeGreaterThan(0);
    expect(result.value.narration).toContain("Creatine");
  });

  it("fails when the AI response does not match the schema", async () => {
    mockAiCreate.mockResolvedValue(aiJsonResponse({ narration: "" }));

    const result = await createVideoPlan({
      hook: "Is creatine actually worth it?",
      script: "Creatine is one of the most studied supplements...",
      platform: "TIKTOK",
    });

    expect(result.ok).toBe(false);
  });

  it("fails when the AI response is not valid JSON", async () => {
    mockAiCreate.mockResolvedValue({
      content: [{ type: "text", text: "not json" }],
    });

    const result = await createVideoPlan({
      hook: "h",
      script: "s",
      platform: "TIKTOK",
    });

    expect(result.ok).toBe(false);
  });

  it("returns a Result error instead of throwing when the AI call rejects", async () => {
    mockAiCreate.mockRejectedValue(new Error("network failure"));

    const result = await createVideoPlan({
      hook: "Is creatine actually worth it?",
      script: "Creatine is one of the most studied supplements...",
      platform: "TIKTOK",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error result");
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toContain("network failure");
  });
});
