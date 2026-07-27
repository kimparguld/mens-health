import { z } from "zod";
import { env } from "@/env";
import { anthropic, DEFAULT_MODEL } from "@/lib/ai/client";
import { db } from "@/lib/db/prisma";
import { buildUtmUrl } from "./utm";
import {
  checkForbiddenPatterns,
  detectHighRiskTopic,
  validatePlatformConstraints,
  PLATFORM_CONSTRAINTS,
} from "./platform-rules";
import { SocialPostAiOutputSchema } from "./validation";
import type { Platform, RiskLevel } from "@prisma/client";

export type Result<T, E = Error> =
  { ok: true; value: T } | { ok: false; error: E };

export type GenerateSocialPostInput = {
  videoId: string;
  platform: Platform;
  campaign?: string;
  templateId?: string;
};

type VideoContext = {
  title: string;
  slug: string;
  shortSummary: string;
  takeaways: string[];
  riskLevel: RiskLevel;
  evidenceScore: number | null;
  topicNames: string[];
  claimTexts: string[];
};

async function fetchVideoContext(
  videoId: string,
): Promise<VideoContext | null> {
  const video = await db.video.findUnique({
    where: { id: videoId },
    include: {
      summaries: { take: 1, orderBy: { createdAt: "desc" } },
      topics: { include: { topic: true } },
      claims: { take: 5, orderBy: { riskLevel: "desc" } },
    },
  });

  if (!video || video.status !== "PUBLISHED") return null;

  const summary = video.summaries[0];
  const takeaways = summary ? (summary.takeaways as string[]) : [];

  return {
    title: video.title,
    slug: video.slug,
    shortSummary: summary?.shortSummary ?? video.title,
    takeaways,
    riskLevel: video.riskLevel,
    evidenceScore: video.evidenceScore,
    topicNames: video.topics.map((vt) => vt.topic.name),
    claimTexts: video.claims.map((c) => c.text),
  };
}

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

function buildPrompt(
  ctx: VideoContext,
  platform: Platform,
  utmUrl: string,
): string {
  const constraints = PLATFORM_CONSTRAINTS[platform];
  return `You are the social content writer for MenHealth Digest.

Generate a social media post for the following men's health video summary.

Platform: ${platform}
Video title: ${ctx.title}
Summary: ${ctx.shortSummary}
Key takeaways: ${ctx.takeaways.slice(0, 3).join(" | ")}
Notable claims: ${ctx.claimTexts.slice(0, 2).join(" | ")}
Evidence: ${evidenceLabel(ctx.evidenceScore)}
Risk level: ${riskLabel(ctx.riskLevel)}
Topics: ${ctx.topicNames.join(", ")}
UTM link: ${utmUrl}

Platform limits (HARD — do not exceed):
- Caption: ${constraints.maxCaptionChars} characters max
- Hook: ${constraints.maxHookChars} characters max
- Hashtags: ${constraints.maxHashtags} max
- Script: ${constraints.maxScriptWords} words max

Rules:
- Do NOT write fear-based copy ("fix your testosterone", "this cures", "doctors don't want you to know").
- Do NOT imply the reader has a medical condition.
- Do NOT present content as medical advice.
- End caption with: "Educational only. Not medical advice."
- Include the UTM link in the caption.
- Include evidence label and risk level in the caption.
- Keep hook under ${constraints.maxHookChars} characters.
- For text-only platforms (X, REDDIT), set "script" to an empty string "".
- Set requiresReview to true if the content involves TRT, medications, supplements, cancer, mental health, or ED.

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
 * Generate a social post draft from a published video summary.
 * Returns a Result — never throws.
 */
export async function generateSocialPost(
  input: GenerateSocialPostInput,
): Promise<Result<{ postId: string }>> {
  const ctx = await fetchVideoContext(input.videoId);
  if (!ctx) {
    return {
      ok: false,
      error: new Error(
        `Video ${input.videoId} not found or not in PUBLISHED status`,
      ),
    };
  }

  const campaign = input.campaign ?? "social";
  const utmUrl = buildUtmUrl({
    platform: input.platform,
    path: `/videos/${ctx.slug}`,
    campaign,
  });

  if (!env.GROQ_API_KEY) {
    return {
      ok: false,
      error: new Error(
        "GROQ_API_KEY is not configured. Add it to your environment variables to enable AI-generated social posts.",
      ),
    };
  }

  let aiOutput: z.infer<typeof SocialPostAiOutputSchema>;
  try {
    const message = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1000,
      messages: [
        { role: "user", content: buildPrompt(ctx, input.platform, utmUrl) },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ok: false, error: new Error("No text block in AI response") };
    }

    const parsed = JSON.parse(textBlock.text) as unknown;
    const validated = SocialPostAiOutputSchema.safeParse(parsed);
    if (!validated.success) {
      return {
        ok: false,
        error: new Error(
          `AI output failed validation: ${validated.error.message}`,
        ),
      };
    }
    aiOutput = validated.data;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }

  // Safety: check forbidden patterns
  const captionCheck = checkForbiddenPatterns(aiOutput.caption);
  const scriptCheck = checkForbiddenPatterns(aiOutput.script);
  if (captionCheck.matched || scriptCheck.matched) {
    const violations = [...captionCheck.violations, ...scriptCheck.violations];
    return {
      ok: false,
      error: new Error(
        `Generated content contains forbidden patterns: ${violations.map((v) => v.reason).join(", ")}`,
      ),
    };
  }

  // Safety: validate platform constraints.
  // For X, caption-length violations are intentionally ignored here — the
  // XAdapter.publish() path truncates the caption to fit 280 chars automatically.
  const constraintErrors = validatePlatformConstraints(input.platform, {
    caption: aiOutput.caption,
    hashtags: aiOutput.hashtags,
    script: aiOutput.script,
    hook: aiOutput.hook,
  }).filter(
    (e) => !(input.platform === "X" && e.startsWith("Caption exceeds")),
  );
  if (constraintErrors.length > 0) {
    return {
      ok: false,
      error: new Error(
        `Platform constraint violations: ${constraintErrors.join("; ")}`,
      ),
    };
  }

  // Force requiresReview for high-risk topics
  const topicText = [ctx.title, ctx.shortSummary, ...ctx.claimTexts].join(" ");
  const isHighRisk =
    aiOutput.requiresReview ||
    ctx.riskLevel === "HIGH" ||
    detectHighRiskTopic(topicText);

  const hashtags = aiOutput.hashtags.map((h) =>
    h.startsWith("#") ? h : `#${h}`,
  );

  const post = await db.socialPost.create({
    data: {
      platform: input.platform,
      status: isHighRisk ? "PENDING_REVIEW" : "DRAFT",
      sourceType: "VIDEO_SUMMARY",
      sourceId: input.videoId,
      hook: aiOutput.hook,
      script: aiOutput.script,
      caption: aiOutput.caption,
      hashtags,
      utmUrl,
      riskLevel: ctx.riskLevel,
      requiresReview: isHighRisk,
      templateId: input.templateId ?? null,
    },
  });

  return { ok: true, value: { postId: post.id } };
}
