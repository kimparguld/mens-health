# Platform-tailored social draft generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each social platform (X, Reddit, YouTube Community, TikTok) its own prompt shape instead of one generic template, fix the X caption-budget bug at its source, add a TikTok entry point, and let admins regenerate or hand-edit a draft.

**Architecture:** A new pure-function module (`packages/core-social/src/prompts.ts`) replaces the single `buildPrompt()` in `generate-social-post.ts` with four platform-specific builders plus a dispatcher. `createSocialPostGenerator()` gains `regenerateSocialPost` and `updateSocialPostDraft` alongside the existing `generateSocialPost`, sharing a new internal `generateContent` helper for the AI-call-and-safety-check pipeline. Two new API routes expose these. A new per-platform admin page replaces the old checkbox-based generator UI, with small platform-styled preview components and an inline edit form.

**Tech Stack:** TypeScript strict, Next.js App Router (Server Components + route handlers), Zod, Prisma, Vitest + Testing Library.

## Global Constraints

- Scope is `apps/menhealth` and `packages/core-social` only. `apps/hype-check` has a near-identical UI but is explicitly out of scope — do not touch it.
- AI/domain functions return `Result<T, E>` and never throw (existing convention in `generate-social-post.ts` — `regenerateSocialPost` and `updateSocialPostDraft` must follow it too).
- All API route bodies are validated with Zod at the boundary before reaching a domain function.
- Server Components by default; `"use client"` only where interactivity (state, event handlers) is required.
- The X budget fix touches only the prompt's *stated* caption budget (`280 - utmUrl.length - 1`). Do not touch the existing post-generation `"Caption exceeds"` filter in `generate-social-post.ts` or `XAdapter`'s combined-length check — both stay exactly as-is.
- `regenerateSocialPost` hard-rejects (`{ ok: false }`) for any status other than `DRAFT`/`PENDING_REVIEW`. It must never update a row that is `APPROVED` or later.
- `updateSocialPostDraft` reruns `checkForbiddenPatterns` and `validatePlatformConstraints` on the merged content, but must **not** rerun `detectHighRiskTopic` or touch `requiresReview`/the review-gate status transition.
- `TikTokAdapter` remains an unimplemented stub — do not modify `packages/core-social/src/adapters/tiktok.ts` or `apps/menhealth/lib/social/adapters/tiktok.ts`.
- No magic strings for repeated literals (platform lists, status sets) — use named constants, matching existing files like `platform-constraints.ts`.

---

## File Structure

**New files:**
- `packages/core-social/src/prompts.ts` — `PromptConfig` type, 4 platform prompt builders, `buildSocialPrompt` dispatcher.
- `apps/menhealth/lib/social/prompts.ts` — thin re-export (matches the existing pattern in `lib/social/utm.ts`, `lib/social/adapters/x.ts`, etc.).
- `apps/menhealth/__tests__/social-prompts.test.ts`
- `apps/menhealth/__tests__/social-generate-post.test.ts`
- `apps/menhealth/__tests__/social-preview-cards.test.tsx`
- `apps/menhealth/app/api/social/drafts/[id]/regenerate/route.ts`
- `apps/menhealth/app/api/social/drafts/[id]/route.ts` (PATCH)
- `apps/menhealth/app/admin/(protected)/social/generate/[platform]/page.tsx`
- `apps/menhealth/app/admin/(protected)/social/generate/[platform]/XPreview.tsx`
- `apps/menhealth/app/admin/(protected)/social/generate/[platform]/RedditPreview.tsx`
- `apps/menhealth/app/admin/(protected)/social/generate/[platform]/YouTubeCommunityPreview.tsx`
- `apps/menhealth/app/admin/(protected)/social/generate/[platform]/TikTokPreview.tsx`
- `apps/menhealth/app/admin/(protected)/social/generate/[platform]/EditDraftForm.tsx`
- `apps/menhealth/app/admin/(protected)/social/generate/[platform]/DraftGenerateAction.tsx`

**Modified files:**
- `packages/core-social/src/generate-social-post.ts` — drop local `buildPrompt`/`evidenceLabel`/`riskLabel`, add `generateContent`, `regenerateSocialPost`, `updateSocialPostDraft`.
- `packages/core-social/src/validation.ts` — add `UpdateDraftSchema`.
- `packages/core-social/src/index.ts` — export the new prompt builders, `UpdateDraftSchema`.
- `apps/menhealth/lib/social/generate-social-post.ts` — destructure the two new functions from `createSocialPostGenerator`.
- `apps/menhealth/lib/social/validation.ts` — re-export `UpdateDraftSchema`.
- `apps/menhealth/app/admin/(protected)/videos/[id]/GenerateSocialButton.tsx` — rewritten as four links.
- `apps/menhealth/app/admin/(protected)/social/drafts/[id]/DraftActions.tsx` — `isManualPlatform` gains `TIKTOK`.

---

### Task 1: Platform-specific prompt builders

**Files:**
- Create: `packages/core-social/src/prompts.ts`
- Create: `apps/menhealth/lib/social/prompts.ts`
- Test: `apps/menhealth/__tests__/social-prompts.test.ts`

**Interfaces:**
- Consumes: `VideoContext` (type, from `packages/core-social/src/generate-social-post.ts`), `PLATFORM_CONSTRAINTS` (from `./platform-constraints`), `Platform` (type, from `@prisma/client`).
- Produces: `PromptConfig` type (`{ siteName: string; contentTypeLabel: string; disclaimerLine: string; highRiskKeywords: string[] }`), and functions `buildXPrompt(ctx, utmUrl, config): string`, `buildRedditPrompt(ctx, utmUrl, config): string`, `buildYouTubeCommunityPrompt(ctx, utmUrl, config): string`, `buildTikTokPrompt(ctx, utmUrl, config): string`, `buildSocialPrompt(platform, ctx, utmUrl, config): string` — all consumed by Task 2.

- [ ] **Step 1: Write the failing tests**

