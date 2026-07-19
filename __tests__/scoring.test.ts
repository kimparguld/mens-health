import { describe, it, expect } from "vitest";
import { scoreVideo, detectsClickbait } from "@/lib/youtube/scoring";

const BASE_INPUT = {
  viewCount: 100_000,
  likeCount: 5_000,
  commentCount: 300,
  publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
  channelTrustScore: 0.7,
  titleRelevance: 0.8,
  topicMatch: 0.9,
  containsHighRiskClaims: false,
};

describe("detectsClickbait", () => {
  it("detects clickbait patterns", () => {
    expect(detectsClickbait("Doctor HATES this simple trick")).toBe(true);
    expect(detectsClickbait("Secret they DON'T tell you")).toBe(true);
    expect(detectsClickbait("Miracle Cure for low T")).toBe(true);
    expect(detectsClickbait("10x Testosterone in 30 days")).toBe(true);
  });

  it("returns false for normal titles", () => {
    expect(detectsClickbait("How to improve sleep quality")).toBe(false);
    expect(detectsClickbait("Evidence-based testosterone optimization")).toBe(
      false,
    );
  });
});

describe("scoreVideo", () => {
  it("returns scores between 0 and 1", () => {
    const result = scoreVideo(
      BASE_INPUT,
      "How to improve testosterone naturally",
    );
    expect(result.trendScore).toBeGreaterThanOrEqual(0);
    expect(result.trendScore).toBeLessThanOrEqual(1);
    expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
    expect(result.relevanceScore).toBeLessThanOrEqual(1);
  });

  it("penalizes clickbait titles", () => {
    const normalScore = scoreVideo(BASE_INPUT, "Testosterone evidence review");
    const clickbaitScore = scoreVideo(
      BASE_INPUT,
      "Doctor HATES this testosterone secret",
    );
    expect(clickbaitScore.trendScore).toBeLessThan(normalScore.trendScore);
  });

  it("penalizes high-risk claims", () => {
    const normalScore = scoreVideo(BASE_INPUT, "Fitness tips for men over 40");
    const riskScore = scoreVideo(
      { ...BASE_INPUT, containsHighRiskClaims: true },
      "Fitness tips for men over 40",
    );
    expect(riskScore.trendScore).toBeLessThan(normalScore.trendScore);
  });

  it("gives higher scores to recent videos", () => {
    const recentScore = scoreVideo(
      {
        ...BASE_INPUT,
        publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      "Fitness overview",
    );
    const oldScore = scoreVideo(
      {
        ...BASE_INPUT,
        publishedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
      "Fitness overview",
    );
    expect(recentScore.trendScore).toBeGreaterThan(oldScore.trendScore);
  });

  it("returns zero trend score for zero views with both penalties applied", () => {
    const result = scoreVideo(
      {
        ...BASE_INPUT,
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        channelTrustScore: 0,
        titleRelevance: 0,
        topicMatch: 0,
        containsHighRiskClaims: true,
      },
      "Doctor HATES this miracle cure",
    );
    expect(result.trendScore).toBe(0);
  });
});
