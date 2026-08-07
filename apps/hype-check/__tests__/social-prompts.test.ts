import { describe, it, expect } from "vitest";
import {
  buildXPrompt,
  buildRedditPrompt,
  buildYouTubeCommunityPrompt,
  buildTikTokPrompt,
  buildSocialPrompt,
  type PromptConfig,
} from "@/lib/social/prompts";

const ctx = {
  title: "Does Cold Plunging Raise Testosterone?",
  slug: "cold-plunging-testosterone",
  shortSummary: "A look at the evidence behind cold exposure and T levels.",
  takeaways: [
    "Evidence is mixed",
    "Short-term spikes are not sustained",
    "More research is needed",
  ],
  riskLevel: "MEDIUM" as const,
  evidenceScore: 0.4,
  topicNames: ["Testosterone", "Recovery"],
  claimTexts: ["Cold plunges permanently raise testosterone"],
};

const config: PromptConfig = {
  siteName: "MenHealth Digest",
  contentTypeLabel: "men's health video summary",
  disclaimerLine: "Educational only. Not medical advice.",
  highRiskKeywords: ["testosterone", "TRT"],
};

const utmUrl =
  "https://www.menhealth-digest.com/videos/cold-plunging-testosterone?utm_source=x&utm_medium=post&utm_campaign=social";

describe("buildXPrompt", () => {
  it("instructs no hashtags and a single post, not a thread", () => {
    const prompt = buildXPrompt(ctx, utmUrl, config);
    expect(prompt).toContain("Hashtags: 0");
    expect(prompt).toContain("hook IS the post");
  });

  it("computes the caption budget from the real UTM URL length", () => {
    const prompt = buildXPrompt(ctx, utmUrl, config);
    const expectedBudget = 280 - utmUrl.length - 1;
    expect(prompt).toContain(`Caption: ${expectedBudget} characters max`);
  });

  it("recomputes the budget for a different UTM URL length", () => {
    const shortUrl = "https://mhd.example/v/x";
    const prompt = buildXPrompt(ctx, shortUrl, config);
    const expectedBudget = 280 - shortUrl.length - 1;
    expect(prompt).toContain(`Caption: ${expectedBudget} characters max`);
  });
});

describe("buildRedditPrompt", () => {
  it("instructs discussion-post voice with no hashtags and no salesy CTA", () => {
    const prompt = buildRedditPrompt(ctx, utmUrl, config);
    expect(prompt).toContain("discussion-post voice");
    expect(prompt).toContain("Hashtags: 0");
    expect(prompt).toContain("salesy call-to-action");
  });
});

describe("buildYouTubeCommunityPrompt", () => {
  it("instructs a short, casual, question-style post", () => {
    const prompt = buildYouTubeCommunityPrompt(ctx, utmUrl, config);
    expect(prompt).toContain("engagement/question style");
  });
});

describe("buildTikTokPrompt", () => {
  it("instructs a hook plus on-camera script for a human to film", () => {
    const prompt = buildTikTokPrompt(ctx, utmUrl, config);
    expect(prompt).toContain("on-camera script");
    expect(prompt).toContain("Script (spoken lines");
  });
});

describe("buildSocialPrompt", () => {
  it("dispatches to the matching per-platform builder", () => {
    expect(buildSocialPrompt("X", ctx, utmUrl, config)).toBe(
      buildXPrompt(ctx, utmUrl, config),
    );
    expect(buildSocialPrompt("REDDIT", ctx, utmUrl, config)).toBe(
      buildRedditPrompt(ctx, utmUrl, config),
    );
    expect(buildSocialPrompt("YOUTUBE_COMMUNITY", ctx, utmUrl, config)).toBe(
      buildYouTubeCommunityPrompt(ctx, utmUrl, config),
    );
    expect(buildSocialPrompt("TIKTOK", ctx, utmUrl, config)).toBe(
      buildTikTokPrompt(ctx, utmUrl, config),
    );
  });
});
