import { describe, it, expect, vi, beforeEach } from "vitest";

// generateSummaryAndClaims persists via db.summary/claim/warningSign/costItem/
// costItem/disclosure/subject — none of which exist on the shared
// __tests__/__mocks__/prisma.ts stub (that stub only covers the social
// engine's tables). We provide a local, file-scoped override here instead of
// extending the shared stub, since no other suite needs these tables.
// vi.mock factories are hoisted above top-level const declarations, so the
// mock object itself must be created via vi.hoisted.
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

describe("generateSummaryAndClaims warning-sign risk escalation", () => {
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
    mockDb.claim.create.mockImplementation(async ({ data }) => ({
      id: "claim-1",
      ...data,
    }));
    mockDb.claim.update.mockImplementation(async ({ where, data }) => ({
      id: where.id,
      ...data,
    }));
  });

  it("escalates subject.riskLevel to HIGH when a HIGH-severity warning sign is extracted, even when claim extraction fails", async () => {
    mockExtractClaims.mockResolvedValue({
      ok: false,
      error: new Error("claim extraction failed"),
    });
    mockExtractWarningsCostsDisclosures.mockResolvedValue({
      ok: true,
      value: {
        warningSigns: [{ text: "Pushes unproven supplement", severity: "HIGH" }],
        costItems: [],
        disclosures: [],
      },
    });

    const result = await generateSummaryAndClaims(baseVideo, "Some Channel", {
      modelUsed: "test-model",
    });

    expect(result.ok).toBe(true);
    expect(mockDb.subject.update).toHaveBeenCalledWith({
      where: { id: "subject-1" },
      data: { riskLevel: "HIGH" },
    });
    expect(mockDb.warningSign.createMany).toHaveBeenCalled();
  });

  it("escalates subject.riskLevel to HIGH when a HIGH-severity warning sign is extracted on the normal (claims succeed) path", async () => {
    mockExtractClaims.mockResolvedValue({ ok: true, value: [] });
    mockExtractWarningsCostsDisclosures.mockResolvedValue({
      ok: true,
      value: {
        warningSigns: [{ text: "Promotes risky protocol", severity: "HIGH" }],
        costItems: [],
        disclosures: [],
      },
    });

    const result = await generateSummaryAndClaims(baseVideo, "Some Channel", {
      modelUsed: "test-model",
    });

    expect(result.ok).toBe(true);
    expect(mockDb.subject.update).toHaveBeenCalledWith({
      where: { id: "subject-1" },
      data: { riskLevel: "HIGH" },
    });
  });

  it("does not escalate when no warning signs are found and claims are LOW risk", async () => {
    mockExtractClaims.mockResolvedValue({ ok: true, value: [] });
    mockExtractWarningsCostsDisclosures.mockResolvedValue({
      ok: true,
      value: { warningSigns: [], costItems: [], disclosures: [] },
    });

    const result = await generateSummaryAndClaims(baseVideo, "Some Channel", {
      modelUsed: "test-model",
    });

    expect(result.ok).toBe(true);
    expect(mockDb.subject.update).not.toHaveBeenCalled();
  });
});
