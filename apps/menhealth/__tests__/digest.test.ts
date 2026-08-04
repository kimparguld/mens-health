import { describe, it, expect } from "vitest";
import {
  buildDigestSubject,
  buildDigestHtml,
  buildDigestText,
  withNewsletterUtm,
  type DigestVideo,
  type DigestClaim,
  type WeeklyDigestMeta,
} from "@/lib/newsletter/digest";

const makeClaim = (overrides: Partial<DigestClaim> = {}): DigestClaim => ({
  claim: "Cold showers boost testosterone",
  verdict: "Mixed",
  summary: "Limited evidence; small studies with inconsistent results.",
  slug: "cold-showers-testosterone",
  ...overrides,
});

const makeVideo = (overrides: Partial<DigestVideo> = {}): DigestVideo => ({
  title: "How to Build Muscle Over 40",
  slug: "how-to-build-muscle-over-40",
  channelTitle: "StrengthMD",
  thumbnailUrl: "https://img.youtube.com/vi/abc123/hqdefault.jpg",
  shortSummary:
    "Evidence-based resistance training strategies for men over 40.",
  trendScore: 0.9,
  checkedClaims: [makeClaim()],
  practicalTakeaway: "Train 3x per week with progressive overload.",
  overhypedClaim: "You need expensive supplements to build muscle.",
  ...overrides,
});

const APP_URL = "https://menhealth-digest.com";
const UNSUB_URL =
  "https://menhealth-digest.com/api/newsletter/unsubscribe?id=sub_123";

// ---------------------------------------------------------------------------
// withNewsletterUtm
// ---------------------------------------------------------------------------
describe("withNewsletterUtm", () => {
  it("appends UTM params with ? when no query string exists", () => {
    const result = withNewsletterUtm("https://example.com/topics");
    expect(result).toBe(
      "https://example.com/topics?utm_source=newsletter&utm_medium=email&utm_campaign=weekly_digest",
    );
  });

  it("appends UTM params with & when query string already exists", () => {
    const result = withNewsletterUtm(
      "https://example.com/unsubscribe?id=abc",
      "weekly_digest",
    );
    expect(result).toContain("&utm_source=newsletter");
  });

  it("uses the supplied campaign name", () => {
    const result = withNewsletterUtm(
      "https://example.com/topics",
      "weekly_digest_2024-w01",
    );
    expect(result).toContain("utm_campaign=weekly_digest_2024-w01");
  });
});

// ---------------------------------------------------------------------------
// buildDigestSubject
// ---------------------------------------------------------------------------
describe("buildDigestSubject", () => {
  it("returns a title-based subject when no claims exist", () => {
    const subject = buildDigestSubject([makeVideo({ checkedClaims: [] })]);
    expect(subject).toContain("men's health digest");
    expect(subject).toContain("How to Build Muscle Over 40");
  });

  it("returns a generic subject when no videos are provided", () => {
    expect(buildDigestSubject([])).toBe(
      "Men's health claims worth understanding this week",
    );
  });

  it("returns generic subject (no count) for 1–2 claims", () => {
    const subject = buildDigestSubject([
      makeVideo({ checkedClaims: [makeClaim()] }),
    ]);
    expect(subject).toBe("Men's health claims worth understanding this week");
  });

  it("returns '3 claims' subject for 3 or more claims", () => {
    const videos = [
      makeVideo({ checkedClaims: [makeClaim(), makeClaim(), makeClaim()] }),
    ];
    expect(buildDigestSubject(videos)).toBe(
      "3 men's health claims worth understanding this week",
    );
  });

  it("counts total claims across all videos for threshold", () => {
    const videos = [
      makeVideo({ checkedClaims: [makeClaim(), makeClaim()] }),
      makeVideo({ checkedClaims: [makeClaim()] }),
    ];
    expect(buildDigestSubject(videos)).toBe(
      "3 men's health claims worth understanding this week",
    );
  });

  it("keeps subject under 80 characters", () => {
    const longTitle = "A".repeat(100);
    const subject = buildDigestSubject([
      makeVideo({ title: longTitle, checkedClaims: [] }),
    ]);
    expect(subject.length).toBeLessThanOrEqual(80);
  });
});

