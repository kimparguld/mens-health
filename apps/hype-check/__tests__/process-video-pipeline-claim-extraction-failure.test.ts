import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  summary: { create: vi.fn() },
  claim: { create: vi.fn(), update: vi.fn() },
  warningSign: { createMany: vi.fn() },
  costItem: { createMany: vi.fn() },
  disclosure: { createMany: vi.fn() },
  subject: { update: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({ db: mockDb }));

vi.mock("@/lib/ai/pipeline", () => ({
  summarizeVideo: vi.fn(),
  extractClaims: vi.fn(),
  factCheckClaim: vi.fn(),
  generateEditorialTitle: vi.fn(),
  generateTopicFaq: vi.fn(),
}));

vi.mock("@/lib/ai/extract-warnings-costs-disclosures", () => ({
  extractWarningsCostsDisclosures: vi.fn(),
}));

import { generateSummaryAndClaims } from "@/lib/videos/process-video-pipeline";
import { summarizeVideo, extractClaims } from "@/lib/ai/pipeline";
import { extractWarningsCostsDisclosures } from "@/lib/ai/extract-warnings-costs-disclosures";

const mockSummarizeVideo = vi.mocked(summarizeVideo);
const mockExtractClaims = vi.mocked(extractClaims);
const mockExtractWarningsCostsDisclosures = vi.mocked(
  extractWarningsCostsDisclosures,
);

const baseVideo = {
  subjectId: "subject-1",
  sourceVideoId: "source-video-1",
  title: "Test video",
  description: "Test description",
  durationSeconds: 300,
  riskLevel: "LOW" as const,
};

describe("generateSummaryAndClaims claimExtractionFailed flag", () => {
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
    mockExtractWarningsCostsDisclosures.mockResolvedValue({
      ok: true,
      value: { warningSigns: [], costItems: [], disclosures: [] },
    });
  });

  it("sets claimExtractionFailed: true when extraction fails", async () => {
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

  it("sets claimExtractionFailed: false when extraction succeeds", async () => {
    mockExtractClaims.mockResolvedValue({ ok: true, value: [] });

    const result = await generateSummaryAndClaims(baseVideo, "Some Channel", {
      modelUsed: "test-model",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.value.claimExtractionFailed).toBe(false);
  });
});
