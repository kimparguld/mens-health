import { db } from "@/lib/db/prisma";
import { buildUtmUrl } from "./utm";
import { checkForbiddenPatterns } from "./platform-rules";
import type { RiskLevel } from "@prisma/client";

export type RedditDraftInput = {
  videoId: string;
  subreddit: string;
  campaign?: string;
};

export type RedditDraft = {
  subreddit: string;
  title: string;
  body: string;
  linkUrl: string | null;
  manualChecklist: string[];
};

export type Result<T, E = Error> =
  { ok: true; value: T } | { ok: false; error: E };

/**
 * Generate a Reddit draft for a published video summary.
 *
 * This function generates draft content ONLY. It never posts to Reddit.
 * The admin must manually post and then mark the SocialPost as published.
 */
export async function generateRedditDraft(
  input: RedditDraftInput,
): Promise<Result<{ postId: string; draft: RedditDraft }>> {
  const video = await db.video.findUnique({
    where: { id: input.videoId },
    include: {
      summaries: { take: 1, orderBy: { createdAt: "desc" } },
      claims: { take: 3, orderBy: { riskLevel: "desc" } },
      topics: { include: { topic: true } },
    },
  });

  if (!video || video.status !== "PUBLISHED") {
    return {
      ok: false,
      error: new Error(
        `Video ${input.videoId} not found or not in PUBLISHED status`,
      ),
    };
  }

  const summary = video.summaries[0];
  const takeaways = summary ? (summary.takeaways as string[]) : [];
  const topicNames = video.topics.map((vt) => vt.topic.name).join(", ");
  const campaign = input.campaign ?? "reddit_discussion";

  const utmUrl = buildUtmUrl({
    platform: "REDDIT",
    path: `/videos/${video.slug}`,
    campaign,
  });

  const title = buildRedditTitle(video.title, video.riskLevel);
  const body = buildRedditBody({
    shortSummary: summary?.shortSummary ?? video.title,
    takeaways: takeaways.slice(0, 3),
    claimTexts: video.claims.map((c) => c.text),
    topicNames,
    utmUrl,
  });

  // Safety: ensure no forbidden patterns slipped in
  const check = checkForbiddenPatterns(body);
  if (check.matched) {
    return {
      ok: false,
      error: new Error(
        `Reddit draft contains forbidden patterns: ${check.violations.map((v) => v.reason).join(", ")}`,
      ),
    };
  }

  const draft: RedditDraft = {
    subreddit: input.subreddit,
    title,
    body,
    linkUrl: utmUrl,
    manualChecklist: MANUAL_POSTING_CHECKLIST,
  };

  const post = await db.socialPost.create({
    data: {
      platform: "REDDIT",
      status: "PENDING_REVIEW",
      sourceType: "VIDEO_SUMMARY",
      sourceId: input.videoId,
      hook: title,
      script: body,
      caption: body,
      hashtags: [],
      utmUrl,
      riskLevel: video.riskLevel,
      requiresReview: true,
    },
  });

  return { ok: true, value: { postId: post.id, draft } };
}

function buildRedditTitle(videoTitle: string, riskLevel: RiskLevel): string {
  if (riskLevel === "HIGH") {
    return `Discussion: ${videoTitle} — sharing the useful parts and what to be careful about`;
  }
  return `Breakdown: ${videoTitle} — what's worth taking from it`;
}

function buildRedditBody(ctx: {
  shortSummary: string;
  takeaways: string[];
  claimTexts: string[];
  topicNames: string;
  utmUrl: string;
}): string {
  const takeawayLines = ctx.takeaways
    .map((t, i) => `${i + 1}. ${t}`)
    .join("\n");

  const claimNote =
    ctx.claimTexts.length > 0
      ? `\nOne claim worth discussing: ${ctx.claimTexts[0]}\n`
      : "";

  return [
    `I put together a summary of this video on ${ctx.topicNames} and wanted to share the useful parts.`,
    "",
    ctx.shortSummary,
    "",
    "Key takeaways:",
    takeawayLines,
    claimNote,
    "Full summary with evidence notes: " + ctx.utmUrl,
    "",
    "Happy to discuss what's solid here and what needs more context.",
    "",
    "*Educational only — not medical advice.*",
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

/**
 * Checklist shown to admin before manual posting.
 * These rules are not enforced programmatically — they require human judgment.
 */
const MANUAL_POSTING_CHECKLIST: string[] = [
  "Read the subreddit rules before posting — many health subreddits prohibit self-promotion.",
  "Do not post a link-only submission. Lead with value in the post body.",
  "Participate in the comments — answer questions, add context.",
  "Disclose your affiliation if linking to menhealth-digest.com.",
  "Do not repost the same text in multiple subreddits.",
  "Check that the subreddit allows external links at all.",
];
