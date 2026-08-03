import { describe, it, expect } from "vitest";
import { SocialPostAiOutputSchema } from "@/lib/social/validation";

describe("SocialPostAiOutputSchema", () => {
  const valid = {
    hook: "This men's health claim is trending.",
    script:
      "A detailed script about the video content and what it means for you.",
    caption:
      "Hook line.\n\nSummary sentence.\n\nEvidence label: Moderate\nRisk level: Low\n\nEducational only. Not medical advice.\n\nhttps://menhealth-digest.com/videos/test?utm_source=youtube&utm_medium=shorts&utm_campaign=test\n\n#MensHealth #Fitness",
    hashtags: ["MensHealth", "Fitness"],
    requiresReview: false,
  };

  it("accepts valid AI output", () => {
    expect(SocialPostAiOutputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing hook", () => {
    const { hook: _hook, ...rest } = valid;
    expect(SocialPostAiOutputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects hook that is too short", () => {
    const result = SocialPostAiOutputSchema.safeParse({ ...valid, hook: "Hi" });
    expect(result.success).toBe(false);
  });

  it("rejects missing requiresReview", () => {
    const { requiresReview: _requiresReview, ...rest } = valid;
    expect(SocialPostAiOutputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects hashtags with spaces", () => {
    const result = SocialPostAiOutputSchema.safeParse({
      ...valid,
      hashtags: ["Men's Health"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts hashtags with # prefix", () => {
    // The schema allows # prefix
    const result = SocialPostAiOutputSchema.safeParse({
      ...valid,
      hashtags: ["#MensHealth"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects more than 30 hashtags", () => {
    const result = SocialPostAiOutputSchema.safeParse({
      ...valid,
      hashtags: Array.from({ length: 31 }, (_, i) => `tag${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty script (text-only platforms such as X and Reddit have no video script)", () => {
    const result = SocialPostAiOutputSchema.safeParse({ ...valid, script: "" });
    expect(result.success).toBe(true);
  });
});
