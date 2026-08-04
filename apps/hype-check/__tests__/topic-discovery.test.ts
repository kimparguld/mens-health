import { describe, it, expect } from "vitest";
import {
  scoreTopicPopularity,
  isHighRiskCandidate,
  mergeTopicSeeds,
} from "@menhealth/core-youtube";

describe("scoreTopicPopularity", () => {
  it("returns 0 for an empty list", () => {
    expect(scoreTopicPopularity([])).toBe(0);
  });

  it("ignores videos published outside the 90-day window", () => {
    const now = new Date("2026-08-04T00:00:00Z");
    const old = new Date("2026-01-01T00:00:00Z");
    const result = scoreTopicPopularity(
      [{ viewCount: 1_000_000, publishedAt: old }],
      now,
    );
    expect(result).toBe(0);
  });

  it("returns the median view count among recent videos (odd count)", () => {
    const now = new Date("2026-08-04T00:00:00Z");
    const recent = new Date("2026-07-20T00:00:00Z");
    const result = scoreTopicPopularity(
      [
        { viewCount: 100, publishedAt: recent },
        { viewCount: 500, publishedAt: recent },
        { viewCount: 300, publishedAt: recent },
      ],
      now,
    );
    expect(result).toBe(300);
  });

  it("returns the averaged median for an even count", () => {
    const now = new Date("2026-08-04T00:00:00Z");
    const recent = new Date("2026-07-20T00:00:00Z");
    const result = scoreTopicPopularity(
      [
        { viewCount: 100, publishedAt: recent },
        { viewCount: 200, publishedAt: recent },
        { viewCount: 300, publishedAt: recent },
        { viewCount: 400, publishedAt: recent },
      ],
      now,
    );
    expect(result).toBe(250);
  });
});

describe("isHighRiskCandidate", () => {
  const keywords = ["testosterone", "trt", "cancer"];

  it("matches a keyword in the name, description, or query", () => {
    expect(
      isHighRiskCandidate(
        { name: "TRT Basics", description: "x", query: "x" },
        keywords,
      ),
    ).toBe(true);
    expect(
      isHighRiskCandidate(
        { name: "x", description: "Understanding cancer risk", query: "x" },
        keywords,
      ),
    ).toBe(true);
    expect(
      isHighRiskCandidate(
        { name: "x", description: "x", query: "testosterone levels" },
        keywords,
      ),
    ).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(
      isHighRiskCandidate(
        { name: "TESTOSTERONE Guide", description: "x", query: "x" },
        keywords,
      ),
    ).toBe(true);
  });

  it("returns false when nothing matches", () => {
    expect(
      isHighRiskCandidate(
        { name: "Sleep Hygiene", description: "Better rest", query: "sleep" },
        keywords,
      ),
    ).toBe(false);
  });
});

describe("mergeTopicSeeds", () => {
  const base = {
    slug: "sleep",
    name: "Sleep",
    query: "sleep men health",
    isHighRisk: false,
    description: "Sleep quality",
  };

  it("appends approved suggestions not already present", () => {
    const approved = {
      slug: "grip-strength",
      name: "Grip Strength",
      query: "grip strength training",
      isHighRisk: false,
      description: "Grip strength training and testing",
    };
    const result = mergeTopicSeeds([base], [approved]);
    expect(result).toEqual([base, approved]);
  });

  it("lets the static seed win on a slug conflict", () => {
    const conflicting = { ...base, name: "Suggested Sleep Topic" };
    const result = mergeTopicSeeds([base], [conflicting]);
    expect(result).toEqual([base]);
  });
});
