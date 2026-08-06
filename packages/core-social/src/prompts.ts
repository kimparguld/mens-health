import type { Platform, RiskLevel } from "@prisma/client";
import { PLATFORM_CONSTRAINTS } from "./platform-constraints";
import type { VideoContext } from "./generate-social-post";

export type PromptConfig = {
  siteName: string;
  /** What kind of content this is, substituted into the prompt in place of the old hardcoded "men's health video summary", e.g. "product/course review". */
  contentTypeLabel: string;
  /** Appended to every caption, substituted into the prompt in place of the old hardcoded "Educational only. Not medical advice.". */
  disclaimerLine: string;
  /** Site-specific high-risk topic keywords. */
  highRiskKeywords: string[];
};

function evidenceLabel(score: number | null): string {
  if (score === null) return "Not checked";
  if (score >= 0.75) return "Strong";
  if (score >= 0.5) return "Moderate";
  if (score >= 0.25) return "Mixed";
  return "Weak";
}

function riskLabel(level: RiskLevel): string {
  return level.charAt(0) + level.slice(1).toLowerCase();
}

function buildHeader(config: PromptConfig, platformLabel: string): string {
  return `You are the social content writer for ${config.siteName}.

Generate a ${platformLabel} post for the following ${config.contentTypeLabel}.`;
}

function buildContextBlock(ctx: VideoContext, utmUrl: string): string {
  return `Video title: ${ctx.title}
Summary: ${ctx.shortSummary}
Key takeaways: ${ctx.takeaways.slice(0, 3).join(" | ")}
Notable claims: ${ctx.claimTexts.slice(0, 2).join(" | ")}
Evidence: ${evidenceLabel(ctx.evidenceScore)}
Risk level: ${riskLabel(ctx.riskLevel)}
Topics: ${ctx.topicNames.join(", ")}
UTM link: ${utmUrl}`;
}

function buildResponseFooter(config: PromptConfig): string {
  return `Set requiresReview to true if the content involves any of: ${config.highRiskKeywords.slice(0, 6).join(", ")}.

Respond ONLY with a JSON object:
{
  "hook": "string",
  "script": "string",
  "caption": "string",
  "hashtags": ["string"],
  "requiresReview": boolean
}`;
}

/**
 * X: a single punchy post — the hook and the post are the same text, no
 * hashtags. The caption budget is computed from the real UTM URL length so
 * link + evidence label + risk level + disclaimer always fit in 280 chars
 * (the old flat-280 budget never subtracted the link, which is why X
 * generation used to fail validation almost every time).
 */
export function buildXPrompt(
  ctx: VideoContext,
  utmUrl: string,
  config: PromptConfig,
): string {
  const captionBudget = 280 - utmUrl.length - 1;
  return `${buildHeader(config, "X (Twitter)")}

${buildContextBlock(ctx, utmUrl)}

This is a single punchy post — the hook IS the post, there's no separate lead-in. Write one tight, scroll-stopping post, not a thread.

Platform limits (HARD — do not exceed):
- Caption: ${captionBudget} characters max — this already subtracts the UTM link's ${utmUrl.length} characters and a separating space, so the full post (link included) fits in 280 characters. Do not add the link on top of this budget; it is already included.
- Hashtags: 0 max — do not include any hashtags

Rules:
- Do NOT write fear-based or manipulative copy — no unsubstantiated guarantees, no implying the reader is at risk, no fake urgency.
- Set "hook" to the exact same text as "caption" — there is no separate hook field for X, just one post.
- Include the UTM link in the caption text itself.
- Work the evidence label and risk level naturally into the post.
- End with: "${config.disclaimerLine}"
- Set "script" to an empty string "" — X is text-only.

${buildResponseFooter(config)}`;
}

