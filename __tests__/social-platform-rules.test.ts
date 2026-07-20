import { describe, it, expect } from "vitest";
import {
  checkForbiddenPatterns,
  detectHighRiskTopic,
  validatePlatformConstraints,
} from "@/lib/social/platform-rules";

describe("checkForbiddenPatterns", () => {
  it("flags 'fix your testosterone'", () => {
    const result = checkForbiddenPatterns(
      "Fix your testosterone today with this supplement.",
    );
    expect(result.matched).toBe(true);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it("flags 'this cures low energy'", () => {
    const result = checkForbiddenPatterns("This cures low energy fast.");
    expect(result.matched).toBe(true);
  });

  it("flags 'doctors don't want you to know'", () => {
    const result = checkForbiddenPatterns(
      "Doctors don't want you to know this one weird trick.",
    );
    expect(result.matched).toBe(true);
  });

  it("flags 'guaranteed to fix'", () => {
    const result = checkForbiddenPatterns(
      "Guaranteed to fix your energy levels.",
    );
    expect(result.matched).toBe(true);
  });

  it("flags personal-condition implication", () => {
    const result = checkForbiddenPatterns(
      "You might have low testosterone if you feel tired.",
    );
    expect(result.matched).toBe(true);
  });

  it("passes compliant editorial copy", () => {
    const result = checkForbiddenPatterns(
      "This testosterone claim is popular, but the evidence is more nuanced. Here are the useful parts.",
    );
    expect(result.matched).toBe(false);
    expect(result.violations).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    const result = checkForbiddenPatterns("FIX YOUR TESTOSTERONE NOW");
    expect(result.matched).toBe(true);
  });
});

describe("detectHighRiskTopic", () => {
  it("detects 'trt' as high risk", () => {
    expect(detectHighRiskTopic("This video is about TRT therapy")).toBe(true);
  });

  it("detects 'mental health' as high risk", () => {
    expect(detectHighRiskTopic("managing mental health issues")).toBe(true);
  });

  it("detects 'cancer' as high risk", () => {
    expect(detectHighRiskTopic("prostate cancer screening")).toBe(true);
  });

  it("does not flag low-risk content", () => {
    expect(detectHighRiskTopic("a guide to meal prep for busy men")).toBe(
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

  it("returns no errors for valid YouTube Shorts content", () => {
    const errors = validatePlatformConstraints("YOUTUBE_SHORTS", base);
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
    const tooManyTags = Array.from({ length: 6 }, (_, i) => `#tag${i}`);
    const errors = validatePlatformConstraints("LINKEDIN", {
      ...base,
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
