import { z } from "zod";
import type { Platform, RiskLevel } from "@prisma/client";
import { buildUtmUrl } from "./utm";
import { validatePlatformConstraints } from "./platform-constraints";
import { buildSocialPrompt, type PromptConfig } from "./prompts";
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

export type SocialPostGeneratorConfig = PromptConfig & {
  /**
   * Prisma's generated types carry generic branding tied to their own
   * generation, so a `Pick<PrismaClient, ...>` from one site's generated
   * client isn't satisfied by another site's — even for identical models.
   * `any` here is intentional; this package only ever calls
   * `db.socialPost.create(...)` / `.update(...)` / `.findUnique(...)` with a
   * fixed, internally-controlled shape.
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
  /** This site's own canonical URL, used to build the UTM link. */
  baseUrl: string;
  /** Site-specific forbidden caption/script phrasing, on top of core-compliance's engine. */
  forbiddenPatterns: Array<{ pattern: RegExp; reason: string }>;
};

type GeneratedContent = {
  hook: string;
  script: string;
  caption: string;
  hashtags: string[];
  isHighRisk: boolean;
};

const REGENERATABLE_STATUSES = new Set(["DRAFT", "PENDING_REVIEW"]);

/**
 * Binds the social-post generator to this site's DB, AI client, brand name,
 * canonical URL, and compliance data, so callers keep calling
 * `generateSocialPost(input)` exactly as before (see
 * apps/menhealth/lib/social/generate-social-post.ts).
 */
export function createSocialPostGenerator(config: SocialPostGeneratorConfig) {
  /**
   * Calls the AI, validates the output against SocialPostAiOutputSchema, and
   * runs the same forbidden-pattern / platform-constraint safety checks used
   * by both generation and regeneration. Does not touch the DB.
   */
  async function generateContent(
    ctx: VideoContext,
    platform: Platform,
    utmUrl: string,
  ): Promise<Result<GeneratedContent>> {
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
          {
            role: "user",
            content: buildSocialPrompt(platform, ctx, utmUrl, config),
          },
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
    const constraintErrors = validatePlatformConstraints(platform, {
      caption: aiOutput.caption,
      hashtags: aiOutput.hashtags,
      script: aiOutput.script,
      hook: aiOutput.hook,
    }).filter((e) => !(platform === "X" && e.startsWith("Caption exceeds")));
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

    return {
      ok: true,
      value: {
        hook: aiOutput.hook,
        script: aiOutput.script,
        caption: aiOutput.caption,
        hashtags,
        isHighRisk,
      },
    };
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

    const generated = await generateContent(ctx, input.platform, utmUrl);
    if (!generated.ok) return generated;

    const post = await config.db.socialPost.create({
      data: {
        platform: input.platform,
        status: generated.value.isHighRisk ? "PENDING_REVIEW" : "DRAFT",
        sourceType: "VIDEO_SUMMARY",
        sourceId: input.videoId,
        hook: generated.value.hook,
        script: generated.value.script,
        caption: generated.value.caption,
        hashtags: generated.value.hashtags,
        utmUrl,
        riskLevel: ctx.riskLevel,
        requiresReview: generated.value.isHighRisk,
        templateId: input.templateId ?? null,
      },
    });

    return { ok: true, value: { postId: post.id } };
  }

  /**
   * Regenerate an existing draft in place — rebuilds the prompt from the
   * source video and overwrites hook/script/caption/hashtags/requiresReview/
   * status on the same row. Refuses to touch anything past DRAFT/
   * PENDING_REVIEW so an already-approved post is never silently replaced.
   */
  async function regenerateSocialPost(
    postId: string,
  ): Promise<Result<{ postId: string }>> {
    const post = await config.db.socialPost.findUnique({ where: { id: postId } });
    if (!post) {
      return { ok: false, error: new Error(`Social post ${postId} not found`) };
    }
    if (!REGENERATABLE_STATUSES.has(post.status)) {
      return {
        ok: false,
        error: new Error(`Cannot regenerate a post with status ${post.status}`),
      };
    }

    const ctx = await config.fetchContext(post.sourceId);
    if (!ctx) {
      return {
        ok: false,
        error: new Error(
          `Video ${post.sourceId} not found or not in PUBLISHED status`,
        ),
      };
    }

    const utmUrl = buildUtmUrl({
      platform: post.platform,
      path: `/videos/${ctx.slug}`,
      campaign: "social",
      baseUrl: config.baseUrl,
    });

    const generated = await generateContent(ctx, post.platform, utmUrl);
    if (!generated.ok) return generated;

    const updated = await config.db.socialPost.update({
      where: { id: postId },
      data: {
        hook: generated.value.hook,
        script: generated.value.script,
        caption: generated.value.caption,
        hashtags: generated.value.hashtags,
        utmUrl,
        requiresReview: generated.value.isHighRisk,
        status: generated.value.isHighRisk ? "PENDING_REVIEW" : "DRAFT",
      },
    });

    return { ok: true, value: { postId: updated.id } };
  }

  return { generateSocialPost, regenerateSocialPost };
}