/** Reddit: discussion-post voice, no hashtags, no salesy CTA — matches the subreddit checklist shown in DraftActions.tsx. */
export function buildRedditPrompt(
  ctx: VideoContext,
  utmUrl: string,
  config: PromptConfig,
): string {
  const constraints = PLATFORM_CONSTRAINTS.REDDIT;
  return `${buildHeader(config, "Reddit")}

${buildContextBlock(ctx, utmUrl)}

Write in discussion-post voice — like a genuine post meant to start a conversation, not an ad. Do not write a salesy call-to-action ("check this out", "click here", "don't miss this").

Platform limits (HARD — do not exceed):
- Caption (post body): ${constraints.maxCaptionChars} characters max
- Hook (post title): ${constraints.maxHookChars} characters max
- Hashtags: ${constraints.maxHashtags} max — Reddit doesn't use hashtags

Rules:
- Do NOT write fear-based or manipulative copy — no unsubstantiated guarantees, no implying the reader is at risk, no fake urgency.
- The post must stand on its own without the link — Reddit communities penalize posts that exist only to drive clicks.
- Mention the UTM link at most once, framed as a source, not a call to action.
- Include the evidence label and risk level in the body.
- End with: "${config.disclaimerLine}"
- Set "script" to an empty string "" — Reddit is text-only.

${buildResponseFooter(config)}`;
}

/** YouTube Community: short, casual, engagement/question style. */
export function buildYouTubeCommunityPrompt(
  ctx: VideoContext,
  utmUrl: string,
  config: PromptConfig,
): string {
  const constraints = PLATFORM_CONSTRAINTS.YOUTUBE_COMMUNITY;
  return `${buildHeader(config, "YouTube Community")}

${buildContextBlock(ctx, utmUrl)}

Write a short, casual community post in an engagement/question style — open with a question that invites replies, like you're talking to your subscribers, not announcing content.

Platform limits (HARD — do not exceed):
- Caption: ${constraints.maxCaptionChars} characters max
- Hook (opening question): ${constraints.maxHookChars} characters max
- Hashtags: ${constraints.maxHashtags} max

Rules:
- Do NOT write fear-based or manipulative copy — no unsubstantiated guarantees, no implying the reader is at risk, no fake urgency.
- Include the UTM link in the caption.
- Include the evidence label and risk level in the caption.
- End with: "${config.disclaimerLine}"
- Set "script" to an empty string "" — this is a text post, not a video.

${buildResponseFooter(config)}`;
}

/** TikTok: hook + on-camera script for a human to film. Draft-only — TikTokAdapter.publish() stays a stub. */
export function buildTikTokPrompt(
  ctx: VideoContext,
  utmUrl: string,
  config: PromptConfig,
): string {
  const constraints = PLATFORM_CONSTRAINTS.TIKTOK;
  return `${buildHeader(config, "TikTok")}

${buildContextBlock(ctx, utmUrl)}

Write a hook + on-camera script for a human to film — this is a filming script, not a caption-only post. A creator will read "hook" aloud as the opening line, then follow "script" beat by beat.

Platform limits (HARD — do not exceed):
- Hook (spoken opening line): ${constraints.maxHookChars} characters max
- Script (spoken lines, written for a human to read on camera): ${constraints.maxScriptWords} words max
- Caption (the written video description, not spoken): ${constraints.maxCaptionChars} characters max
- Hashtags: ${constraints.maxHashtags} max

Rules:
- Do NOT write fear-based or manipulative copy — no unsubstantiated guarantees, no implying the reader is at risk, no fake urgency.
- Write "script" as short spoken beats a person can read on camera, not prose paragraphs.
- Put the UTM link in the caption only — never in the script, since no one reads a URL aloud on camera.
- Include the evidence label and risk level in the caption.
- End the caption with: "${config.disclaimerLine}"

${buildResponseFooter(config)}`;
}

export function buildSocialPrompt(
  platform: Platform,
  ctx: VideoContext,
  utmUrl: string,
  config: PromptConfig,
): string {
  switch (platform) {
    case "X":
      return buildXPrompt(ctx, utmUrl, config);
    case "REDDIT":
      return buildRedditPrompt(ctx, utmUrl, config);
    case "YOUTUBE_COMMUNITY":
      return buildYouTubeCommunityPrompt(ctx, utmUrl, config);
    case "TIKTOK":
      return buildTikTokPrompt(ctx, utmUrl, config);
  }
}
