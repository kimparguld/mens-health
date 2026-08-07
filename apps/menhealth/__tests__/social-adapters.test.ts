import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { XAdapter } from "@/lib/social/adapters/x";
import { RedditAdapter } from "@/lib/social/adapters/reddit";
import { TikTokAdapter } from "@/lib/social/adapters/tiktok";

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
  videoUrl: string | null;
  videoStatus: string | null;
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
    videoUrl: null,
    videoStatus: null,
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

// ---------------------------------------------------------------------------
// TikTok adapter — validate()
// ---------------------------------------------------------------------------

function makeTikTokPost(overrides: PartialPost = {}) {
  return makePost({
    platform: "TIKTOK",
    status: "APPROVED",
    caption: "Sleep affects testosterone more than most men realise.",
    hashtags: ["MensHealth"],
    videoUrl: "https://blob.example.com/social-videos/1.mp4",
    videoStatus: "READY",
    ...overrides,
  });
}

describe("TikTokAdapter.validate()", () => {
  const adapter = new TikTokAdapter();

  it("accepts an approved post with a ready video", async () => {
    const result = await adapter.validate(makeTikTokPost());
    expect(result.ok).toBe(true);
  });

  it("rejects a post that is not APPROVED", async () => {
    const result = await adapter.validate(
      makeTikTokPost({ status: "PENDING_REVIEW" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toMatch(/APPROVED/);
    }
  });

  it("rejects a post with no generated video", async () => {
    const result = await adapter.validate(
      makeTikTokPost({ videoUrl: null, videoStatus: null }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toMatch(/video/i);
    }
  });

  it("rejects a post whose video is still generating", async () => {
    const result = await adapter.validate(
      makeTikTokPost({ videoStatus: "GENERATING" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toMatch(/video/i);
    }
  });

  it("rejects an oversized caption", async () => {
    const result = await adapter.validate(
      makeTikTokPost({ caption: "A".repeat(2201) }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toMatch(/2200/);
    }
  });
});

// ---------------------------------------------------------------------------
// TikTok adapter — publish()
// ---------------------------------------------------------------------------

describe("TikTokAdapter.publish()", () => {
  const db = {
    socialAccount: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    db.socialAccount.findUnique.mockReset();
    db.socialAccount.update.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fails validation before attempting any network call", async () => {
    const adapter = new TikTokAdapter({
      clientId: "id",
      clientSecret: "secret",
      db,
    });
    const result = await adapter.publish(
      makeTikTokPost({ videoUrl: null, videoStatus: null }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("VALIDATION_FAILED");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("publishes and returns the public video URL once TikTok reports completion", async () => {
    db.socialAccount.findUnique.mockResolvedValue({
      accessToken: "token",
      refreshToken: null,
      tokenExpiry: new Date(Date.now() + 3600_000),
      handle: "menhealthdigest",
    });

    fetchMock
      // video fetch
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })
      // init
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            data: { publish_id: "pub_1", upload_url: "https://upload.example.com" },
          }),
      })
      // upload
      .mockResolvedValueOnce({ ok: true, text: async () => "" })
      // status poll
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            status: "PUBLISH_COMPLETE",
            publicly_available_post_id: [123],
          },
        }),
      });

    const adapter = new TikTokAdapter({
      clientId: "id",
      clientSecret: "secret",
      db,
    });
    const result = await adapter.publish(makeTikTokPost());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.platformPostId).toBe("pub_1");
      expect(result.platformUrl).toBe(
        "https://www.tiktok.com/@menhealthdigest/video/123",
      );
    }
  }, 15000);

  it("returns an error when the init call fails", async () => {
    db.socialAccount.findUnique.mockResolvedValue({
      accessToken: "token",
      refreshToken: null,
      tokenExpiry: new Date(Date.now() + 3600_000),
      handle: "menhealthdigest",
    });

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "bad request",
      });

    const adapter = new TikTokAdapter({
      clientId: "id",
      clientSecret: "secret",
      db,
    });
    const result = await adapter.publish(makeTikTokPost());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("TIKTOK_INIT_400");
  });

  it("createDraft() returns NOT_SUPPORTED", async () => {
    const adapter = new TikTokAdapter();
    const result = await adapter.createDraft(makeTikTokPost());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("NOT_SUPPORTED");
  });
});
