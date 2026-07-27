import { describe, it, expect, vi, beforeEach } from "vitest";
import { XAdapter } from "@/lib/social/adapters/x";
import { RedditAdapter } from "@/lib/social/adapters/reddit";

// ---------------------------------------------------------------------------
// Minimal SocialPost factory
// ---------------------------------------------------------------------------

type PartialPost = Partial<{
  id: string;
  platform: string;
  status: string;
  caption: string;
  hook: string;
  script: string;
  hashtags: string[];
  utmUrl: string;
  riskLevel: string;
  requiresReview: boolean;
  sourceType: string;
  sourceId: string;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  platformPostId: string | null;
  platformUrl: string | null;
  templateId: string | null;
  createdAt: Date;
  updatedAt: Date;
}>;

function makePost(overrides: PartialPost = {}) {
  return {
    id: "post_123",
    platform: "X",
    status: "APPROVED",
    caption: "New research on sleep and testosterone. Not medical advice.",
    hook: "Sleep affects testosterone levels more than most men realise.",
    script: "",
    hashtags: ["MensHealth"],
    utmUrl:
      "https://menhealth-digest.com/videos/sleep-testosterone?utm_source=x",
    riskLevel: "LOW",
    requiresReview: false,
    sourceType: "VIDEO_SUMMARY",
    sourceId: "video_abc",
    scheduledAt: null,
    publishedAt: null,
    platformPostId: null,
    platformUrl: null,
    templateId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

// ---------------------------------------------------------------------------
// X adapter — validate()
// ---------------------------------------------------------------------------

describe("XAdapter.validate()", () => {
  const adapter = new XAdapter();

  const shortPost = makePost({
    platform: "X",
    caption: "Sleep research update. Check the link.",
    hashtags: ["MensHealth"],
    utmUrl: "https://menhealth-digest.com/videos/s?utm_source=x",
  });

  it("accepts a valid short post", async () => {
    const result = await adapter.validate(shortPost);
    expect(result.ok).toBe(true);
  });

  it("rejects when caption + UTM URL exceeds 280 chars", async () => {
    const longCaption = "A".repeat(260);
    const result = await adapter.validate(
      makePost({
        platform: "X",
        caption: longCaption,
        hashtags: [],
        utmUrl: "https://menhealth-digest.com/videos/x?utm_source=x",
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/280/);
    }
  });

  it("does not double-append UTM URL if already in caption", async () => {
    // Caption already contains the UTM URL — combined length should not double-count it
    const utmUrl = "https://menhealth-digest.com/videos/s?utm_source=x";
    const caption = `Sleep update. ${utmUrl}`;
    const result = await adapter.validate(
      makePost({
        platform: "X",
        caption,
        hashtags: [],
        utmUrl,
      }),
    );
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Reddit adapter — always blocks publish()
// ---------------------------------------------------------------------------

describe("RedditAdapter", () => {
  const adapter = new RedditAdapter();

  it("validate() accepts content within Reddit constraints", async () => {
    const result = await adapter.validate(
      makePost({
        platform: "REDDIT",
        caption: "A detailed discussion post about testosterone research.",
        hashtags: [],
        script: "Detailed script for the post.",
        hook: "New research on testosterone and sleep.",
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("publish() always returns REDDIT_MANUAL_ONLY", async () => {
    const result = await adapter.publish(makePost({ platform: "REDDIT" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("REDDIT_MANUAL_ONLY");
    }
  });

  it("createDraft() always returns REDDIT_MANUAL_ONLY", async () => {
    const result = await adapter.createDraft(makePost({ platform: "REDDIT" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("REDDIT_MANUAL_ONLY");
    }
  });
});

// ---------------------------------------------------------------------------
// X createDraft() — NOT_SUPPORTED
// ---------------------------------------------------------------------------

describe("XAdapter.createDraft() — not supported", () => {
  it("XAdapter.createDraft() returns NOT_SUPPORTED", async () => {
    const adapter = new XAdapter();
    const result = await adapter.createDraft(
      makePost({ platform: "X", caption: "Short.", hashtags: [] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("NOT_SUPPORTED");
  });
});
