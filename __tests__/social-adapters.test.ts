import { describe, it, expect, vi, beforeEach } from "vitest";
import { LinkedInAdapter } from "@/lib/social/adapters/linkedin";
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
    platform: "LINKEDIN",
    status: "APPROVED",
    caption:
      "New research on sleep and testosterone. Not medical advice. Educational purposes only.",
    hook: "Sleep affects testosterone levels more than most men realise.",
    script: "A detailed script about the research findings.",
    hashtags: ["MensHealth", "Sleep"],
    utmUrl:
      "https://menhealth-digest.com/videos/sleep-testosterone?utm_source=linkedin",
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
// LinkedIn adapter — validate()
// ---------------------------------------------------------------------------

describe("LinkedInAdapter.validate()", () => {
  const adapter = new LinkedInAdapter();

  it("accepts a valid post", async () => {
    const result = await adapter.validate(makePost());
    expect(result.ok).toBe(true);
  });

  it("rejects a caption that exceeds 3000 chars", async () => {
    const result = await adapter.validate(
      makePost({ caption: "x".repeat(3001) }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/3000/);
    }
  });

  it("rejects when utmUrl is empty", async () => {
    const result = await adapter.validate(makePost({ utmUrl: "" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/UTM URL/);
    }
  });

  it("rejects when too many hashtags are present", async () => {
    const result = await adapter.validate(
      makePost({ hashtags: Array.from({ length: 6 }, (_, i) => `tag${i}`) }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/hashtag/i);
    }
  });
});

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
// LinkedIn / X createDraft() — NOT_SUPPORTED
// ---------------------------------------------------------------------------

describe("LinkedIn and X createDraft() — not supported", () => {
  it("LinkedInAdapter.createDraft() returns NOT_SUPPORTED", async () => {
    const adapter = new LinkedInAdapter();
    const result = await adapter.createDraft(makePost());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("NOT_SUPPORTED");
  });

  it("XAdapter.createDraft() returns NOT_SUPPORTED", async () => {
    const adapter = new XAdapter();
    const result = await adapter.createDraft(
      makePost({ platform: "X", caption: "Short.", hashtags: [] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("NOT_SUPPORTED");
  });
});
