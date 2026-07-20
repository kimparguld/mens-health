import { describe, it, expect } from "vitest";
import { buildUtmUrl } from "@/lib/social/utm";

describe("buildUtmUrl", () => {
  it("produces the correct UTM parameters for YouTube Shorts", () => {
    const url = buildUtmUrl({
      platform: "YOUTUBE_SHORTS",
      path: "/videos/my-video",
      campaign: "claim_check",
    });
    expect(url).toBe(
      "https://www.menhealth-digest.com/videos/my-video?utm_source=youtube&utm_medium=shorts&utm_campaign=claim_check",
    );
  });

  it("produces the correct UTM parameters for Reddit", () => {
    const url = buildUtmUrl({
      platform: "REDDIT",
      path: "/videos/my-video",
      campaign: "reddit_discussion",
    });
    expect(url).toContain("utm_source=reddit");
    expect(url).toContain("utm_medium=post");
    expect(url).toContain("utm_campaign=reddit_discussion");
  });

  it("normalises campaign string to snake_case", () => {
    const url = buildUtmUrl({
      platform: "TIKTOK",
      path: "/videos/test",
      campaign: "Weekly Roundup",
    });
    expect(url).toContain("utm_campaign=weekly_roundup");
  });

  it("handles paths without a leading slash", () => {
    const url = buildUtmUrl({
      platform: "LINKEDIN",
      path: "videos/no-slash",
      campaign: "test",
    });
    expect(url).toContain("/videos/no-slash");
  });

  it("uses a custom baseUrl when supplied", () => {
    const url = buildUtmUrl({
      platform: "X",
      path: "/topics/fitness",
      campaign: "topic",
      baseUrl: "https://staging.menhealth-digest.com",
    });
    expect(url).toContain("staging.menhealth-digest.com");
    expect(url).toContain("utm_source=x");
  });

  it("covers all platform values without throwing", () => {
    const platforms = [
      "YOUTUBE_SHORTS",
      "TIKTOK",
      "INSTAGRAM_REELS",
      "REDDIT",
      "LINKEDIN",
      "X",
    ] as const;
    for (const platform of platforms) {
      expect(() =>
        buildUtmUrl({ platform, path: "/test", campaign: "test" }),
      ).not.toThrow();
    }
  });
});
