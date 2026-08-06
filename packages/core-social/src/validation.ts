import { z } from "zod";

// ---------------------------------------------------------------------------
// AI output schema — every AI-generated social post must conform to this
// ---------------------------------------------------------------------------

export const SocialPostAiOutputSchema = z.object({
  hook: z.string().min(5).max(300).describe("Opening hook to stop the scroll"),
  script: z
    .string()
    .min(0)
    .max(3000)
    .describe(
      "Full spoken script or body copy — empty string for text-only platforms (X, Reddit)",
    ),
  caption: z
    .string()
    .min(10)
    .max(40000)
    .describe(
      "Platform caption including evidence label, disclaimer, and UTM link placeholder",
    ),
  hashtags: z
    .array(z.string().regex(/^#?\w+$/))
    .min(0)
    .max(30)
    .describe("Hashtags without the # prefix — it will be added automatically"),
  requiresReview: z
    .boolean()
    .describe("True if content involves high-risk health claims"),
});

export type SocialPostAiOutput = z.infer<typeof SocialPostAiOutputSchema>;

// ---------------------------------------------------------------------------
// Approve/reject request schemas — used in route handlers
// ---------------------------------------------------------------------------

export const ApprovePostSchema = z.object({
  postId: z.string().cuid(),
});

export const RejectPostSchema = z.object({
  postId: z.string().cuid(),
  reason: z.string().min(1).max(500).optional(),
});

export const SchedulePostSchema = z.object({
  postId: z.string().cuid(),
  scheduledAt: z.string().datetime(),
});

export const GeneratePostSchema = z.object({
  videoId: z.string().cuid(),
  platform: z.enum(["YOUTUBE_COMMUNITY", "TIKTOK", "REDDIT", "X"]),
  templateId: z.string().cuid().optional(),
  campaign: z.string().min(1).default("social"),
});

export type GeneratePostInput = z.infer<typeof GeneratePostSchema>;

export const UpdateDraftSchema = z.object({
  hook: z.string().min(5).max(300).optional(),
  script: z.string().min(0).max(3000).optional(),
  caption: z.string().min(10).max(40000).optional(),
  hashtags: z
    .array(z.string().regex(/^#?\w+$/))
    .min(0)
    .max(30)
    .optional(),
});

export type UpdateDraftInput = z.infer<typeof UpdateDraftSchema>;
