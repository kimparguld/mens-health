import { describe, it, expect } from "vitest";
import {
  buildDigestSubject,
  buildDigestHtml,
  buildDigestText,
  type DigestVideo,
} from "@/lib/newsletter/digest";

const makeVideo = (overrides: Partial<DigestVideo> = {}): DigestVideo => ({
  title: "How to Build Muscle Over 40",
  slug: "how-to-build-muscle-over-40",
  channelTitle: "StrengthMD",
  thumbnailUrl: "https://img.youtube.com/vi/abc123/hqdefault.jpg",
  shortSummary:
    "Evidence-based resistance training strategies for men over 40.",
  trendScore: 0.9,
  ...overrides,
});

const APP_URL = "https://menhealthdigest.com";
const UNSUB_URL =
  "https://menhealthdigest.com/api/newsletter/unsubscribe?id=sub_123";

describe("buildDigestSubject", () => {
  it("returns a generic subject when no videos are provided", () => {
    expect(buildDigestSubject([])).toBe("Your Weekly Men's Health Digest");
  });

  it("includes the top video title truncated to 60 chars", () => {
    const longTitle = "A".repeat(80);
    const subject = buildDigestSubject([makeVideo({ title: longTitle })]);
    expect(subject).toContain("…");
    expect(subject.length).toBeLessThan(120);
  });

  it("includes the remaining video count", () => {
    const videos = [
      makeVideo(),
      makeVideo({ title: "Video 2" }),
      makeVideo({ title: "Video 3" }),
    ];
    const subject = buildDigestSubject(videos);
    expect(subject).toContain("+ 2 more");
  });

  it("shows '+ 0 more' for a single video", () => {
    const subject = buildDigestSubject([makeVideo()]);
    expect(subject).toContain("+ 0 more");
  });
});

describe("buildDigestHtml", () => {
  it("includes the video title", () => {
    const html = buildDigestHtml([makeVideo()], APP_URL, UNSUB_URL);
    expect(html).toContain("How to Build Muscle Over 40");
  });

  it("includes the video detail link", () => {
    const html = buildDigestHtml([makeVideo()], APP_URL, UNSUB_URL);
    expect(html).toContain(`${APP_URL}/videos/how-to-build-muscle-over-40`);
  });

  it("includes the unsubscribe link", () => {
    const html = buildDigestHtml([makeVideo()], APP_URL, UNSUB_URL);
    expect(html).toContain(UNSUB_URL);
  });

  it("includes the health disclaimer", () => {
    const html = buildDigestHtml([makeVideo()], APP_URL, UNSUB_URL);
    expect(html.toLowerCase()).toContain("health disclaimer");
    expect(html).toContain("does not constitute medical advice");
  });

  it("escapes HTML special characters in video titles", () => {
    const html = buildDigestHtml(
      [makeVideo({ title: '<script>alert("xss")</script>' })],
      APP_URL,
      UNSUB_URL,
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("omits img tag when thumbnailUrl is null", () => {
    const html = buildDigestHtml(
      [makeVideo({ thumbnailUrl: null })],
      APP_URL,
      UNSUB_URL,
    );
    expect(html).not.toContain("<img");
  });

  it("renders all videos", () => {
    const videos = [
      makeVideo({ title: "Video One", slug: "video-one" }),
      makeVideo({ title: "Video Two", slug: "video-two" }),
    ];
    const html = buildDigestHtml(videos, APP_URL, UNSUB_URL);
    expect(html).toContain("Video One");
    expect(html).toContain("Video Two");
  });
});

describe("buildDigestText", () => {
  it("includes the video title and channel", () => {
    const text = buildDigestText([makeVideo()], APP_URL, UNSUB_URL);
    expect(text).toContain("How to Build Muscle Over 40");
    expect(text).toContain("StrengthMD");
  });

  it("includes the video detail URL", () => {
    const text = buildDigestText([makeVideo()], APP_URL, UNSUB_URL);
    expect(text).toContain(`${APP_URL}/videos/how-to-build-muscle-over-40`);
  });

  it("includes the unsubscribe URL", () => {
    const text = buildDigestText([makeVideo()], APP_URL, UNSUB_URL);
    expect(text).toContain(UNSUB_URL);
  });

  it("includes the disclaimer", () => {
    const text = buildDigestText([makeVideo()], APP_URL, UNSUB_URL);
    expect(text).toContain("does not constitute medical advice");
  });
});