Create `apps/menhealth/__tests__/social-prompts.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  buildXPrompt,
  buildRedditPrompt,
  buildYouTubeCommunityPrompt,
  buildTikTokPrompt,
  buildSocialPrompt,
  type PromptConfig,
} from "@/lib/social/prompts";

const ctx = {
  title: "Does Cold Plunging Raise Testosterone?",
  slug: "cold-plunging-testosterone",
  shortSummary: "A look at the evidence behind cold exposure and T levels.",
  takeaways: [
    "Evidence is mixed",
    "Short-term spikes are not sustained",
    "More research is needed",
  ],
  riskLevel: "MEDIUM" as const,
  evidenceScore: 0.4,
  topicNames: ["Testosterone", "Recovery"],
  claimTexts: ["Cold plunges permanently raise testosterone"],
};

const config: PromptConfig = {
  siteName: "MenHealth Digest",
  contentTypeLabel: "men's health video summary",
  disclaimerLine: "Educational only. Not medical advice.",
  highRiskKeywords: ["testosterone", "TRT"],
};

const utmUrl =
  "https://www.menhealth-digest.com/videos/cold-plunging-testosterone?utm_source=x&utm_medium=post&utm_campaign=social";

describe("buildXPrompt", () => {
  it("instructs no hashtags and a single post, not a thread", () => {
    const prompt = buildXPrompt(ctx, utmUrl, config);
    expect(prompt).toContain("Hashtags: 0");
    expect(prompt).toContain("hook IS the post");
  });

  it("computes the caption budget from the real UTM URL length", () => {
    const prompt = buildXPrompt(ctx, utmUrl, config);
    const expectedBudget = 280 - utmUrl.length - 1;
    expect(prompt).toContain(`Caption: ${expectedBudget} characters max`);
  });

  it("recomputes the budget for a different UTM URL length", () => {
    const shortUrl = "https://mhd.example/v/x";
    const prompt = buildXPrompt(ctx, shortUrl, config);
    const expectedBudget = 280 - shortUrl.length - 1;
    expect(prompt).toContain(`Caption: ${expectedBudget} characters max`);
  });
});

describe("buildRedditPrompt", () => {
  it("instructs discussion-post voice with no hashtags and no salesy CTA", () => {
    const prompt = buildRedditPrompt(ctx, utmUrl, config);
    expect(prompt).toContain("discussion-post voice");
    expect(prompt).toContain("Hashtags: 0");
    expect(prompt).toContain("salesy call-to-action");
  });
});

describe("buildYouTubeCommunityPrompt", () => {
  it("instructs a short, casual, question-style post", () => {
    const prompt = buildYouTubeCommunityPrompt(ctx, utmUrl, config);
    expect(prompt).toContain("engagement/question style");
  });
});

describe("buildTikTokPrompt", () => {
  it("instructs a hook plus on-camera script for a human to film", () => {
    const prompt = buildTikTokPrompt(ctx, utmUrl, config);
    expect(prompt).toContain("on-camera script");
    expect(prompt).toContain("Script (spoken lines");
  });
});

describe("buildSocialPrompt", () => {
  it("dispatches to the matching per-platform builder", () => {
    expect(buildSocialPrompt("X", ctx, utmUrl, config)).toBe(
      buildXPrompt(ctx, utmUrl, config),
    );
    expect(buildSocialPrompt("REDDIT", ctx, utmUrl, config)).toBe(
      buildRedditPrompt(ctx, utmUrl, config),
    );
    expect(buildSocialPrompt("YOUTUBE_COMMUNITY", ctx, utmUrl, config)).toBe(
      buildYouTubeCommunityPrompt(ctx, utmUrl, config),
    );
    expect(buildSocialPrompt("TIKTOK", ctx, utmUrl, config)).toBe(
      buildTikTokPrompt(ctx, utmUrl, config),
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter menhealth test social-prompts`
Expected: FAIL — `Cannot find module '@/lib/social/prompts'` (neither file exists yet).

- [ ] **Step 3: Create `packages/core-social/src/prompts.ts`**

```ts
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
  const constraints = PLATFORM_CONSTRAINTS.X;
  const captionBudget = 280 - utmUrl.length - 1;
  return `${buildHeader(config, "X (Twitter)")}

${buildContextBlock(ctx, utmUrl)}

This is a single punchy post — the hook IS the post, there's no separate lead-in. Write one tight, scroll-stopping post, not a thread.

Platform limits (HARD — do not exceed):
- Caption: ${captionBudget} characters max — this already subtracts the UTM link's ${utmUrl.length} characters and a separating space, so the full post (link included) fits in 280 characters. Do not add the link on top of this budget; it is already included.
- Hashtags: ${constraints.maxHashtags} max — do not include any hashtags

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
```

- [ ] **Step 4: Export the new module from `packages/core-social/src/index.ts`**

Add this block (placed after the existing `validation` export block, before the `generate-social-post` block):

```ts
export {
  buildXPrompt,
  buildRedditPrompt,
  buildYouTubeCommunityPrompt,
  buildTikTokPrompt,
  buildSocialPrompt,
} from "./prompts";
export type { PromptConfig } from "./prompts";
```

- [ ] **Step 5: Create the thin app-level re-export**

Create `apps/menhealth/lib/social/prompts.ts`:

```ts
export {
  buildXPrompt,
  buildRedditPrompt,
  buildYouTubeCommunityPrompt,
  buildTikTokPrompt,
  buildSocialPrompt,
} from "@menhealth/core-social";
export type { PromptConfig } from "@menhealth/core-social";
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter menhealth test social-prompts`
Expected: PASS (10 tests).

- [ ] **Step 7: Typecheck the package**

Run: `pnpm --filter @menhealth/core-social typecheck`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/core-social/src/prompts.ts packages/core-social/src/index.ts \
  apps/menhealth/lib/social/prompts.ts apps/menhealth/__tests__/social-prompts.test.ts
git commit -m "feat(social): add platform-specific prompt builders"
```

---

### Task 2: Wire prompts into generation, extract shared safety pipeline, add regenerate

**Files:**
- Modify: `packages/core-social/src/generate-social-post.ts`
- Modify: `apps/menhealth/lib/social/generate-social-post.ts`
- Create: `apps/menhealth/__tests__/social-generate-post.test.ts`

