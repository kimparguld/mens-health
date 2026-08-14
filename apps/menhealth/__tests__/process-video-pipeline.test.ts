import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  summary: { create: vi.fn() },
  claim: { create: vi.fn(), update: vi.fn() },
  video: { update: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({ db: mockDb }));
vi.mock("@/lib/ai/summarize-video", () => ({ summarizeVideo: vi.fn() }));
vi.mock("@/lib/ai/extract-claims", () => ({ extractClaims: vi.fn() }));

import { generateSummaryAndClaims } from "@/lib/videos/process-video-pipeline";
import { summarizeVideo } from "@/lib/ai/summarize-video";
import { extractClaims } from "@/lib/ai/extract-claims";

const mockSummarizeVideo = vi.mocked(summarizeVideo);
const mockExtractClaims = vi.mocked(extractClaims);

const baseVideo = {
  id: "video-1",
  title: "Test video",
  description: "Test description",
  durationSeconds: 300,
  riskLevel: "LOW" as const,
};

describe("generateSummaryAndClaims claim-extraction failure handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSummarizeVideo.mockResolvedValue({
      ok: true,
      value: {
        shortSummary: "short summary",
        longSummary: "long summary",
        takeaways: [],
        warnings: [],
        targetAudience: "everyone",
        redFlags: [],
      },
    });
    mockDb.summary.create.mockResolvedValue({
      id: "summary-1",
      shortSummary: "short summary",
    });
  });

  it("returns claimExtractionFailed: true and an empty claims array when extraction fails", async () => {
    mockExtractClaims.mockResolvedValue({
      ok: false,
      error: new Error("AI provider unavailable"),
    });

    const result = await generateSummaryAndClaims(baseVideo, "Some Channel", {
      modelUsed: "test-model",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.value.claims).toEqual([]);
    expect(result.value.claimExtractionFailed).toBe(true);
  });

  it("returns claimExtractionFailed: false when extraction succeeds", async () => {
    mockExtractClaims.mockResolvedValue({ ok: true, value: [] });

    const result = await generateSummaryAndClaims(baseVideo, "Some Channel", {
      modelUsed: "test-model",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.value.claimExtractionFailed).toBe(false);
  });
});
