import { describe, it, expect, vi } from "vitest";

// Mock the pipeline and AI modules before they're imported
vi.mock("@/lib/ai/pipeline", () => ({
  summarizeVideo: vi.fn(),
  extractClaims: vi.fn(),
  factCheckClaim: vi.fn(),
  generateEditorialTitle: vi.fn(),
  generateTopicFaq: vi.fn(),
}));

vi.mock("@/lib/ai/extract-warnings-costs-disclosures", () => ({
  extractWarningsCostsDisclosures: vi.fn(async () => ({
    ok: true,
    value: {
      warningSigns: [],
      costItems: [],
      disclosures: [],
    },
  })),
}));

import { highestRiskLevel } from "@/lib/videos/process-video-pipeline";

describe("highestRiskLevel", () => {
  it("returns HIGH when any level in the list is HIGH", () => {
    expect(highestRiskLevel(["LOW", "MEDIUM", "HIGH"])).toBe("HIGH");
  });

  it("returns MEDIUM when the highest level present is MEDIUM", () => {
    expect(highestRiskLevel(["LOW", "MEDIUM"])).toBe("MEDIUM");
  });

  it("returns LOW when every level is LOW", () => {
    expect(highestRiskLevel(["LOW", "LOW"])).toBe("LOW");
  });

  it("defaults to LOW for an empty list", () => {
    expect(highestRiskLevel([])).toBe("LOW");
  });

  it("never lets a later lower value override an earlier higher one", () => {
    expect(highestRiskLevel(["HIGH", "LOW"])).toBe("HIGH");
  });
});