**Interfaces:**
- Consumes: `buildSocialPrompt`, `PromptConfig` (from Task 1's `./prompts`).
- Produces: `regenerateSocialPost(postId: string): Promise<Result<{ postId: string }>>`, returned alongside `generateSocialPost` from `createSocialPostGenerator()`. Task 3 adds `updateSocialPostDraft` to the same return object and reuses the internal `generateContent` helper this task introduces.

- [ ] **Step 1: Write the failing tests**

Create `apps/menhealth/__tests__/social-generate-post.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateSocialPost,
  regenerateSocialPost,
} from "@/lib/social/generate-social-post";

const {
  mockVideoFindUnique,
  mockSocialPostCreate,
  mockSocialPostFindUnique,
  mockSocialPostUpdate,
  mockAiCreate,
} = vi.hoisted(() => ({
  mockVideoFindUnique: vi.fn(),
  mockSocialPostCreate: vi.fn(),
  mockSocialPostFindUnique: vi.fn(),
  mockSocialPostUpdate: vi.fn(),
  mockAiCreate: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  db: {
    video: { findUnique: mockVideoFindUnique },
    socialPost: {
      create: mockSocialPostCreate,
      findUnique: mockSocialPostFindUnique,
      update: mockSocialPostUpdate,
    },
  },
}));

vi.mock("@/lib/ai/client", () => ({
  aiClient: {
    defaultModel: "test-model",
    anthropic: { messages: { create: mockAiCreate } },
  },
}));

function aiJsonResponse(body: object) {
  return { content: [{ type: "text", text: JSON.stringify(body) }] };
}

const PUBLISHED_VIDEO = {
  id: "video_1",
  status: "PUBLISHED",
  title: "Does Cold Plunging Raise Testosterone?",
  slug: "cold-plunging-testosterone",
  riskLevel: "LOW",
  evidenceScore: 0.6,
  summaries: [
    {
      shortSummary: "A look at cold exposure and T levels.",
      takeaways: ["Evidence is mixed"],
    },
  ],
  topics: [{ topic: { name: "Testosterone" } }],
  claims: [{ text: "Cold plunges raise testosterone" }],
};

// hashtags: [] keeps this fixture valid against every platform's
// maxHashtags (Reddit's is 0) so the same fixture works across tests.
const VALID_AI_OUTPUT = {
  hook: "Cold plunges and testosterone — what does the evidence say?",
  script: "",
  caption:
    "New research on cold exposure and testosterone. Evidence: Moderate. Risk: Low. Educational only. Not medical advice.",
  hashtags: [] as string[],
  requiresReview: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockVideoFindUnique.mockResolvedValue(PUBLISHED_VIDEO);
  mockAiCreate.mockResolvedValue(aiJsonResponse(VALID_AI_OUTPUT));
});

describe("generateSocialPost", () => {
  it("creates a DRAFT post from a valid AI response", async () => {
    mockSocialPostCreate.mockResolvedValue({ id: "post_1" });

    const result = await generateSocialPost({
      videoId: "video_1",
      platform: "REDDIT",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.value.postId).toBe("post_1");
    const createArgs = mockSocialPostCreate.mock.calls[0]![0] as {
      data: { status: string };
    };
    expect(createArgs.data.status).toBe("DRAFT");
  });

  it("creates a PENDING_REVIEW post when the AI flags requiresReview", async () => {
    mockAiCreate.mockResolvedValue(
      aiJsonResponse({ ...VALID_AI_OUTPUT, requiresReview: true }),
    );
    mockSocialPostCreate.mockResolvedValue({ id: "post_2" });

    const result = await generateSocialPost({
      videoId: "video_1",
      platform: "REDDIT",
    });

    expect(result.ok).toBe(true);
    const createArgs = mockSocialPostCreate.mock.calls[0]![0] as {
      data: { status: string };
    };
    expect(createArgs.data.status).toBe("PENDING_REVIEW");
  });

  it("fails when the video is not found", async () => {
    mockVideoFindUnique.mockResolvedValue(null);

    const result = await generateSocialPost({
      videoId: "missing",
      platform: "X",
    });

    expect(result.ok).toBe(false);
  });
});

describe("regenerateSocialPost", () => {
  const DRAFT_POST = {
    id: "post_1",
    status: "DRAFT",
    platform: "REDDIT",
    sourceId: "video_1",
  };

  it.each(["APPROVED", "SCHEDULED", "PUBLISHED", "REJECTED", "FAILED"])(
    "rejects regenerating a %s post",
    async (status) => {
      mockSocialPostFindUnique.mockResolvedValue({ ...DRAFT_POST, status });

      const result = await regenerateSocialPost("post_1");

      expect(result.ok).toBe(false);
      expect(mockSocialPostUpdate).not.toHaveBeenCalled();
    },
  );

  it.each(["DRAFT", "PENDING_REVIEW"])(
    "regenerates and overwrites a %s post",
    async (status) => {
      mockSocialPostFindUnique.mockResolvedValue({ ...DRAFT_POST, status });
      mockSocialPostUpdate.mockResolvedValue({ id: "post_1" });

      const result = await regenerateSocialPost("post_1");

      expect(result.ok).toBe(true);
      expect(mockSocialPostUpdate).toHaveBeenCalledOnce();
      const updateArgs = mockSocialPostUpdate.mock.calls[0]![0] as {
        where: { id: string };
        data: { status: string };
      };
      expect(updateArgs.where.id).toBe("post_1");
      expect(updateArgs.data.status).toBe("DRAFT");
    },
  );

  it("fails when the post does not exist", async () => {
    mockSocialPostFindUnique.mockResolvedValue(null);

    const result = await regenerateSocialPost("missing");

    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter menhealth test social-generate-post`
Expected: FAIL — `regenerateSocialPost` is not exported from `@/lib/social/generate-social-post`.

- [ ] **Step 3: Rewrite `packages/core-social/src/generate-social-post.ts`**

Replace the entire file contents with:

```ts
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
```

- [ ] **Step 4: Update the app-level wrapper**

In `apps/menhealth/lib/social/generate-social-post.ts`, change the final export:

```ts
export const { generateSocialPost, regenerateSocialPost } =
  createSocialPostGenerator({
    db,
    fetchContext,
    aiClient,
    aiConfigured: Boolean(env.GROQ_API_KEY),
    siteName: SITE_NAME,
    contentTypeLabel: "men's health video summary",
    disclaimerLine: "Educational only. Not medical advice.",
    baseUrl: env.NEXT_PUBLIC_APP_URL,
    forbiddenPatterns: FORBIDDEN_PATTERNS,
    highRiskKeywords: HIGH_RISK_TOPIC_KEYWORDS,
  });
```

(Only the `const { ... } =` destructure on the first line changes — the config object body is unchanged.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter menhealth test social-generate-post`
Expected: PASS (10 tests: 3 `generateSocialPost` + 7 `regenerateSocialPost`, including the two `it.each` blocks).

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @menhealth/core-social typecheck && pnpm --filter menhealth typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/core-social/src/generate-social-post.ts \
  apps/menhealth/lib/social/generate-social-post.ts \
  apps/menhealth/__tests__/social-generate-post.test.ts
git commit -m "feat(social): use platform prompts in generation, add regenerateSocialPost"
```

---

### Task 3: Add `updateSocialPostDraft` and `UpdateDraftSchema`

**Files:**
- Modify: `packages/core-social/src/generate-social-post.ts`
- Modify: `packages/core-social/src/validation.ts`
- Modify: `packages/core-social/src/index.ts`
- Modify: `apps/menhealth/lib/social/generate-social-post.ts`
- Modify: `apps/menhealth/lib/social/validation.ts`
- Modify: `apps/menhealth/__tests__/social-generate-post.test.ts`

**Interfaces:**
- Produces: `updateSocialPostDraft(postId: string, edits: { hook?: string; script?: string; caption?: string; hashtags?: string[] }): Promise<Result<{ postId: string }>>`, returned from `createSocialPostGenerator()`. `UpdateDraftSchema` (Zod), consumed by Task 4's PATCH route.

- [ ] **Step 1: Write the failing tests**

Append to `apps/menhealth/__tests__/social-generate-post.test.ts` (add the import and the new `describe` block):

```ts
import {
  generateSocialPost,
  regenerateSocialPost,
  updateSocialPostDraft,
} from "@/lib/social/generate-social-post";
```

(replaces the existing two-name import at the top of the file)

```ts
describe("updateSocialPostDraft", () => {
  const EXISTING_POST = {
    id: "post_1",
    status: "DRAFT",
    platform: "YOUTUBE_COMMUNITY",
    hook: "Original hook that is long enough.",
    script: "",
    caption: "Original caption that is long enough to pass validation.",
    hashtags: ["#MensHealth"],
  };

  it("rejects editing a PUBLISHED post", async () => {
    mockSocialPostFindUnique.mockResolvedValue({
      ...EXISTING_POST,
      status: "PUBLISHED",
    });

    const result = await updateSocialPostDraft("post_1", {
      caption: "Updated caption text.",
    });

    expect(result.ok).toBe(false);
    expect(mockSocialPostUpdate).not.toHaveBeenCalled();
  });

  it("rejects edited content that trips a forbidden pattern", async () => {
    mockSocialPostFindUnique.mockResolvedValue(EXISTING_POST);

    const result = await updateSocialPostDraft("post_1", {
      caption: "This cures low energy fast.",
    });

    expect(result.ok).toBe(false);
    expect(mockSocialPostUpdate).not.toHaveBeenCalled();
  });

  it("rejects edited content that violates platform constraints", async () => {
    mockSocialPostFindUnique.mockResolvedValue({
      ...EXISTING_POST,
      platform: "X",
    });

    const result = await updateSocialPostDraft("post_1", {
      hashtags: ["one", "two", "three", "four"],
    });

    expect(result.ok).toBe(false);
    expect(mockSocialPostUpdate).not.toHaveBeenCalled();
  });

  it("merges edits, normalizes hashtags, and persists", async () => {
    mockSocialPostFindUnique.mockResolvedValue(EXISTING_POST);
    mockSocialPostUpdate.mockResolvedValue({ id: "post_1" });

    const result = await updateSocialPostDraft("post_1", {
      caption: "An updated caption that is long enough to pass validation.",
      hashtags: ["Fitness"],
    });

    expect(result.ok).toBe(true);
    const updateArgs = mockSocialPostUpdate.mock.calls[0]![0] as {
      data: { caption: string; hashtags: string[]; hook: string };
    };
    expect(updateArgs.data.caption).toBe(
      "An updated caption that is long enough to pass validation.",
    );
    expect(updateArgs.data.hashtags).toEqual(["#Fitness"]);
    expect(updateArgs.data.hook).toBe(EXISTING_POST.hook);
  });

  it("fails when the post does not exist", async () => {
    mockSocialPostFindUnique.mockResolvedValue(null);

    const result = await updateSocialPostDraft("missing", {
      caption: "New caption text here.",
    });

    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter menhealth test social-generate-post`
Expected: FAIL — `updateSocialPostDraft` is not exported from `@/lib/social/generate-social-post`.

- [ ] **Step 3: Add `updateSocialPostDraft` to `packages/core-social/src/generate-social-post.ts`**

Insert this function just before the final `return { generateSocialPost, regenerateSocialPost };` line, and update that return statement:

```ts
  /**
   * Hand-edit a draft's content. Re-runs the same forbidden-pattern and
   * platform-constraint checks generation uses, but not the high-risk /
   * requiresReview gate — that classification was made at generation time
   * from the source video, and the admin making the edit is already the
   * person that gate exists to route the post to.
   */
  async function updateSocialPostDraft(
    postId: string,
    edits: {
      hook?: string;
      script?: string;
      caption?: string;
      hashtags?: string[];
    },
  ): Promise<Result<{ postId: string }>> {
    const post = await config.db.socialPost.findUnique({ where: { id: postId } });
    if (!post) {
      return { ok: false, error: new Error(`Social post ${postId} not found`) };
    }
    if (post.status === "PUBLISHED") {
      return {
        ok: false,
        error: new Error(`Cannot edit a post with status ${post.status}`),
      };
    }

    const hook = edits.hook ?? post.hook;
    const script = edits.script ?? post.script;
    const caption = edits.caption ?? post.caption;
    const hashtags = (edits.hashtags ?? post.hashtags).map((h) =>
      h.startsWith("#") ? h : `#${h}`,
    );

    const captionCheck = checkForbiddenPatterns(caption, config.forbiddenPatterns);
    const scriptCheck = checkForbiddenPatterns(script, config.forbiddenPatterns);
    if (captionCheck.matched || scriptCheck.matched) {
      const violations = [...captionCheck.violations, ...scriptCheck.violations];
      return {
        ok: false,
        error: new Error(
          `Edited content contains forbidden patterns: ${violations.map((v) => v.reason).join(", ")}`,
        ),
      };
    }

    const constraintErrors = validatePlatformConstraints(post.platform, {
      caption,
      hashtags,
      script,
      hook,
    }).filter((e) => !(post.platform === "X" && e.startsWith("Caption exceeds")));
    if (constraintErrors.length > 0) {
      return {
        ok: false,
        error: new Error(
          `Platform constraint violations: ${constraintErrors.join("; ")}`,
        ),
      };
    }

    const updated = await config.db.socialPost.update({
      where: { id: postId },
      data: { hook, script, caption, hashtags },
    });

    return { ok: true, value: { postId: updated.id } };
  }

  return { generateSocialPost, regenerateSocialPost, updateSocialPostDraft };