// ---------------------------------------------------------------------------
// buildDigestHtml
// ---------------------------------------------------------------------------
describe("buildDigestHtml", () => {
  it("includes the newsletter intro paragraph", () => {
    const html = buildDigestHtml([makeVideo()], APP_URL, UNSUB_URL);
    expect(html).toContain("trending men's health video");
    expect(html).toContain("three claims worth understanding");
  });

  it("includes the top video title and channel", () => {
    const html = buildDigestHtml([makeVideo()], APP_URL, UNSUB_URL);
    expect(html).toContain("How to Build Muscle Over 40");
    expect(html).toContain("StrengthMD");
  });

  it("includes 'Top Video This Week' heading", () => {
    const html = buildDigestHtml([makeVideo()], APP_URL, UNSUB_URL);
    expect(html).toContain("Top Video This Week");
  });

  it("includes a link to the video detail page", () => {
    const html = buildDigestHtml([makeVideo()], APP_URL, UNSUB_URL);
    expect(html).toContain(`${APP_URL}/videos/how-to-build-muscle-over-40`);
  });

  it("uses 'Read the full summary' CTA on the top video", () => {
    const html = buildDigestHtml([makeVideo()], APP_URL, UNSUB_URL);
    expect(html).toContain("Read the full summary");
  });

  it("includes the unsubscribe link", () => {
    const html = buildDigestHtml([makeVideo()], APP_URL, UNSUB_URL);
    expect(html).toContain(UNSUB_URL);
  });

  it("includes the health disclaimer", () => {
    const html = buildDigestHtml([makeVideo()], APP_URL, UNSUB_URL);
    expect(html.toLowerCase()).toContain("disclaimer");
    expect(html).toContain("does not constitute medical advice");
  });

  it("always renders '3 Claims Checked' heading", () => {
    const html = buildDigestHtml([makeVideo()], APP_URL, UNSUB_URL);
    expect(html).toContain("3 Claims Checked");
  });

  it("renders checked claims with verdict, summary, and CTA link", () => {
    const html = buildDigestHtml([makeVideo()], APP_URL, UNSUB_URL);
    expect(html).toContain("Cold showers boost testosterone");
    expect(html).toContain("Mixed");
    expect(html).toContain("Limited evidence");
    expect(html).toContain(`${APP_URL}/claims/cold-showers-testosterone`);
    expect(html).toContain("Read the claim breakdown");
  });

  it("caps rendered claims at 3 across all videos", () => {
    const videos = [
      makeVideo({
        checkedClaims: [
          makeClaim({ slug: "c1" }),
          makeClaim({ slug: "c2" }),
          makeClaim({ slug: "c3" }),
          makeClaim({ slug: "c4" }),
        ],
      }),
    ];
    const html = buildDigestHtml(videos, APP_URL, UNSUB_URL);
    expect(html).toContain("/claims/c1");
    expect(html).toContain("/claims/c3");
    expect(html).not.toContain("/claims/c4");
  });

  it("renders '3 Claims Checked' heading even when no claims provided", () => {
    const html = buildDigestHtml(
      [makeVideo({ checkedClaims: [] })],
      APP_URL,
      UNSUB_URL,
    );
    expect(html).toContain("3 Claims Checked");
  });

  it("renders fallback text when no claims are available", () => {
    const html = buildDigestHtml(
      [makeVideo({ checkedClaims: [] })],
      APP_URL,
      UNSUB_URL,
    );
    expect(html).toContain("No claims were fully checked this week");
  });

  it("always renders 'Practical Takeaway' heading", () => {
    const html = buildDigestHtml([makeVideo()], APP_URL, UNSUB_URL);
    expect(html).toContain("Practical Takeaway");
    expect(html).toContain("Train 3x per week with progressive overload.");
  });

  it("renders practical takeaway fallback when not provided", () => {
    const html = buildDigestHtml(
      [makeVideo({ practicalTakeaway: null })],
      APP_URL,
      UNSUB_URL,
    );
    expect(html).toContain("Practical Takeaway");
    expect(html).toContain("No practical takeaway was selected this week");
  });

  it("always renders 'Most Overhyped Claim This Week' heading", () => {
    const html = buildDigestHtml([makeVideo()], APP_URL, UNSUB_URL);
    expect(html).toContain("Most Overhyped Claim This Week");
    expect(html).toContain("You need expensive supplements to build muscle.");
  });

  it("renders overhyped claim fallback when not provided", () => {
    const html = buildDigestHtml(
      [makeVideo({ overhypedClaim: null })],
      APP_URL,
      UNSUB_URL,
    );
    expect(html).toContain("Most Overhyped Claim This Week");
    expect(html).toContain("No overhyped claim was selected this week");
  });

  it("includes Explore More links to /topics, /rankings, /creators, /weekly", () => {
    const html = buildDigestHtml([makeVideo()], APP_URL, UNSUB_URL);
    expect(html).toContain(`${APP_URL}/topics`);
    expect(html).toContain(`${APP_URL}/rankings`);
    expect(html).toContain(`${APP_URL}/creators`);
    expect(html).toContain(`${APP_URL}/weekly`);
  });

  it("adds UTM parameters to internal links", () => {
    const html = buildDigestHtml([makeVideo()], APP_URL, UNSUB_URL);
    expect(html).toContain("utm_source=newsletter");
    expect(html).toContain("utm_medium=email");
    expect(html).toContain("utm_campaign=weekly_digest");
  });

  it("uses weeklySlug in UTM campaign when meta is provided", () => {
    const meta: WeeklyDigestMeta = { weeklySlug: "2024-w01" };
    const html = buildDigestHtml([makeVideo()], APP_URL, UNSUB_URL, meta);
    expect(html).toContain("utm_campaign=weekly_digest_2024-w01");
    expect(html).toContain(`${APP_URL}/weekly/2024-w01`);
  });

  it("omits img tag when thumbnailUrl is null", () => {
    const html = buildDigestHtml(
      [makeVideo({ thumbnailUrl: null })],
      APP_URL,
      UNSUB_URL,
    );
    expect(html).not.toContain("<img");
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

  it("escapes HTML special characters in claim text", () => {
    const html = buildDigestHtml(
      [
        makeVideo({
          checkedClaims: [makeClaim({ claim: "<b>bold</b> claim" })],
        }),
      ],
      APP_URL,
      UNSUB_URL,
    );
    expect(html).not.toContain("<b>bold</b>");
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
  });

  it("renders 'Top Video This Week' fallback when no videos provided", () => {
    const html = buildDigestHtml([], APP_URL, UNSUB_URL);
    expect(html).toContain("Top Video This Week");
    expect(html).toContain("No video was featured this week");
  });
});

// ---------------------------------------------------------------------------
// buildDigestText
// ---------------------------------------------------------------------------
describe("buildDigestText", () => {
  it("includes the newsletter intro paragraph", () => {
    const text = buildDigestText([makeVideo()], APP_URL, UNSUB_URL);
    expect(text).toContain("trending men's health video");
  });

  it("includes 'TOP VIDEO THIS WEEK' heading", () => {
    const text = buildDigestText([makeVideo()], APP_URL, UNSUB_URL);
    expect(text).toContain("TOP VIDEO THIS WEEK");
  });

  it("includes the video title and channel", () => {
    const text = buildDigestText([makeVideo()], APP_URL, UNSUB_URL);
    expect(text).toContain("How to Build Muscle Over 40");
    expect(text).toContain("StrengthMD");
  });

  it("includes the video detail URL with UTM params", () => {
    const text = buildDigestText([makeVideo()], APP_URL, UNSUB_URL);
    expect(text).toContain(`${APP_URL}/videos/how-to-build-muscle-over-40`);
    expect(text).toContain("utm_source=newsletter");
  });

  it("includes the unsubscribe URL", () => {
    const text = buildDigestText([makeVideo()], APP_URL, UNSUB_URL);
    expect(text).toContain(UNSUB_URL);
  });

  it("includes the disclaimer", () => {
    const text = buildDigestText([makeVideo()], APP_URL, UNSUB_URL);
    expect(text).toContain("does not constitute medical advice");
  });

  it("always renders '3 CLAIMS CHECKED' heading", () => {
    const text = buildDigestText([makeVideo()], APP_URL, UNSUB_URL);
    expect(text).toContain("3 CLAIMS CHECKED");
  });

  it("includes checked claims with verdict and link", () => {
    const text = buildDigestText([makeVideo()], APP_URL, UNSUB_URL);
    expect(text).toContain("[MIXED]");
    expect(text).toContain("Cold showers boost testosterone");
    expect(text).toContain(`${APP_URL}/claims/cold-showers-testosterone`);
  });

  it("renders claims fallback text when no claims available", () => {
    const text = buildDigestText(
      [makeVideo({ checkedClaims: [] })],
      APP_URL,
      UNSUB_URL,
    );
    expect(text).toContain("3 CLAIMS CHECKED");
    expect(text).toContain("No claims were fully checked this week");
  });

  it("always renders 'PRACTICAL TAKEAWAY' heading", () => {
    const text = buildDigestText([makeVideo()], APP_URL, UNSUB_URL);
    expect(text).toContain("PRACTICAL TAKEAWAY");
    expect(text).toContain("Train 3x per week with progressive overload.");
  });

  it("renders practical takeaway fallback when not provided", () => {
    const text = buildDigestText(
      [makeVideo({ practicalTakeaway: null })],
      APP_URL,
      UNSUB_URL,
    );
    expect(text).toContain("PRACTICAL TAKEAWAY");
    expect(text).toContain("No practical takeaway was selected this week");
  });

  it("always renders 'MOST OVERHYPED CLAIM THIS WEEK' heading", () => {
    const text = buildDigestText([makeVideo()], APP_URL, UNSUB_URL);
    expect(text).toContain("MOST OVERHYPED CLAIM THIS WEEK");
    expect(text).toContain("You need expensive supplements to build muscle.");
  });

  it("renders overhyped claim fallback when not provided", () => {
    const text = buildDigestText(
      [makeVideo({ overhypedClaim: null })],
      APP_URL,
      UNSUB_URL,
    );
    expect(text).toContain("MOST OVERHYPED CLAIM THIS WEEK");
    expect(text).toContain("No overhyped claim was selected this week");
  });

  it("includes Explore More links to /topics, /rankings, /creators, /weekly", () => {
    const text = buildDigestText([makeVideo()], APP_URL, UNSUB_URL);
    expect(text).toContain(`${APP_URL}/topics`);
    expect(text).toContain(`${APP_URL}/rankings`);
    expect(text).toContain(`${APP_URL}/creators`);
    expect(text).toContain(`${APP_URL}/weekly`);
  });

  it("adds UTM parameters to internal links", () => {
    const text = buildDigestText([makeVideo()], APP_URL, UNSUB_URL);
    expect(text).toContain("utm_source=newsletter");
    expect(text).toContain("utm_medium=email");
    expect(text).toContain("utm_campaign=weekly_digest");
  });

  it("uses weeklySlug in UTM campaign and weekly link when meta is provided", () => {
    const meta: WeeklyDigestMeta = { weeklySlug: "2024-w01" };
    const text = buildDigestText([makeVideo()], APP_URL, UNSUB_URL, meta);
    expect(text).toContain("utm_campaign=weekly_digest_2024-w01");
    expect(text).toContain(`${APP_URL}/weekly/2024-w01`);
  });

  it("renders 'TOP VIDEO THIS WEEK' fallback when no videos provided", () => {
    const text = buildDigestText([], APP_URL, UNSUB_URL);
    expect(text).toContain("TOP VIDEO THIS WEEK");
    expect(text).toContain("No video was featured this week");
  });
});
