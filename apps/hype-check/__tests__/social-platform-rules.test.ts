import { describe, it, expect } from "vitest";
import {
  checkForbiddenPatterns,
  detectHighRiskTopic,
  validatePlatformConstraints,
  supportsVideoGeneration,
} from "@/lib/social/platform-rules";

describe("checkForbiddenPatterns", () => {
  it("flags 'guaranteed returns'", () => {
    const result = checkForbiddenPatterns(
      "This app offers guaranteed returns on your investment.",
    );
    expect(result.matched).toBe(true);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it("flags 'this makes you rich'", () => {
    const result = checkForbiddenPatterns("This makes you rich fast.");
    expect(result.matched).toBe(true);
  });

  it("flags 'banks don't want you to know'", () => {
    const result = checkForbiddenPatterns(
      "Banks don't want you to know this one weird trick.",
    );
    expect(result.matched).toBe(true);
  });

  it("flags 'guaranteed to'", () => {
    const result = checkForbiddenPatterns(
      "Guaranteed to double your money in a month.",
    );
    expect(result.matched).toBe(true);
  });

  it("flags fabricated scarcity", () => {
    const result = checkForbiddenPatterns(
      "Only 3 spots left, sign up now before it's too late.",
    );
    expect(result.matched).toBe(true);
  });

  it("passes compliant editorial copy", () => {
    const result = checkForbiddenPatterns(
      "This investment app claim is popular, but the evidence is more nuanced. Here are the useful parts.",
    );
    expect(result.matched).toBe(false);
    expect(result.violations).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    const result = checkForbiddenPatterns("GUARANTEED TO MAKE YOU RICH");
    expect(result.matched).toBe(true);
  });
});

describe("detectHighRiskTopic", () => {
  it("detects 'crypto' as high risk", () => {
    expect(detectHighRiskTopic("This video is about crypto investing")).toBe(
      true,
    );
  });

  it("detects 'giveaway' as high risk", () => {
    expect(detectHighRiskTopic("enter this giveaway for a chance to win")).toBe(
      true,
    );
  });

  it("detects 'ponzi' as high risk", () => {
    expect(detectHighRiskTopic("signs this investment app is a ponzi scheme")).toBe(
      true,
    );
  });

  it("does not flag low-risk content", () => {
    expect(detectHighRiskTopic("a guide to finding cheap flights")).toBe(
      false,
    );
  });
});

describe("validatePlatformConstraints", () => {
  const base = {
    caption: "A short caption",
    hashtags: ["#MensHealth"],
    script: "A short script",
    hook: "A hook",
  };

  it("returns no errors for valid YouTube Community content", () => {
    const errors = validatePlatformConstraints("YOUTUBE_COMMUNITY", base);
    expect(errors).toHaveLength(0);
  });

  it("returns error when X caption exceeds 280 chars", () => {
    const longCaption = "x".repeat(281);
    const errors = validatePlatformConstraints("X", {
      ...base,
      caption: longCaption,
    });
    expect(errors.some((e) => e.includes("Caption exceeds"))).toBe(true);
  });

  it("returns error when hashtag count exceeds platform max", () => {
    const tooManyTags = Array.from({ length: 4 }, (_, i) => `#tag${i}`);
    const errors = validatePlatformConstraints("X", {
      ...base,
      caption: "A".repeat(200),
      hashtags: tooManyTags,
    });
    expect(errors.some((e) => e.includes("hashtags"))).toBe(true);
  });

  it("returns error when Reddit has hashtags (not allowed)", () => {
    const errors = validatePlatformConstraints("REDDIT", {
      ...base,
      hashtags: ["#MensHealth"],
    });
    expect(errors.some((e) => e.includes("hashtags"))).toBe(true);
  });
});

describe("supportsVideoGeneration()", () => {
  it("returns true for TikTok and YouTube Community", () => {
    expect(supportsVideoGeneration("TIKTOK")).toBe(true);
    expect(supportsVideoGeneration("YOUTUBE_COMMUNITY")).toBe(true);
  });

  it("returns false for Reddit and X", () => {
    expect(supportsVideoGeneration("REDDIT")).toBe(false);
    expect(supportsVideoGeneration("X")).toBe(false);
  });
});