```

- [ ] **Step 4: Add `UpdateDraftSchema` to `packages/core-social/src/validation.ts`**

Add after `GeneratePostSchema` / its type export:

```ts
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
```

- [ ] **Step 5: Export from `packages/core-social/src/index.ts`**

Update the validation export block to include the new schema and type:

```ts
export {
  SocialPostAiOutputSchema,
  ApprovePostSchema,
  RejectPostSchema,
  SchedulePostSchema,
  GeneratePostSchema,
  UpdateDraftSchema,
} from "./validation";
export type {
  SocialPostAiOutput,
  GeneratePostInput,
  UpdateDraftInput,
} from "./validation";
```

- [ ] **Step 6: Update the app-level wrappers**

In `apps/menhealth/lib/social/generate-social-post.ts`, change the destructure once more:

```ts
export const { generateSocialPost, regenerateSocialPost, updateSocialPostDraft } =
  createSocialPostGenerator({
    // ...unchanged config object
  });
```

In `apps/menhealth/lib/social/validation.ts`, add `UpdateDraftSchema` / `UpdateDraftInput` to the existing re-export lists:

```ts
export {
  SocialPostAiOutputSchema,
  ApprovePostSchema,
  RejectPostSchema,
  SchedulePostSchema,
  GeneratePostSchema,
  UpdateDraftSchema,
} from "@menhealth/core-social";
export type {
  SocialPostAiOutput,
  GeneratePostInput,
  UpdateDraftInput,
} from "@menhealth/core-social";
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm --filter menhealth test social-generate-post`
Expected: PASS (15 tests total: 3 `generateSocialPost` + 7 `regenerateSocialPost` + 5 `updateSocialPostDraft`).

- [ ] **Step 8: Typecheck**

Run: `pnpm --filter @menhealth/core-social typecheck && pnpm --filter menhealth typecheck`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add packages/core-social/src/generate-social-post.ts \
  packages/core-social/src/validation.ts packages/core-social/src/index.ts \
  apps/menhealth/lib/social/generate-social-post.ts apps/menhealth/lib/social/validation.ts \
  apps/menhealth/__tests__/social-generate-post.test.ts
git commit -m "feat(social): add updateSocialPostDraft and UpdateDraftSchema"
```

