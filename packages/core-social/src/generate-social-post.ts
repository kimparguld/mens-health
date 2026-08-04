import { z } from "zod";
import type { Platform, RiskLevel } from "@prisma/client";
import { buildUtmUrl } from "./utm";
import {
  validatePlatformConstraints,
  PLATFORM_CONSTRAINTS,
} from "./platform-constraints";
import { SocialPostAiOutputSchema } from "./validation";
import {
  checkForbiddenPatterns,
  detectHighRiskTopic,
} from "@menhealth/core-compliance";

export type Result<T, E = Error> =
  { ok: true; value: T } | { ok: false; error: E };

export type GenerateSocialPostInput = {
  videoId: string;
  platform: Platform;
  campaign?: string;
  templateId?: string;
};

export type VideoContext = {
  title: string;
  slug: string;
  shortSummary: string;
  takeaways: string[];
  riskLevel: RiskLevel;
  evidenceScore: number | null;
  topicNames: string[];
  claimTexts: string[];
};

// A structural subset of @menhealth/core-ai's AiClient — kept local so this
// package doesn't need a hard dependency on core-ai just for this one shape.
export type SocialAiClient = {
  defaultModel: string;
  anthropic: {
    messages: {
      create(input: {
        model: string;
        max_tokens: number;
        messages: Array<{ role: string; content: string }>;
      }): Promise<{ content: Array<{ type: string; text: string }> }>;
    };
  };
};

export type SocialPostGeneratorConfig = {
  /**
   * Prisma's generated types carry generic branding tied to their own
   * generation, so a `Pick<PrismaClient, ...>` from one site's generated
   * client isn't satisfied by another site's — even for identical models.
   * `any` here is intentional; this package only ever calls
   * `db.socialPost.create(...)` with a fixed, internally-controlled shape.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  /**
   * Site-supplied content lookup — each site's own DB schema differs (e.g.
   * menhealth's Video vs. hype-check's Subject), so this package never
   * queries the DB for source content directly. Return null if the source
   * doesn't exist or isn't published.
   */
  fetchContext: (sourceId: string) => Promise<VideoContext | null>;
  aiClient: SocialAiClient;
  /** Whether the AI client is actually configured — same guard as the old GROQ_API_KEY check. */
  aiConfigured: boolean;
  siteName: string;
  /** What kind of content this is, substituted into the prompt in place of the old hardcoded "men's health video summary", e.g. "product/course review". */
  contentTypeLabel: string;
  /** Appended to every caption, substituted into the prompt in place of the old hardcoded "Educational only. Not medical advice.". */
  disclaimerLine: string;
  /** This site's own canonical URL, used to build the UTM link. */
  baseUrl: string;
  /** Site-specific forbidden caption/script phrasing, on top of core-compliance's engine. */
  forbiddenPatterns: Array<{ pattern: RegExp; reason: string }>;
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

/**
 * Binds the social-post generator to this site's DB, AI client, brand name,
 * canonical URL, and compliance data, so callers keep calling
 * `generateSocialPost(input)` exactly as before (see
 * apps/menhealth/lib/social/generate-social-post.ts).
 */
export function createSocialPostGenerator(config: SocialPostGeneratorConfig) {
  function buildPrompt(
    ctx: VideoContext,
    platform: Platform,
    utmUrl: string,
  ): string {
    const constraints = PLATFORM_CONSTRAINTS[platform];
    return `You are the social content writer for ${config.siteName}.

Generate a social media post for the following ${config.contentTypeLabel}.

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
- Do NOT write fear-based or manipulative copy — no unsubstantiated guarantees, no implying the reader is at risk, no fake urgency.
- End caption with: "${config.disclaimerLine}"
- Include the UTM link in the caption.
- Include evidence label and risk level in the caption.
- Keep hook under ${constraints.maxHookChars} characters.
- For text-only platforms (X, REDDIT), set "script" to an empty string "".
- Set requiresReview to true if the content involves any of: ${config.highRiskKeywords.slice(0, 6).join(", ")}.

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
  async function generateSocialPost(
    input: GenerateSocialPostInput,
  ): Promise<Result<{ postId: string }>> {
    const ctx = await config.fetchContext(input.videoId);
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
      baseUrl: config.baseUrl,
    });

    if (!config.aiConfigured) {
      return {
        ok: false,
        error: new Error(
          "GROQ_API_KEY is not configured. Add it to your environment variables to enable AI-generated social posts.",
        ),
      };
    }

    let aiOutput: z.infer<typeof SocialPostAiOutputSchema>;
    try {
      const message = await config.aiClient.anthropic.messages.create({
        model: config.aiClient.defaultModel,
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
    const captionCheck = checkForbiddenPatterns(
      aiOutput.caption,
      config.forbiddenPatterns,
    );
    const scriptCheck = checkForbiddenPatterns(
      aiOutput.script,
      config.forbiddenPatterns,
    );
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
    // For X, the raw caption-length check is intentionally ignored here — it
    // doesn't account for the UTM link XAdapter appends, so it under-counts.
    // XAdapter.validate() re-checks caption + link length correctly during
    // admin review and again before publish.
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
      detectHighRiskTopic(topicText, config.highRiskKeywords);

    const hashtags = aiOutput.hashtags.map((h) =>
      h.startsWith("#") ? h : `#${h}`,
    );

    const post = await config.db.socialPost.create({
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

  return { generateSocialPost };
}