---

### Task 4: API routes for regenerate and inline edit

**Files:**
- Create: `apps/menhealth/app/api/social/drafts/[id]/regenerate/route.ts`
- Create: `apps/menhealth/app/api/social/drafts/[id]/route.ts`

**Interfaces:**
- Consumes: `regenerateSocialPost`, `updateSocialPostDraft` (from `@/lib/social/generate-social-post`, Tasks 2–3), `ApprovePostSchema`, `UpdateDraftSchema` (from `@/lib/social/validation`).
- Produces: `POST /api/social/drafts/[id]/regenerate`, `PATCH /api/social/drafts/[id]` — consumed by Task 6's client components.

No dedicated tests for this task — the repo has no existing API route handler tests (`app/api/**` is exercised only through the domain functions it calls, which Tasks 2–3 already cover). Route correctness is verified via typecheck plus the manual smoke test in Task 9.

- [ ] **Step 1: Create the regenerate route**

Create `apps/menhealth/app/api/social/drafts/[id]/regenerate/route.ts`:

```ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { regenerateSocialPost } from "@/lib/social/generate-social-post";
import { ApprovePostSchema } from "@/lib/social/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  // ApprovePostSchema is just `{ postId: cuid }` — reused here purely to
  // validate the id shape, same as the approve route does.
  const parsedId = ApprovePostSchema.safeParse({ postId: id });
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 422 });
  }

  const result = await regenerateSocialPost(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json(result.value);
}
```

- [ ] **Step 2: Create the PATCH route**

Create `apps/menhealth/app/api/social/drafts/[id]/route.ts`:

```ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateSocialPostDraft } from "@/lib/social/generate-social-post";
import { ApprovePostSchema, UpdateDraftSchema } from "@/lib/social/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsedId = ApprovePostSchema.safeParse({ postId: id });
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 422 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const result = await updateSocialPostDraft(id, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json(result.value);
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter menhealth typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/menhealth/app/api/social/drafts/\[id\]/regenerate/route.ts \
  apps/menhealth/app/api/social/drafts/\[id\]/route.ts
git commit -m "feat(social): add regenerate and inline-edit API routes"
```

---

### Task 5: Platform preview components

**Files:**
- Create: `apps/menhealth/app/admin/(protected)/social/generate/[platform]/XPreview.tsx`
- Create: `apps/menhealth/app/admin/(protected)/social/generate/[platform]/RedditPreview.tsx`
- Create: `apps/menhealth/app/admin/(protected)/social/generate/[platform]/YouTubeCommunityPreview.tsx`
- Create: `apps/menhealth/app/admin/(protected)/social/generate/[platform]/TikTokPreview.tsx`
- Test: `apps/menhealth/__tests__/social-preview-cards.test.tsx`

**Interfaces:**
- Produces: 4 default-exported React components, each accepting `{ hook: string; script: string; caption: string; hashtags: string[] }` (some ignore unused fields) — consumed by Task 7's `page.tsx`.

- [ ] **Step 1: Write the failing tests**

Create `apps/menhealth/__tests__/social-preview-cards.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import XPreview from "@/app/admin/(protected)/social/generate/[platform]/XPreview";
import RedditPreview from "@/app/admin/(protected)/social/generate/[platform]/RedditPreview";
import YouTubeCommunityPreview from "@/app/admin/(protected)/social/generate/[platform]/YouTubeCommunityPreview";
import TikTokPreview from "@/app/admin/(protected)/social/generate/[platform]/TikTokPreview";

describe("platform preview cards", () => {
  it("renders XPreview with hook, caption, and hashtags", () => {
    render(
      <XPreview
        hook="Hook text"
        script=""
        caption="Caption text"
        hashtags={["#MensHealth"]}
      />,
    );
    expect(screen.getByText("Caption text")).toBeInTheDocument();
    expect(screen.getByText("#MensHealth")).toBeInTheDocument();
  });

  it("renders RedditPreview with hook and caption", () => {
    render(
      <RedditPreview
        hook="Discussion title"
        script=""
        caption="Body text"
        hashtags={[]}
      />,
    );
    expect(screen.getByText("Discussion title")).toBeInTheDocument();
    expect(screen.getByText("Body text")).toBeInTheDocument();
  });

  it("renders YouTubeCommunityPreview with hook, caption, and hashtags", () => {
    render(
      <YouTubeCommunityPreview
        hook="Question hook"
        script=""
        caption="Community post body"
        hashtags={["#Fitness"]}
      />,
    );
    expect(screen.getByText("Question hook")).toBeInTheDocument();
    expect(screen.getByText("Community post body")).toBeInTheDocument();
    expect(screen.getByText("#Fitness")).toBeInTheDocument();
  });

  it("renders TikTokPreview with hook, script, caption, and hashtags", () => {
    render(
      <TikTokPreview
        hook="On-camera hook"
        script={"Line one.\nLine two."}
        caption="Video description"
        hashtags={["#Shorts"]}
      />,
    );
    expect(screen.getByText("On-camera hook")).toBeInTheDocument();
    expect(screen.getByText("Video description")).toBeInTheDocument();
    expect(screen.getByText("#Shorts")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter menhealth test social-preview-cards`
Expected: FAIL — none of the four component files exist yet.

- [ ] **Step 3: Create the preview components**

Create `apps/menhealth/app/admin/(protected)/social/generate/[platform]/XPreview.tsx`:

```tsx
type Props = { hook: string; script: string; caption: string; hashtags: string[] };

export default function XPreview({ caption, hashtags }: Props) {
  return (
    <div className="max-w-md rounded-2xl border bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-gray-200" />
        <div>
          <p className="text-sm font-semibold text-gray-900">Your handle</p>
          <p className="text-xs text-gray-500">@handle</p>
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm text-gray-900">{caption}</p>
      <p
        className={`mt-2 text-right text-xs ${
          caption.length > 280 ? "text-red-600" : "text-gray-400"
        }`}
      >
        {caption.length} / 280
      </p>
      {hashtags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {hashtags.map((tag) => (
            <span key={tag} className="text-xs text-blue-600">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

Create `apps/menhealth/app/admin/(protected)/social/generate/[platform]/RedditPreview.tsx`:

```tsx
type Props = { hook: string; script: string; caption: string; hashtags: string[] };

export default function RedditPreview({ hook, caption }: Props) {
  return (
    <div className="max-w-lg rounded-lg border bg-white p-4">
      <p className="mb-1 text-xs text-gray-500">Posted in r/yoursubreddit</p>
      <h3 className="mb-2 text-base font-semibold text-gray-900">{hook}</h3>
      <p className="whitespace-pre-wrap text-sm text-gray-700">{caption}</p>
    </div>
  );
}
```

Create `apps/menhealth/app/admin/(protected)/social/generate/[platform]/YouTubeCommunityPreview.tsx`:

```tsx
type Props = { hook: string; script: string; caption: string; hashtags: string[] };

export default function YouTubeCommunityPreview({ hook, caption, hashtags }: Props) {
  return (
    <div className="max-w-md rounded-lg border bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-gray-200" />
        <p className="text-sm font-semibold text-gray-900">Your channel</p>
      </div>
      {hook && <p className="mb-1 text-sm font-medium text-gray-900">{hook}</p>}
      <p className="whitespace-pre-wrap text-sm text-gray-800">{caption}</p>
      {hashtags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {hashtags.map((tag) => (
            <span key={tag} className="text-xs text-blue-600">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

Create `apps/menhealth/app/admin/(protected)/social/generate/[platform]/TikTokPreview.tsx`:

```tsx
type Props = { hook: string; script: string; caption: string; hashtags: string[] };

export default function TikTokPreview({ hook, script, caption, hashtags }: Props) {
  return (
    <div className="max-w-md rounded-lg border bg-black p-4 text-white">
      <p className="mb-2 text-xs font-semibold text-gray-300">On-camera script</p>
      <p className="mb-3 text-sm font-semibold text-white">{hook}</p>
      <pre className="mb-3 whitespace-pre-wrap text-sm text-gray-100">{script}</pre>
      <p className="mb-1 text-xs font-semibold text-gray-300">Caption</p>
      <p className="whitespace-pre-wrap text-sm text-gray-200">{caption}</p>
      {hashtags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {hashtags.map((tag) => (
            <span key={tag} className="text-xs text-blue-300">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter menhealth test social-preview-cards`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter menhealth typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "apps/menhealth/app/admin/(protected)/social/generate/[platform]/XPreview.tsx" \
  "apps/menhealth/app/admin/(protected)/social/generate/[platform]/RedditPreview.tsx" \
  "apps/menhealth/app/admin/(protected)/social/generate/[platform]/YouTubeCommunityPreview.tsx" \
  "apps/menhealth/app/admin/(protected)/social/generate/[platform]/TikTokPreview.tsx" \
  apps/menhealth/__tests__/social-preview-cards.test.tsx
git commit -m "feat(social): add per-platform draft preview cards"
```

---

### Task 6: Edit and generate/regenerate client components

**Files:**
- Create: `apps/menhealth/app/admin/(protected)/social/generate/[platform]/EditDraftForm.tsx`
- Create: `apps/menhealth/app/admin/(protected)/social/generate/[platform]/DraftGenerateAction.tsx`

**Interfaces:**
- Consumes: `PATCH /api/social/drafts/[id]` (Task 4), `POST /api/social/generate` (existing), `POST /api/social/drafts/[id]/regenerate` (Task 4).
- Produces: `EditDraftForm` (props: `postId: string; initialHook: string; initialScript: string; initialCaption: string; initialHashtags: string[]; showScript: boolean`), `DraftGenerateAction` (props: `{ mode: "generate"; videoId: string; platform: string } | { mode: "regenerate"; postId: string }`) — both consumed by Task 7's `page.tsx`.

No dedicated unit tests — these are thin fetch-and-`router.refresh()` client components, matching the untested convention already used by the existing `DraftActions.tsx` and `GenerateSocialButton.tsx` in this codebase. They're exercised by the manual smoke test in Task 9.

- [ ] **Step 1: Create `EditDraftForm.tsx`**

Create `apps/menhealth/app/admin/(protected)/social/generate/[platform]/EditDraftForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  postId: string;
  initialHook: string;
  initialScript: string;
  initialCaption: string;
  initialHashtags: string[];
  showScript: boolean;
};

export default function EditDraftForm({
  postId,
  initialHook,
  initialScript,
  initialCaption,
  initialHashtags,
  showScript,
}: Props) {
  const router = useRouter();
  const [hook, setHook] = useState(initialHook);
  const [script, setScript] = useState(initialScript);
  const [caption, setCaption] = useState(initialCaption);
  const [hashtagsText, setHashtagsText] = useState(initialHashtags.join(" "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const hashtags = hashtagsText
      .split(/\s+/)
      .map((h) => h.trim())
      .filter(Boolean);
    const res = await fetch(`/api/social/drafts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hook, script, caption, hashtags }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Save failed");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-lg border bg-white p-4">
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">
          Hook
        </label>
        <textarea
          value={hook}
          onChange={(e) => setHook(e.target.value)}
          rows={2}
          className="w-full rounded border px-2 py-1.5 text-sm"
        />
      </div>
      {showScript && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Script
          </label>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={6}
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">
          Caption
        </label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={4}
          className="w-full rounded border px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">
          Hashtags (space-separated)
        </label>
        <input
          type="text"
          value={hashtagsText}
          onChange={(e) => setHashtagsText(e.target.value)}
          className="w-full rounded border px-2 py-1.5 text-sm"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `DraftGenerateAction.tsx`**

Create `apps/menhealth/app/admin/(protected)/social/generate/[platform]/DraftGenerateAction.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props =
  | { mode: "generate"; videoId: string; platform: string }
  | { mode: "regenerate"; postId: string };

export default function DraftGenerateAction(props: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const res =
      props.mode === "generate"
        ? await fetch("/api/social/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              videoId: props.videoId,
              platform: props.platform,
            }),
          })
        : await fetch(`/api/social/drafts/${props.postId}/regenerate`, {
            method: "POST",
          });
    setLoading(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Request failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        onClick={handleClick}
        disabled={loading}
        className={
          props.mode === "generate"
            ? "rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            : "rounded-md border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        }
      >
        {props.mode === "generate"
          ? loading
            ? "Generating…"
            : "Generate"
          : loading
            ? "Regenerating…"
            : "Regenerate"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter menhealth typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/menhealth/app/admin/(protected)/social/generate/[platform]/EditDraftForm.tsx" \
  "apps/menhealth/app/admin/(protected)/social/generate/[platform]/DraftGenerateAction.tsx"
git commit -m "feat(social): add inline-edit and generate/regenerate client components"
```

---

### Task 7: New per-platform generate/regenerate page

**Files:**
- Create: `apps/menhealth/app/admin/(protected)/social/generate/[platform]/page.tsx`

**Interfaces:**
- Consumes: `db` (from `@/lib/db/prisma`), `DraftActions` (from `../../drafts/[id]/DraftActions`, existing/unchanged), the 4 preview components (Task 5), `EditDraftForm` + `DraftGenerateAction` (Task 6).
- Produces: the page at `/admin/social/generate/[platform]?videoId=…`, linked to by Task 8's rewritten `GenerateSocialButton.tsx`.

No dedicated tests — this Server Component is a thin composition of already-tested pieces (preview cards, domain functions) plus direct Prisma queries matching the existing untested pattern in `drafts/[id]/page.tsx` and `videos/[id]/page.tsx`. Verified via typecheck and the Task 9 manual smoke test.

- [ ] **Step 1: Create the page**

Create `apps/menhealth/app/admin/(protected)/social/generate/[platform]/page.tsx`:

```tsx
import { db } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import DraftActions from "../../drafts/[id]/DraftActions";
import EditDraftForm from "./EditDraftForm";
import DraftGenerateAction from "./DraftGenerateAction";
import XPreview from "./XPreview";
import RedditPreview from "./RedditPreview";
import YouTubeCommunityPreview from "./YouTubeCommunityPreview";
import TikTokPreview from "./TikTokPreview";

const PLATFORMS = ["X", "REDDIT", "YOUTUBE_COMMUNITY", "TIKTOK"] as const;
type Platform = (typeof PLATFORMS)[number];

const PLATFORM_LABELS: Record<Platform, string> = {
  X: "X",
  REDDIT: "Reddit",
  YOUTUBE_COMMUNITY: "YouTube Community",
  TIKTOK: "TikTok",
};

// A post is "active" for this page if it's still somewhere in the pipeline —
// terminal statuses (PUBLISHED/REJECTED/FAILED) fall through to the empty
// Generate state instead, same as clicking the old bulk button again would.
const NON_TERMINAL_STATUSES = new Set(["DRAFT", "PENDING_REVIEW", "APPROVED", "SCHEDULED"]);
const REGENERATABLE_STATUSES = new Set(["DRAFT", "PENDING_REVIEW"]);

function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}

export default async function GenerateSocialDraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ platform: string }>;
  searchParams: Promise<{ videoId?: string }>;
}) {
  const { platform: platformParam } = await params;
  const { videoId } = await searchParams;

  if (!isPlatform(platformParam) || !videoId) notFound();
  const platform = platformParam;

  const video = await db.video.findUnique({
    where: { id: videoId },
    select: { id: true, title: true },
  });
  if (!video) notFound();

  const latestPost = await db.socialPost.findFirst({
    where: { sourceId: videoId, platform },
    orderBy: { createdAt: "desc" },
  });

  const post =
    latestPost && NON_TERMINAL_STATUSES.has(latestPost.status) ? latestPost : null;

  const hook = post?.hook ?? "";
  const script = post?.script ?? "";
  const caption = post?.caption ?? "";
  const hashtags = post?.hashtags ?? [];
  const previewProps = { hook, script, caption, hashtags };

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/admin/videos/${videoId}`}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          &larr; {video.title}
        </Link>
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
          {PLATFORM_LABELS[platform]}
        </span>
        {post && (
          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
            {post.status}
          </span>
        )}
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Preview</h2>
          {platform === "X" && <XPreview {...previewProps} />}
          {platform === "REDDIT" && <RedditPreview {...previewProps} />}
          {platform === "YOUTUBE_COMMUNITY" && (
            <YouTubeCommunityPreview {...previewProps} />
          )}
          {platform === "TIKTOK" && <TikTokPreview {...previewProps} />}
        </section>

        {post ? (
          <>
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                Edit draft
              </h2>
              <EditDraftForm
                postId={post.id}
                initialHook={hook}
                initialScript={script}
                initialCaption={caption}
                initialHashtags={hashtags}
                showScript={platform === "TIKTOK"}
              />
            </section>

            {REGENERATABLE_STATUSES.has(post.status) && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-gray-700">
                  Regenerate
                </h2>
                <DraftGenerateAction mode="regenerate" postId={post.id} />
              </section>
            )}

            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                Actions
              </h2>
              <DraftActions
                postId={post.id}
                platform={post.platform}
                status={post.status}
                riskLevel={post.riskLevel}
                requiresReview={post.requiresReview}
                initialScheduledAt={post.scheduledAt?.toISOString() ?? null}
                caption={post.caption}
              />
            </section>
          </>
        ) : (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">
              Generate
            </h2>
            <DraftGenerateAction
              mode="generate"
              videoId={videoId}
              platform={platform}
            />
          </section>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter menhealth typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/menhealth/app/admin/(protected)/social/generate/[platform]/page.tsx"
git commit -m "feat(social): add per-platform generate/regenerate admin page"
```

---

### Task 8: Entry point — four platform links, TikTok manual-publish flow

**Files:**
- Modify: `apps/menhealth/app/admin/(protected)/videos/[id]/GenerateSocialButton.tsx`
- Modify: `apps/menhealth/app/admin/(protected)/social/drafts/[id]/DraftActions.tsx`

**Interfaces:**
- Consumes: nothing new (links to Task 7's page; `DraftActions` is otherwise unchanged).

No dedicated tests — neither component has existing test coverage, and this task doesn't add new business logic (Task 2/3's domain-function tests already cover the underlying regenerate/update behavior these UI pieces call into).

- [ ] **Step 1: Rewrite `GenerateSocialButton.tsx`**

Replace the entire contents of `apps/menhealth/app/admin/(protected)/videos/[id]/GenerateSocialButton.tsx`:

```tsx
import Link from "next/link";

const PLATFORMS = [
  { value: "X", label: "Generate for X" },
  { value: "REDDIT", label: "Generate for Reddit" },
  { value: "YOUTUBE_COMMUNITY", label: "Generate for YouTube Community" },
  { value: "TIKTOK", label: "Generate for TikTok" },
] as const;

export default function GenerateSocialButton({ videoId }: { videoId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PLATFORMS.map((p) => (
        <Link
          key={p.value}
          href={`/admin/social/generate/${p.value}?videoId=${videoId}`}
          className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          {p.label}
        </Link>
      ))}
    </div>
  );
}
```

This drops the `"use client"` directive along with `useState`/`useRouter`/the fetch-and-poll logic — the component is now pure navigation, so it no longer needs to be a Client Component.

- [ ] **Step 2: Add TikTok to `DraftActions.tsx`'s manual-platform check**

In `apps/menhealth/app/admin/(protected)/social/drafts/[id]/DraftActions.tsx`, replace:

```ts
  // Only X has a working auto-publisher (via the scheduled cron). Everything
  // else — YouTube Community and Reddit — is always manual: copy the text,
  // post it yourself, then record the link here.
  const isManualPlatform = platform === "YOUTUBE_COMMUNITY" || isReddit;
```

with:

```ts
  // Only X has a working auto-publisher (via the scheduled cron). Everything
  // else — YouTube Community, Reddit, and TikTok — is always manual: copy
  // the text, post it yourself, then record the link here.
  const isManualPlatform =
    platform === "YOUTUBE_COMMUNITY" || isReddit || platform === "TIKTOK";
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter menhealth typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/menhealth/app/admin/(protected)/videos/[id]/GenerateSocialButton.tsx" \
  "apps/menhealth/app/admin/(protected)/social/drafts/[id]/DraftActions.tsx"
git commit -m "feat(social): entry point becomes four platform links, TikTok gets manual-publish flow"
```

---

### Task 9: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full affected test suites**

Run: `pnpm --filter @menhealth/core-social typecheck && pnpm --filter menhealth typecheck && pnpm --filter menhealth test`
Expected: all pass, including every test added in Tasks 1–3 and 5.

- [ ] **Step 2: Manual smoke test — start the dev server**

Run: `pnpm --filter menhealth dev`

- [ ] **Step 3: Manual smoke test — generate flow**

In a browser, sign in as an admin, open a `PUBLISHED` video's admin detail page (`/admin/videos/[id]`), and confirm the four "Generate for …" links render. Click "Generate for TikTok" — confirm it navigates to `/admin/social/generate/TIKTOK?videoId=…`, shows an empty preview card and a "Generate" button (no existing draft yet). Click "Generate" and confirm it creates a draft, the page refreshes, and the preview card now shows the generated hook/script/caption, with the "Edit draft" and "Regenerate" sections appearing.

- [ ] **Step 4: Manual smoke test — X caption budget**

Repeat for "Generate for X" on the same video. Confirm the created draft's caption (visible in the preview and in `/admin/social/drafts`) is well under 280 characters including the UTM link, and does not trip the "Caption exceeds" filter (i.e., it doesn't need that filter to pass admin review).

- [ ] **Step 5: Manual smoke test — edit and regenerate**

On a `DRAFT` post's generate page, edit the caption in the "Edit draft" form and save — confirm the change persists after refresh. Click "Regenerate" — confirm the content changes and the row is overwritten (not duplicated) in `/admin/social/drafts`. Approve the post via the existing "Actions" panel, then reload the generate page — confirm the "Regenerate" section is no longer shown (guard matches `regenerateSocialPost`'s own status check).

- [ ] **Step 6: Manual smoke test — TikTok manual-publish flow**

On an approved TikTok draft, confirm the "Ready to paste" / "Copy draft to clipboard" / "Mark published" section now appears (previously only shown for YouTube Community and Reddit).

- [ ] **Step 7: Report results**

No commit for this task — it's verification only. If any step surfaces a bug, fix it within the task where the bug was introduced (per `superpowers:systematic-debugging` if the cause isn't immediately obvious), then re-run the affected steps.
