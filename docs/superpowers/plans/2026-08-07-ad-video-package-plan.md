# AI-generated ad video package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin generate an AI-scripted, site-wide promo ad, have it rendered (via Creatomate + ElevenLabs) into landscape/vertical/square video files plus a thumbnail and subtitles, review it, and download the approved package as a zip.

**Architecture:** A new `AdVideoPackage` Prisma model and a new `createAdVideoPackageGenerator(config)` factory in `packages/core-social` (same `Result<T,E>` + dependency-injected-config pattern as the existing `createSocialPostGenerator`), wired up in `apps/menhealth/lib/social/generate-ad-video-package.ts` with real Creatomate/ElevenLabs/Vercel Blob provider implementations. Generation is a fast synchronous call (AI script + TTS + kick off an async render); a cron-polled job finishes the job by downloading the finished renders and re-hosting them on Vercel Blob. Nothing in this flow ever calls a platform publish API — the deliverable is a downloadable zip, gated by mandatory human approval.

**Tech Stack:** Next.js App Router route handlers, Prisma/PostgreSQL, Zod, Vitest, `@vercel/blob`, `jszip`. Creatomate and ElevenLabs are called via raw `fetch` (no SDK dependency) from site-local provider modules.

## Global Constraints

- Every `AdVideoPackage` requires explicit admin approval before download — `requiresReview` is always `true` and is never set to `false` by generation code; the compliance scan gates *generation*, not the human-approval requirement.
- Nothing in this flow calls a platform's publish API — the flow ends at "download the approved zip," matching the site's no-auto-publish rule.
- Every generated caption must end with the disclaimer line ("Educational only. Not medical advice.") — AI output must never be presented as medical advice.
- All new server-side keys (`CREATOMATE_API_KEY`, `CREATOMATE_TEMPLATE_ID`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `BLOB_READ_WRITE_TOKEN`) go through `apps/menhealth/env.ts`'s Zod-validated `server` block — never raw `process.env` reads, never exposed to a client component.
- Admin routes (`/admin/social/video-ads/**`) and their API routes are session-gated the same way every other admin/social route is: `auth()` from `@/lib/auth`, checking `session?.user.isAdmin`.
- The cron route (`/api/cron/poll-ad-video-renders`) is protected by the same `Authorization: Bearer ${env.CRON_SECRET}` header check every other cron route in this repo uses.
- This spec only covers `apps/menhealth`; `packages/core-social` gets the new generic generator module but no site-specific config or API keys.

---

## File structure

**`packages/core-social/src/`** (shared, site-agnostic — no direct network calls, no `@vercel/blob`/Creatomate/ElevenLabs dependency; all I/O is injected via config, same as `fetchContext`/`aiClient` on the existing `createSocialPostGenerator`)
- `srt.ts` — pure `.srt` subtitle builder from word timestamps.
- `ad-video-prompt.ts` — the AI prompt builder for the ad script.
- `generate-ad-video-package.ts` — `createAdVideoPackageGenerator(config)`, exposing `generateAdVideoPackage()` and `pollRenderingPackages()`.
- `validation.ts` (modified) — adds `AdVideoScriptAiOutputSchema`, `ApproveAdVideoPackageSchema`, `RejectAdVideoPackageSchema`.
- `index.ts` (modified) — exports all of the above.

**`apps/menhealth/lib/social/providers/`** (new — real network calls, site-local since they read `env.ts` keys)
- `elevenlabs.ts` — calls ElevenLabs' timestamped TTS endpoint, converts character-level alignment to word-level timestamps.
- `creatomate.ts` — starts/polls a Creatomate render (4 requests — landscape/vertical/square/thumbnail — encoded behind one opaque `renderId` string).
- `blob.ts` — uploads a buffer to Vercel Blob, and mirrors a temporary provider URL (Creatomate's render output) to Blob.

**`apps/menhealth/lib/social/`** (modified — thin re-export barrels, matching the existing `prompts.ts`/`validation.ts`/`utm.ts` pattern)
- `srt.ts`, `ad-video-prompt.ts` (new barrels) + `validation.ts` (modified barrel).
- `generate-ad-video-package.ts` (new) — wires `createAdVideoPackageGenerator` with `db`, `aiClient`, the three providers above, and this site's brand/offer copy.

**`apps/menhealth/app/api/social/video-ads/`** (new)
- `generate/route.ts`, `[id]/approve/route.ts`, `[id]/reject/route.ts`, `[id]/download/route.ts`.

**`apps/menhealth/jobs/poll-ad-video-renders.ts`** + **`apps/menhealth/app/api/cron/poll-ad-video-renders/route.ts`** (new)

**`apps/menhealth/app/admin/(protected)/social/video-ads/`** (new)
- `page.tsx` (list), `generate/page.tsx` + `GenerateButton.tsx`, `[id]/page.tsx` + `VideoAdPackageActions.tsx`.

**`apps/menhealth/app/admin/(protected)/layout.tsx`** (modified) — adds an "Ad video packages" nav link. (The spec calls this "a fifth entry-point link alongside the YouTube Community/TikTok/Reddit/X links" — those four live on `GenerateSocialButton.tsx`, which is per-*video*. This package is explicitly *not* per-video, so that per-video button is the wrong home for it; the sidebar nav, where "Social drafts"/"Social schedule" already live as site-wide entry points, is the correct one.)

**`apps/menhealth/prisma/schema.prisma`** (modified) — new `AdPackageStatus` enum + `AdVideoPackage` model.

**`apps/menhealth/env.ts`** (modified) + **`apps/menhealth/__tests__/__mocks__/env.ts`** (modified) — 5 new required server env vars.

**`apps/menhealth/package.json`** (modified) — adds `@vercel/blob` and `jszip` dependencies.

---

### Task 1: Creatomate / ElevenLabs / Blob env vars

**Files:**
- Modify: `apps/menhealth/env.ts`
- Modify: `apps/menhealth/__tests__/__mocks__/env.ts`

**Interfaces:**
- Produces: `env.CREATOMATE_API_KEY`, `env.CREATOMATE_TEMPLATE_ID`, `env.ELEVENLABS_API_KEY`, `env.ELEVENLABS_VOICE_ID`, `env.BLOB_READ_WRITE_TOKEN` — all `string`, consumed by Task 9's provider modules and Task 10's wrapper.

- [ ] **Step 1: Add the 5 new required server env vars**

In `apps/menhealth/env.ts`, in the `server` block, add after `TIKTOK_REDIRECT_URI`:

```ts
    TIKTOK_REDIRECT_URI: z.string().url().optional(),
    CREATOMATE_API_KEY: z.string().min(1),
    CREATOMATE_TEMPLATE_ID: z.string().min(1),
    ELEVENLABS_API_KEY: z.string().min(1),
    ELEVENLABS_VOICE_ID: z.string().min(1),
    BLOB_READ_WRITE_TOKEN: z.string().min(1),
```

And in the `runtimeEnv` block, add after `TIKTOK_REDIRECT_URI: process.env.TIKTOK_REDIRECT_URI,`:

```ts
    TIKTOK_REDIRECT_URI: process.env.TIKTOK_REDIRECT_URI,
    CREATOMATE_API_KEY: process.env.CREATOMATE_API_KEY,
    CREATOMATE_TEMPLATE_ID: process.env.CREATOMATE_TEMPLATE_ID,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
```

- [ ] **Step 2: Add matching fake values to the test env mock**

In `apps/menhealth/__tests__/__mocks__/env.ts`, add after `GEMINI_API_KEY: "test-gemini-key",`:

```ts
  GEMINI_API_KEY: "test-gemini-key",
  CREATOMATE_API_KEY: "test-creatomate-key",
  CREATOMATE_TEMPLATE_ID: "test-creatomate-template",
  ELEVENLABS_API_KEY: "test-elevenlabs-key",
  ELEVENLABS_VOICE_ID: "test-elevenlabs-voice",
  BLOB_READ_WRITE_TOKEN: "test-blob-token",
```

- [ ] **Step 3: Verify the app still typechecks and existing tests still pass**

Run: `pnpm --filter menhealth typecheck && pnpm --filter menhealth test`
Expected: PASS (no new tests yet — this just confirms the env schema change doesn't break existing code; you'll also need `CREATOMATE_API_KEY`, `CREATOMATE_TEMPLATE_ID`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, and `BLOB_READ_WRITE_TOKEN` set in your local `.env` for `pnpm dev`/`pnpm build` to keep working.)

- [ ] **Step 4: Commit**

```bash
git add apps/menhealth/env.ts apps/menhealth/__tests__/__mocks__/env.ts
git commit -m "feat(social): add Creatomate/ElevenLabs/Blob env vars for ad video packages"
```

---

### Task 2: `AdVideoPackage` Prisma model

**Files:**
- Modify: `apps/menhealth/prisma/schema.prisma:490` (insert after the `model SocialMetric { ... }` block, before the `// Growth — Outreach CRM` comment)

**Interfaces:**
- Produces: `db.adVideoPackage.{create,findUnique,findMany,update}` with fields `id, status, script, caption, hashtags, disclaimerLine, utmUrl, requiresReview, renderProviderId, landscapeUrl, verticalUrl, squareUrl, thumbnailUrl, subtitleUrl, voiceoverUrl, errorMessage, approvedAt, approvedBy, createdAt, updatedAt`, and the `AdPackageStatus` enum (`DRAFT | RENDERING | PENDING_REVIEW | APPROVED | REJECTED | FAILED`) — consumed by Task 6/7's generator and Task 11/12's routes.

- [ ] **Step 1: Add the enum and model**

Insert into `apps/menhealth/prisma/schema.prisma` right after the closing `}` of `model SocialMetric` (currently line 490) and before the `// Growth — Outreach CRM` section comment:

```prisma
// ---------------------------------------------------------------------------
// Ad video packages — AI-scripted, Creatomate-rendered site-promo ads
// ---------------------------------------------------------------------------

enum AdPackageStatus {
  DRAFT
  RENDERING
  PENDING_REVIEW
  APPROVED
  REJECTED
  FAILED
}

model AdVideoPackage {
  id               String          @id @default(cuid())
  status           AdPackageStatus @default(DRAFT)
  script           String
  caption          String
  hashtags         String[]
  disclaimerLine   String
  utmUrl           String
  requiresReview   Boolean         @default(true)
  renderProviderId String?
  landscapeUrl     String?
  verticalUrl      String?
  squareUrl        String?
  thumbnailUrl     String?
  subtitleUrl      String?
  voiceoverUrl     String?
  errorMessage     String?
  approvedAt       DateTime?
  approvedBy       String?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
}
```

- [ ] **Step 2: Push the schema change and regenerate the Prisma client**

Run: `pnpm --filter menhealth exec prisma db push && pnpm --filter menhealth exec prisma generate`
Expected: `db push` reports the new `AdVideoPackage` table and `AdPackageStatus` enum created; `prisma generate` regenerates `@prisma/client` types so `db.adVideoPackage` and `AdPackageStatus` are available to TypeScript. (This repo has no `prisma/migrations` directory — schema changes are applied with `db push`, matching every other model in this file.)

- [ ] **Step 3: Verify typecheck picks up the new model**

Run: `pnpm --filter menhealth typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/menhealth/prisma/schema.prisma
git commit -m "feat(social): add AdVideoPackage model for AI-generated ad video packages"
```

---

### Task 3: `core-social` validation schemas

**Files:**
- Modify: `packages/core-social/src/validation.ts`
- Modify: `packages/core-social/src/index.ts`

**Interfaces:**
- Produces: `AdVideoScriptAiOutputSchema` (Zod, `{ script, caption, hashtags }`), `AdVideoScriptAiOutput` (type), `ApproveAdVideoPackageSchema`, `RejectAdVideoPackageSchema` — consumed by Task 6 (AI output validation) and Task 11 (route request validation).

- [ ] **Step 1: Add the schemas to `validation.ts`**

Append to `packages/core-social/src/validation.ts`:

```ts
// ---------------------------------------------------------------------------
// Ad video package schemas
// ---------------------------------------------------------------------------

export const AdVideoScriptAiOutputSchema = z.object({
  script: z
    .string()
    .min(20)
    .max(1200)
    .describe("~30-second voiceover script, spoken lines only"),
  caption: z
    .string()
    .min(10)
    .max(2200)
    .describe("Video description/CTA copy, including the disclaimer line"),
  hashtags: z
    .array(z.string().regex(/^#?\w+$/))
    .min(0)
    .max(30)
    .describe("Hashtags without the # prefix — it will be added automatically"),
});

export type AdVideoScriptAiOutput = z.infer<typeof AdVideoScriptAiOutputSchema>;

export const ApproveAdVideoPackageSchema = z.object({
  packageId: z.string().cuid(),
});

export const RejectAdVideoPackageSchema = z.object({
  packageId: z.string().cuid(),
});
```

- [ ] **Step 2: Export from `index.ts`**

In `packages/core-social/src/index.ts`, extend the existing validation export block:

```ts
export {
  SocialPostAiOutputSchema,
  ApprovePostSchema,
  RejectPostSchema,
  SchedulePostSchema,
  GeneratePostSchema,
  UpdateDraftSchema,
  AdVideoScriptAiOutputSchema,
  ApproveAdVideoPackageSchema,
  RejectAdVideoPackageSchema,
} from "./validation";
export type {
  SocialPostAiOutput,
  GeneratePostInput,
  UpdateDraftInput,
  AdVideoScriptAiOutput,
} from "./validation";
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @menhealth/core-social typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/core-social/src/validation.ts packages/core-social/src/index.ts
git commit -m "feat(core-social): add ad video package Zod schemas"
```

---

### Task 4: `.srt` subtitle builder

**Files:**
- Create: `packages/core-social/src/srt.ts`
- Test: `apps/menhealth/__tests__/social-ad-video-srt.test.ts`
- Create: `apps/menhealth/lib/social/srt.ts` (barrel re-export)

**Interfaces:**
- Produces: `VoiceoverWordTimestamp` (type, `{ word: string; startMs: number; endMs: number }`), `buildSrtFromTimestamps(timestamps: VoiceoverWordTimestamp[]): string` — consumed by Task 6 (generator, to build the subtitle file) and Task 9's ElevenLabs provider (produces `VoiceoverWordTimestamp[]`).

- [ ] **Step 1: Write the failing test**

Create `apps/menhealth/__tests__/social-ad-video-srt.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildSrtFromTimestamps } from "@/lib/social/srt";

describe("buildSrtFromTimestamps", () => {
  it("returns an empty string for no timestamps", () => {
    expect(buildSrtFromTimestamps([])).toBe("");
  });

  it("groups words into correctly-numbered, correctly-timed cues", () => {
    const timestamps = [
      { word: "Five", startMs: 0, endMs: 300 },
      { word: "summarized", startMs: 300, endMs: 900 },
      { word: "videos", startMs: 900, endMs: 1300 },
      { word: "a", startMs: 1300, endMs: 1400 },
      { word: "week,", startMs: 1400, endMs: 1900 },
      { word: "checked", startMs: 1900, endMs: 2300 },
      { word: "claims,", startMs: 2300, endMs: 2800 },
      { word: "free.", startMs: 2800, endMs: 3200 },
    ];

    const srt = buildSrtFromTimestamps(timestamps);
    const cues = srt.trim().split("\n\n");

    expect(cues).toHaveLength(2);
    expect(cues[0]).toBe(
      "1\n00:00:00,000 --> 00:00:02,300\nFive summarized videos a week, checked",
    );
    expect(cues[1]).toBe("2\n00:00:02,300 --> 00:00:03,200\nclaims, free.");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter menhealth exec vitest run social-ad-video-srt`
Expected: FAIL — `@/lib/social/srt` does not exist yet.

- [ ] **Step 3: Implement `buildSrtFromTimestamps` in `core-social`**

Create `packages/core-social/src/srt.ts`:

```ts
export type VoiceoverWordTimestamp = {
  word: string;
  startMs: number;
  endMs: number;
};

const MAX_WORDS_PER_CUE = 6;

function formatSrtTimestamp(ms: number): string {
  const totalMs = Math.max(0, Math.round(ms));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const millis = totalMs % 1000;
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}

/**
 * Groups word-level timestamps into fixed-size subtitle cues (6 words each)
 * and renders them as standard numbered SRT blocks.
 */
export function buildSrtFromTimestamps(
  timestamps: VoiceoverWordTimestamp[],
): string {
  if (timestamps.length === 0) return "";

  const cues: string[] = [];
  let cueIndex = 1;

  for (let i = 0; i < timestamps.length; i += MAX_WORDS_PER_CUE) {
    const chunk = timestamps.slice(i, i + MAX_WORDS_PER_CUE);
    const startMs = chunk[0]!.startMs;
    const endMs = chunk[chunk.length - 1]!.endMs;
    const text = chunk.map((w) => w.word).join(" ");
    cues.push(
      `${cueIndex}\n${formatSrtTimestamp(startMs)} --> ${formatSrtTimestamp(endMs)}\n${text}`,
    );
    cueIndex++;
  }

  return cues.join("\n\n") + "\n";
}
```

- [ ] **Step 4: Export it from `core-social`'s `index.ts`**

Add to `packages/core-social/src/index.ts`:

```ts
export { buildSrtFromTimestamps } from "./srt";
export type { VoiceoverWordTimestamp } from "./srt";
```

- [ ] **Step 5: Add the site-local barrel**

Create `apps/menhealth/lib/social/srt.ts`:

```ts
export { buildSrtFromTimestamps } from "@menhealth/core-social";
export type { VoiceoverWordTimestamp } from "@menhealth/core-social";
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter menhealth exec vitest run social-ad-video-srt`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/core-social/src/srt.ts packages/core-social/src/index.ts apps/menhealth/lib/social/srt.ts apps/menhealth/__tests__/social-ad-video-srt.test.ts
git commit -m "feat(core-social): add .srt subtitle builder from word timestamps"
```

---

### Task 5: Ad video AI prompt builder

**Files:**
- Create: `packages/core-social/src/ad-video-prompt.ts`
- Test: `apps/menhealth/__tests__/social-ad-video-prompt.test.ts`
- Create: `apps/menhealth/lib/social/ad-video-prompt.ts` (barrel re-export)

**Interfaces:**
- Produces: `AdVideoPromptConfig` (type, `{ siteName: string; offerCopy: string; disclaimerLine: string }`), `buildAdVideoScriptPrompt(config: AdVideoPromptConfig): string` — consumed by Task 6's generator.

- [ ] **Step 1: Write the failing test**

Create `apps/menhealth/__tests__/social-ad-video-prompt.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildAdVideoScriptPrompt } from "@/lib/social/ad-video-prompt";

const config = {
  siteName: "MenHealth Digest",
  offerCopy: "Five summarized videos a week, free, unsubscribe anytime.",
  disclaimerLine: "Educational only. Not medical advice.",
};

describe("buildAdVideoScriptPrompt", () => {
  it("includes the site name, offer copy, and disclaimer line", () => {
    const prompt = buildAdVideoScriptPrompt(config);
    expect(prompt).toContain(config.siteName);
    expect(prompt).toContain(config.offerCopy);
    expect(prompt).toContain(config.disclaimerLine);
  });

  it("asks for a JSON object with script, caption, and hashtags only", () => {
    const prompt = buildAdVideoScriptPrompt(config);
    expect(prompt).toContain('"script": "string"');
    expect(prompt).toContain('"caption": "string"');
    expect(prompt).toContain('"hashtags": ["string"]');
    expect(prompt).not.toContain('"hook"');
    expect(prompt).not.toContain('"requiresReview"');
  });

  it("instructs against fear-based or manipulative copy", () => {
    const prompt = buildAdVideoScriptPrompt(config);
    expect(prompt).toContain("fear-based or manipulative copy");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter menhealth exec vitest run social-ad-video-prompt`
Expected: FAIL — `@/lib/social/ad-video-prompt` does not exist yet.

- [ ] **Step 3: Implement `buildAdVideoScriptPrompt` in `core-social`**

Create `packages/core-social/src/ad-video-prompt.ts`:

```ts
export type AdVideoPromptConfig = {
  siteName: string;
  offerCopy: string;
  disclaimerLine: string;
};

export function buildAdVideoScriptPrompt(config: AdVideoPromptConfig): string {
  return `You are the ad copywriter for ${config.siteName}.

Write a ~30-second voiceover script for a short promotional video advertising the site itself — not any single video or topic.

The offer: ${config.offerCopy}

Rules:
- Do NOT write fear-based or manipulative copy — no unsubstantiated guarantees, no implying the viewer is at risk, no fake urgency.
- Write "script" as spoken lines a voiceover artist can read naturally aloud in about 30 seconds (roughly 70-90 words) — no stage directions, no on-screen-only text.
- Write "caption" as the written video description/CTA copy that will accompany the published video, ending with: "${config.disclaimerLine}"
- Hashtags should be relevant to men's health and wellness content, without the # prefix.

Respond ONLY with a JSON object:
{
  "script": "string",
  "caption": "string",
  "hashtags": ["string"]
}`;
}
```

- [ ] **Step 4: Export it from `core-social`'s `index.ts`**

Add to `packages/core-social/src/index.ts`:

```ts
export { buildAdVideoScriptPrompt } from "./ad-video-prompt";
export type { AdVideoPromptConfig } from "./ad-video-prompt";
```

- [ ] **Step 5: Add the site-local barrel**

Create `apps/menhealth/lib/social/ad-video-prompt.ts`:

```ts
export { buildAdVideoScriptPrompt } from "@menhealth/core-social";
export type { AdVideoPromptConfig } from "@menhealth/core-social";
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter menhealth exec vitest run social-ad-video-prompt`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/core-social/src/ad-video-prompt.ts packages/core-social/src/index.ts apps/menhealth/lib/social/ad-video-prompt.ts apps/menhealth/__tests__/social-ad-video-prompt.test.ts
git commit -m "feat(core-social): add ad video script prompt builder"
```

---

### Task 6: `generateAdVideoPackage()`

**Files:**
- Create: `packages/core-social/src/generate-ad-video-package.ts`
- Test: `apps/menhealth/__tests__/social-ad-video-package-generate.test.ts`

**Interfaces:**
- Consumes: `AdVideoScriptAiOutputSchema` (Task 3), `buildSrtFromTimestamps`/`VoiceoverWordTimestamp` (Task 4), `buildAdVideoScriptPrompt` (Task 5), `SocialAiClient` (existing, from `./generate-social-post`), `checkForbiddenPatterns`/`detectHighRiskTopic` (existing, `@menhealth/core-compliance`).
- Produces: `Result<T,E>` (type), `AdVideoPackageGeneratorConfig` (type), `RenderOutputs`, `RenderStatusResult`, `VoiceoverSynthesisResult` (types), `createAdVideoPackageGenerator(config): { generateAdVideoPackage, pollRenderingPackages }` — `generateAdVideoPackage(): Promise<Result<{ packageId: string }>>` consumed by Task 10's wrapper and Task 11's route. `pollRenderingPackages` is added in Task 7 (same file).

- [ ] **Step 1: Write the failing tests**

Create `apps/menhealth/__tests__/social-ad-video-package-generate.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { createAdVideoPackageGenerator } from "@menhealth/core-social";

function aiJsonResponse(body: object) {
  return { content: [{ type: "text", text: JSON.stringify(body) }] };
}

const VALID_AI_OUTPUT = {
  script:
    "Five summarized videos a week, checked claims, one practical takeaway. Free. Unsubscribe anytime.",
  caption:
    "New week, five men's health videos summarized and fact-checked for you. Educational only. Not medical advice.",
  hashtags: ["MensHealth", "Fitness"],
};

function buildConfig(overrides: Record<string, unknown> = {}) {
  const mockCreate = vi.fn().mockResolvedValue({ id: "pkg_1" });
  const mockAiCreate = vi.fn().mockResolvedValue(aiJsonResponse(VALID_AI_OUTPUT));
  const mockSynthesize = vi.fn().mockResolvedValue({
    audio: Buffer.from("fake-audio"),
    contentType: "audio/mpeg",
    timestamps: [{ word: "Five", startMs: 0, endMs: 300 }],
  });
  const mockStartRender = vi.fn().mockResolvedValue({ renderId: "render_123" });
  const mockUploadBuffer = vi
    .fn()
    .mockResolvedValue({ url: "https://blob.example.com/asset" });

  return {
    config: {
      db: { adVideoPackage: { create: mockCreate } },
      aiClient: {
        defaultModel: "test-model",
        anthropic: { messages: { create: mockAiCreate } },
      },
      aiConfigured: true,
      siteName: "MenHealth Digest",
      offerCopy: "Five summarized videos a week, free, unsubscribe anytime.",
      disclaimerLine: "Educational only. Not medical advice.",
      utmUrl: "https://example.com/?utm_source=video_ad",
      forbiddenPatterns: [
        { pattern: /this\s+cures?/i, reason: "Unsubstantiated cure claim" },
      ],
      highRiskKeywords: ["testosterone"],
      synthesizeVoiceover: mockSynthesize,
      startRender: mockStartRender,
      getRenderStatus: vi.fn(),
      uploadBuffer: mockUploadBuffer,
      mirrorUrlToBlob: vi.fn(),
      ...overrides,
    },
    mockCreate,
    mockAiCreate,
    mockSynthesize,
  };
}

describe("generateAdVideoPackage", () => {
  it("creates a RENDERING package from a valid AI response", async () => {
    const { config, mockCreate } = buildConfig();
    const { generateAdVideoPackage } = createAdVideoPackageGenerator(
      config as Parameters<typeof createAdVideoPackageGenerator>[0],
    );

    const result = await generateAdVideoPackage();

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.value.packageId).toBe("pkg_1");
    const createArgs = mockCreate.mock.calls[0]![0] as {
      data: {
        status: string;
        requiresReview: boolean;
        renderProviderId: string;
      };
    };
    expect(createArgs.data.status).toBe("RENDERING");
    expect(createArgs.data.requiresReview).toBe(true);
    expect(createArgs.data.renderProviderId).toBe("render_123");
  });

  it("rejects and creates no row when the script trips a forbidden pattern", async () => {
    const { config, mockCreate, mockSynthesize, mockAiCreate } = buildConfig();
    mockAiCreate.mockResolvedValue(
      aiJsonResponse({
        ...VALID_AI_OUTPUT,
        script: "This cures low testosterone fast.",
      }),
    );
    const { generateAdVideoPackage } = createAdVideoPackageGenerator(
      config as Parameters<typeof createAdVideoPackageGenerator>[0],
    );

    const result = await generateAdVideoPackage();

    expect(result.ok).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockSynthesize).not.toHaveBeenCalled();
  });

  it("rejects and creates no row when a high-risk keyword is detected", async () => {
    const { config, mockCreate, mockAiCreate } = buildConfig();
    mockAiCreate.mockResolvedValue(
      aiJsonResponse({
        ...VALID_AI_OUTPUT,
        caption: "All about testosterone boosting.",
      }),
    );
    const { generateAdVideoPackage } = createAdVideoPackageGenerator(
      config as Parameters<typeof createAdVideoPackageGenerator>[0],
    );

    const result = await generateAdVideoPackage();

    expect(result.ok).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("fails without creating a row when AI output fails schema validation", async () => {
    const { config, mockCreate, mockAiCreate } = buildConfig();
    mockAiCreate.mockResolvedValue(
      aiJsonResponse({ script: "", caption: "", hashtags: [] }),
    );
    const { generateAdVideoPackage } = createAdVideoPackageGenerator(
      config as Parameters<typeof createAdVideoPackageGenerator>[0],
    );

    const result = await generateAdVideoPackage();

    expect(result.ok).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("fails when the AI client is not configured", async () => {
    const { config, mockCreate } = buildConfig({ aiConfigured: false });
    const { generateAdVideoPackage } = createAdVideoPackageGenerator(
      config as Parameters<typeof createAdVideoPackageGenerator>[0],
    );

    const result = await generateAdVideoPackage();

    expect(result.ok).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter menhealth exec vitest run social-ad-video-package-generate`
Expected: FAIL — `createAdVideoPackageGenerator` does not exist yet.

- [ ] **Step 3: Implement `generateAdVideoPackage()`**

Create `packages/core-social/src/generate-ad-video-package.ts`:

```ts
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  checkForbiddenPatterns,
  detectHighRiskTopic,
} from "@menhealth/core-compliance";
import { AdVideoScriptAiOutputSchema } from "./validation";
import { buildAdVideoScriptPrompt } from "./ad-video-prompt";
import { buildSrtFromTimestamps, type VoiceoverWordTimestamp } from "./srt";
import type { SocialAiClient } from "./generate-social-post";

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type RenderOutputs = {
  landscapeUrl: string;
  verticalUrl: string;
  squareUrl: string;
  thumbnailUrl: string;
};

export type RenderStatusResult =
  | { status: "rendering" }
  | { status: "succeeded"; outputs: RenderOutputs }
  | { status: "failed"; errorMessage: string };

export type VoiceoverSynthesisResult = {
  audio: Buffer;
  contentType: string;
  timestamps: VoiceoverWordTimestamp[];
};

export type AdVideoPackageGeneratorConfig = {
  /**
   * Prisma's generated types carry generic branding tied to their own
   * generation, so a `Pick<PrismaClient, ...>` from one site's generated
   * client isn't satisfied by another site's. `any` here is intentional —
   * see the identical rationale on `SocialPostGeneratorConfig.db`.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  aiClient: SocialAiClient;
  aiConfigured: boolean;
  siteName: string;
  offerCopy: string;
  disclaimerLine: string;
  utmUrl: string;
  forbiddenPatterns: Array<{ pattern: RegExp; reason: string }>;
  highRiskKeywords: string[];
  synthesizeVoiceover: (script: string) => Promise<VoiceoverSynthesisResult>;
  startRender: (input: {
    script: string;
    voiceoverUrl: string;
  }) => Promise<{ renderId: string }>;
  getRenderStatus: (renderId: string) => Promise<RenderStatusResult>;
  uploadBuffer: (
    pathname: string,
    data: Buffer,
    contentType: string,
  ) => Promise<{ url: string }>;
  mirrorUrlToBlob: (
    pathname: string,
    sourceUrl: string,
  ) => Promise<{ url: string }>;
};

export function createAdVideoPackageGenerator(
  config: AdVideoPackageGeneratorConfig,
) {
  async function generateAdVideoPackage(): Promise<
    Result<{ packageId: string }>
  > {
    if (!config.aiConfigured) {
      return {
        ok: false,
        error: new Error(
          "AI client is not configured. Add an AI provider API key to enable ad video generation.",
        ),
      };
    }

    let aiOutput: z.infer<typeof AdVideoScriptAiOutputSchema>;
    try {
      const message = await config.aiClient.anthropic.messages.create({
        model: config.aiClient.defaultModel,
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: buildAdVideoScriptPrompt({
              siteName: config.siteName,
              offerCopy: config.offerCopy,
              disclaimerLine: config.disclaimerLine,
            }),
          },
        ],
      });

      const textBlock = message.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        return { ok: false, error: new Error("No text block in AI response") };
      }

      const parsed = JSON.parse(textBlock.text) as unknown;
      const validated = AdVideoScriptAiOutputSchema.safeParse(parsed);
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

    // Unlike generateSocialPost (where a detected high-risk topic only forces
    // requiresReview=true), a high-risk keyword here blocks generation
    // entirely — this package always requires review regardless, so there's
    // no separate "force review" state to route into.
    const combinedText = `${aiOutput.script} ${aiOutput.caption}`;
    const forbiddenCheck = checkForbiddenPatterns(
      combinedText,
      config.forbiddenPatterns,
    );
    const isHighRisk = detectHighRiskTopic(combinedText, config.highRiskKeywords);
    if (forbiddenCheck.matched || isHighRisk) {
      const reasons = [
        ...forbiddenCheck.violations.map((v) => v.reason),
        ...(isHighRisk ? ["High-risk topic keyword detected"] : []),
      ];
      return {
        ok: false,
        error: new Error(
          `Generated ad script contains blocked content: ${reasons.join(", ")}`,
        ),
      };
    }

    const hashtags = aiOutput.hashtags.map((h) =>
      h.startsWith("#") ? h : `#${h}`,
    );

    let voiceover: VoiceoverSynthesisResult;
    try {
      voiceover = await config.synthesizeVoiceover(aiOutput.script);
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }

    const assetToken = randomUUID();
    let voiceoverUrl: string;
    let subtitleUrl: string;
    try {
      const voiceoverUpload = await config.uploadBuffer(
        `ad-video-packages/${assetToken}/voiceover.mp3`,
        voiceover.audio,
        voiceover.contentType,
      );
      voiceoverUrl = voiceoverUpload.url;

      const srt = buildSrtFromTimestamps(voiceover.timestamps);
      const subtitleUpload = await config.uploadBuffer(
        `ad-video-packages/${assetToken}/subtitles.srt`,
        Buffer.from(srt, "utf-8"),
        "text/plain",
      );
      subtitleUrl = subtitleUpload.url;
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }

    let renderId: string;
    try {
      const render = await config.startRender({
        script: aiOutput.script,
        voiceoverUrl,
      });
      renderId = render.renderId;
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }

    const created = await config.db.adVideoPackage.create({
      data: {
        status: "RENDERING",
        script: aiOutput.script,
        caption: aiOutput.caption,
        hashtags,
        disclaimerLine: config.disclaimerLine,
        utmUrl: config.utmUrl,
        requiresReview: true,
        renderProviderId: renderId,
        voiceoverUrl,
        subtitleUrl,
      },
    });

    return { ok: true, value: { packageId: created.id } };
  }

  return { generateAdVideoPackage };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter menhealth exec vitest run social-ad-video-package-generate`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core-social/src/generate-ad-video-package.ts apps/menhealth/__tests__/social-ad-video-package-generate.test.ts
git commit -m "feat(core-social): add generateAdVideoPackage()"
```

---

### Task 7: `pollRenderingPackages()`

**Files:**
- Modify: `packages/core-social/src/generate-ad-video-package.ts`
- Test: `apps/menhealth/__tests__/social-ad-video-package-poll.test.ts`

**Interfaces:**
- Consumes: `AdVideoPackageGeneratorConfig`, `RenderStatusResult` (Task 6, same file).
- Produces: `pollRenderingPackages(): Promise<Result<{ checked: number; completed: number; failed: number }>>`, added to the object returned by `createAdVideoPackageGenerator` — consumed by Task 10's wrapper and Task 13's cron job.

- [ ] **Step 1: Write the failing tests**

Create `apps/menhealth/__tests__/social-ad-video-package-poll.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { createAdVideoPackageGenerator } from "@menhealth/core-social";

const RENDERING_PACKAGE = { id: "pkg_1", renderProviderId: "render_123" };

const SUCCEEDED_STATUS = {
  status: "succeeded" as const,
  outputs: {
    landscapeUrl: "https://creatomate.example.com/landscape.mp4",
    verticalUrl: "https://creatomate.example.com/vertical.mp4",
    squareUrl: "https://creatomate.example.com/square.mp4",
    thumbnailUrl: "https://creatomate.example.com/thumbnail.jpg",
  },
};

function buildConfig(overrides: Record<string, unknown> = {}) {
  const mockFindMany = vi.fn().mockResolvedValue([RENDERING_PACKAGE]);
  const mockUpdate = vi.fn().mockResolvedValue({});
  const mockGetStatus = vi.fn();
  const mockMirror = vi.fn().mockImplementation(async (pathname: string) => ({
    url: `https://blob.example.com/${pathname}`,
  }));

  return {
    config: {
      db: { adVideoPackage: { findMany: mockFindMany, update: mockUpdate } },
      aiClient: {
        defaultModel: "test-model",
        anthropic: { messages: { create: vi.fn() } },
      },
      aiConfigured: true,
      siteName: "MenHealth Digest",
      offerCopy: "offer",
      disclaimerLine: "disclaimer",
      utmUrl: "https://example.com",
      forbiddenPatterns: [],
      highRiskKeywords: [],
      synthesizeVoiceover: vi.fn(),
      startRender: vi.fn(),
      getRenderStatus: mockGetStatus,
      uploadBuffer: vi.fn(),
      mirrorUrlToBlob: mockMirror,
      ...overrides,
    },
    mockFindMany,
    mockUpdate,
    mockGetStatus,
  };
}

describe("pollRenderingPackages", () => {
  it("transitions a completed render to PENDING_REVIEW with all URLs set", async () => {
    const { config, mockUpdate, mockGetStatus } = buildConfig();
    mockGetStatus.mockResolvedValue(SUCCEEDED_STATUS);
    const { pollRenderingPackages } = createAdVideoPackageGenerator(
      config as Parameters<typeof createAdVideoPackageGenerator>[0],
    );

    const result = await pollRenderingPackages();

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.value).toEqual({ checked: 1, completed: 1, failed: 0 });
    const updateArgs = mockUpdate.mock.calls[0]![0] as {
      where: { id: string };
      data: Record<string, unknown>;
    };
    expect(updateArgs.where.id).toBe("pkg_1");
    expect(updateArgs.data.status).toBe("PENDING_REVIEW");
    expect(updateArgs.data.landscapeUrl).toContain("landscape.mp4");
    expect(updateArgs.data.verticalUrl).toContain("vertical.mp4");
    expect(updateArgs.data.squareUrl).toContain("square.mp4");
    expect(updateArgs.data.thumbnailUrl).toContain("thumbnail.jpg");
  });

  it("transitions a failed render to FAILED with errorMessage set", async () => {
    const { config, mockUpdate, mockGetStatus } = buildConfig();
    mockGetStatus.mockResolvedValue({
      status: "failed",
      errorMessage: "Template render error",
    });
    const { pollRenderingPackages } = createAdVideoPackageGenerator(
      config as Parameters<typeof createAdVideoPackageGenerator>[0],
    );

    const result = await pollRenderingPackages();

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.value).toEqual({ checked: 1, completed: 0, failed: 1 });
    const updateArgs = mockUpdate.mock.calls[0]![0] as {
      data: { status: string; errorMessage: string };
    };
    expect(updateArgs.data.status).toBe("FAILED");
    expect(updateArgs.data.errorMessage).toBe("Template render error");
  });

  it("leaves a still-rendering package untouched", async () => {
    const { config, mockUpdate, mockGetStatus } = buildConfig();
    mockGetStatus.mockResolvedValue({ status: "rendering" });
    const { pollRenderingPackages } = createAdVideoPackageGenerator(
      config as Parameters<typeof createAdVideoPackageGenerator>[0],
    );

    const result = await pollRenderingPackages();

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.value).toEqual({ checked: 1, completed: 0, failed: 0 });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("does not let one package's provider error abort the batch", async () => {
    const secondPackage = { id: "pkg_2", renderProviderId: "render_456" };
    const { config, mockFindMany, mockUpdate, mockGetStatus } = buildConfig();
    mockFindMany.mockResolvedValue([RENDERING_PACKAGE, secondPackage]);
    mockGetStatus.mockImplementation(async (renderId: string) => {
      if (renderId === "render_123") throw new Error("Network error");
      return SUCCEEDED_STATUS;
    });
    const { pollRenderingPackages } = createAdVideoPackageGenerator(
      config as Parameters<typeof createAdVideoPackageGenerator>[0],
    );

    const result = await pollRenderingPackages();

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.value).toEqual({ checked: 2, completed: 1, failed: 1 });
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    const pkg1Update = mockUpdate.mock.calls.find(
      (call) => (call[0] as { where: { id: string } }).where.id === "pkg_1",
    )?.[0] as { data: { status: string } };
    expect(pkg1Update.data.status).toBe("FAILED");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter menhealth exec vitest run social-ad-video-package-poll`
Expected: FAIL — `pollRenderingPackages` is not returned by `createAdVideoPackageGenerator` yet.

- [ ] **Step 3: Implement `pollRenderingPackages()`**

In `packages/core-social/src/generate-ad-video-package.ts`, add this function inside `createAdVideoPackageGenerator`, right after `generateAdVideoPackage`, and change the final `return` statement:

```ts
  async function pollRenderingPackages(): Promise<
    Result<{ checked: number; completed: number; failed: number }>
  > {
    const packages = await config.db.adVideoPackage.findMany({
      where: { status: "RENDERING" },
    });

    let completed = 0;
    let failed = 0;

    for (const pkg of packages) {
      try {
        const status = await config.getRenderStatus(
          pkg.renderProviderId as string,
        );

        if (status.status === "rendering") {
          continue;
        }

        if (status.status === "failed") {
          await config.db.adVideoPackage.update({
            where: { id: pkg.id },
            data: { status: "FAILED", errorMessage: status.errorMessage },
          });
          failed++;
          continue;
        }

        const assetToken = randomUUID();
        const [landscape, vertical, square, thumbnail] = await Promise.all([
          config.mirrorUrlToBlob(
            `ad-video-packages/${assetToken}/landscape.mp4`,
            status.outputs.landscapeUrl,
          ),
          config.mirrorUrlToBlob(
            `ad-video-packages/${assetToken}/vertical.mp4`,
            status.outputs.verticalUrl,
          ),
          config.mirrorUrlToBlob(
            `ad-video-packages/${assetToken}/square.mp4`,
            status.outputs.squareUrl,
          ),
          config.mirrorUrlToBlob(
            `ad-video-packages/${assetToken}/thumbnail.jpg`,
            status.outputs.thumbnailUrl,
          ),
        ]);

        await config.db.adVideoPackage.update({
          where: { id: pkg.id },
          data: {
            status: "PENDING_REVIEW",
            landscapeUrl: landscape.url,
            verticalUrl: vertical.url,
            squareUrl: square.url,
            thumbnailUrl: thumbnail.url,
          },
        });
        completed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await config.db.adVideoPackage.update({
          where: { id: pkg.id },
          data: { status: "FAILED", errorMessage: message },
        });
        failed++;
      }
    }

    return {
      ok: true,
      value: { checked: packages.length, completed, failed },
    };
  }

  return { generateAdVideoPackage, pollRenderingPackages };
```

(This replaces the old `return { generateAdVideoPackage };` line at the end of the function.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter menhealth exec vitest run social-ad-video-package-poll`
Expected: PASS

- [ ] **Step 5: Run the full generator test suite together**

Run: `pnpm --filter menhealth exec vitest run social-ad-video-package`
Expected: PASS (both generate and poll test files)

- [ ] **Step 6: Commit**

```bash
git add packages/core-social/src/generate-ad-video-package.ts apps/menhealth/__tests__/social-ad-video-package-poll.test.ts
git commit -m "feat(core-social): add pollRenderingPackages()"
```

---

### Task 8: Export the generator from `core-social` and the site barrels

**Files:**
- Modify: `packages/core-social/src/index.ts`
- Modify: `apps/menhealth/lib/social/validation.ts`

**Interfaces:**
- Produces: `createAdVideoPackageGenerator`, `AdVideoPackageGeneratorConfig`, `RenderOutputs`, `RenderStatusResult`, `VoiceoverSynthesisResult` exported from `@menhealth/core-social` — consumed by Task 10's site wrapper.

- [ ] **Step 1: Export the generator from `core-social`'s `index.ts`**

Add to `packages/core-social/src/index.ts`:

```ts
export { createAdVideoPackageGenerator } from "./generate-ad-video-package";
export type {
  AdVideoPackageGeneratorConfig,
  RenderOutputs,
  RenderStatusResult,
  VoiceoverSynthesisResult,
} from "./generate-ad-video-package";
```

- [ ] **Step 2: Re-export the new validation schemas from the site barrel**

In `apps/menhealth/lib/social/validation.ts`, extend the existing re-export blocks:

```ts
export {
  SocialPostAiOutputSchema,
  ApprovePostSchema,
  RejectPostSchema,
  SchedulePostSchema,
  GeneratePostSchema,
  UpdateDraftSchema,
  AdVideoScriptAiOutputSchema,
  ApproveAdVideoPackageSchema,
  RejectAdVideoPackageSchema,
} from "@menhealth/core-social";
export type {
  SocialPostAiOutput,
  GeneratePostInput,
  UpdateDraftInput,
  AdVideoScriptAiOutput,
} from "@menhealth/core-social";
```

- [ ] **Step 3: Typecheck both packages**

Run: `pnpm --filter @menhealth/core-social typecheck && pnpm --filter menhealth typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/core-social/src/index.ts apps/menhealth/lib/social/validation.ts
git commit -m "feat(core-social): export createAdVideoPackageGenerator"
```

---

### Task 9: Site-local Creatomate, ElevenLabs, and Blob providers

**Files:**
- Create: `apps/menhealth/lib/social/providers/elevenlabs.ts`
- Create: `apps/menhealth/lib/social/providers/creatomate.ts`
- Create: `apps/menhealth/lib/social/providers/blob.ts`
- Modify: `apps/menhealth/package.json` (add `@vercel/blob`)

**Interfaces:**
- Consumes: `VoiceoverWordTimestamp`, `RenderStatusResult` types from `@menhealth/core-social`.
- Produces: `synthesizeElevenLabsVoiceover(apiKey, voiceId, script): Promise<{ audio: Buffer; contentType: string; timestamps: VoiceoverWordTimestamp[] }>`, `startCreatomateRender(apiKey, templateId, input: { script, voiceoverUrl }): Promise<{ renderId: string }>`, `getCreatomateRenderStatus(apiKey, renderId): Promise<RenderStatusResult>`, `uploadBufferToBlob(token, pathname, data, contentType): Promise<{ url: string }>`, `mirrorUrlToBlob(token, pathname, sourceUrl): Promise<{ url: string }>` — all consumed by Task 10's wrapper.

No dedicated unit tests for this task — these are thin network-calling wrappers around external APIs, the same category as `lib/social/adapters/x.ts`'s `.publish()` method, which this repo doesn't unit test either (only pure `.validate()` logic gets tests). Correctness here is exercised via the real Creatomate/ElevenLabs/Vercel dashboards during manual verification, and the generator logic that calls these (already covered by Tasks 6–7) is tested with fully mocked equivalents.

- [ ] **Step 1: Add the `@vercel/blob` dependency**

Run: `pnpm --filter menhealth add @vercel/blob`
Expected: `@vercel/blob` added to `apps/menhealth/package.json` dependencies and the lockfile updated.

- [ ] **Step 2: Implement the ElevenLabs provider**

Create `apps/menhealth/lib/social/providers/elevenlabs.ts`:

```ts
import "server-only";
import type { VoiceoverWordTimestamp } from "@menhealth/core-social";

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

type ElevenLabsTimestampResponse = {
  audio_base64: string;
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
};

/**
 * Groups ElevenLabs' character-level alignment into word-level timestamps —
 * a word spans its first character's start time to its last character's end
 * time; whitespace characters are separators, not part of any word.
 */
function alignmentToWordTimestamps(
  alignment: ElevenLabsTimestampResponse["alignment"],
): VoiceoverWordTimestamp[] {
  const words: VoiceoverWordTimestamp[] = [];
  let current: { chars: string[]; startS: number; endS: number } | null = null;

  alignment.characters.forEach((char, i) => {
    const startS = alignment.character_start_times_seconds[i]!;
    const endS = alignment.character_end_times_seconds[i]!;

    if (/\s/.test(char)) {
      if (current) {
        const finished = current;
        words.push({
          word: finished.chars.join(""),
          startMs: Math.round(finished.startS * 1000),
          endMs: Math.round(finished.endS * 1000),
        });
        current = null;
      }
      return;
    }

    if (!current) {
      current = { chars: [char], startS, endS };
    } else {
      current.chars.push(char);
      current.endS = endS;
    }
  });

  if (current) {
    const finished: { chars: string[]; startS: number; endS: number } = current;
    words.push({
      word: finished.chars.join(""),
      startMs: Math.round(finished.startS * 1000),
      endMs: Math.round(finished.endS * 1000),
    });
  }

  return words;
}

export async function synthesizeElevenLabsVoiceover(
  apiKey: string,
  voiceId: string,
  script: string,
): Promise<{
  audio: Buffer;
  contentType: string;
  timestamps: VoiceoverWordTimestamp[];
}> {
  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}/with-timestamps`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: script,
        model_id: "eleven_multilingual_v2",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `ElevenLabs synthesis failed: ${response.status} ${await response.text()}`,
    );
  }

  const body = (await response.json()) as ElevenLabsTimestampResponse;

  return {
    audio: Buffer.from(body.audio_base64, "base64"),
    contentType: "audio/mpeg",
    timestamps: alignmentToWordTimestamps(body.alignment),
  };
}
```

- [ ] **Step 3: Implement the Creatomate provider**

Create `apps/menhealth/lib/social/providers/creatomate.ts`:

```ts
import "server-only";
import type { RenderStatusResult } from "@menhealth/core-social";

const CREATOMATE_BASE_URL = "https://api.creatomate.com/v1";

type CreatomateRenderResponse = {
  id: string;
  status:
    | "planned"
    | "waiting"
    | "transcribing"
    | "rendering"
    | "succeeded"
    | "failed";
  url: string | null;
  error_message?: string;
};

type RenderOutputKey = "landscape" | "vertical" | "square" | "thumbnail";

/**
 * Modification keys ("Voiceover.source", "Script-Text.text",
 * "Output.width"/"height"/"format") must match the element names configured
 * on the ad template in the Creatomate dashboard (see the design spec's
 * "Providers" section — the template itself is authored outside this repo).
 */
const OUTPUT_MODIFICATIONS: Record<RenderOutputKey, Record<string, string>> = {
  landscape: { "Output.width": "1920", "Output.height": "1080" },
  vertical: { "Output.width": "1080", "Output.height": "1920" },
  square: { "Output.width": "1080", "Output.height": "1080" },
  thumbnail: {
    "Output.width": "1080",
    "Output.height": "1080",
    "Output.format": "jpg",
  },
};

/**
 * `renderId` is an opaque handle for core-social's generator — internally
 * it JSON-encodes the four separate Creatomate render IDs this template
 * produces, since Creatomate renders one asset per request even though the
 * design treats "start a render" as a single call.
 */
export async function startCreatomateRender(
  apiKey: string,
  templateId: string,
  input: { script: string; voiceoverUrl: string },
): Promise<{ renderId: string }> {
  const entries = await Promise.all(
    (Object.keys(OUTPUT_MODIFICATIONS) as RenderOutputKey[]).map(
      async (key) => {
        const response = await fetch(`${CREATOMATE_BASE_URL}/renders`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            template_id: templateId,
            modifications: {
              "Voiceover.source": input.voiceoverUrl,
              "Script-Text.text": input.script,
              ...OUTPUT_MODIFICATIONS[key],
            },
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Creatomate render request failed for ${key}: ${response.status} ${await response.text()}`,
          );
        }

        const [render] = (await response.json()) as CreatomateRenderResponse[];
        if (!render) {
          throw new Error(`Creatomate returned no render for ${key}`);
        }
        return [key, render.id] as const;
      },
    ),
  );

  return { renderId: JSON.stringify(Object.fromEntries(entries)) };
}

export async function getCreatomateRenderStatus(
  apiKey: string,
  renderId: string,
): Promise<RenderStatusResult> {
  const ids = JSON.parse(renderId) as Record<RenderOutputKey, string>;

  const statuses = await Promise.all(
    (Object.keys(ids) as RenderOutputKey[]).map(async (key) => {
      const response = await fetch(`${CREATOMATE_BASE_URL}/renders/${ids[key]}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok) {
        throw new Error(
          `Creatomate status check failed for ${key}: ${response.status} ${await response.text()}`,
        );
      }
      const render = (await response.json()) as CreatomateRenderResponse;
      return [key, render] as const;
    }),
  );

  const byKey = Object.fromEntries(statuses) as Record<
    RenderOutputKey,
    CreatomateRenderResponse
  >;

  const failedRender = Object.values(byKey).find((r) => r.status === "failed");
  if (failedRender) {
    return {
      status: "failed",
      errorMessage: failedRender.error_message ?? "Creatomate render failed",
    };
  }

  const allSucceeded = Object.values(byKey).every(
    (r) => r.status === "succeeded",
  );
  if (!allSucceeded) {
    return { status: "rendering" };
  }

  return {
    status: "succeeded",
    outputs: {
      landscapeUrl: byKey.landscape.url!,
      verticalUrl: byKey.vertical.url!,
      squareUrl: byKey.square.url!,
      thumbnailUrl: byKey.thumbnail.url!,
    },
  };
}
```

- [ ] **Step 4: Implement the Blob provider**

Create `apps/menhealth/lib/social/providers/blob.ts`:

```ts
import "server-only";
import { put } from "@vercel/blob";

export async function uploadBufferToBlob(
  token: string,
  pathname: string,
  data: Buffer,
  contentType: string,
): Promise<{ url: string }> {
  const blob = await put(pathname, data, {
    access: "public",
    contentType,
    token,
    addRandomSuffix: false,
  });
  return { url: blob.url };
}

export async function mirrorUrlToBlob(
  token: string,
  pathname: string,
  sourceUrl: string,
): Promise<{ url: string }> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download asset from ${sourceUrl}: ${response.status}`,
    );
  }
  const contentType =
    response.headers.get("content-type") ?? "application/octet-stream";
  const data = Buffer.from(await response.arrayBuffer());
  return uploadBufferToBlob(token, pathname, data, contentType);
}
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter menhealth typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/menhealth/lib/social/providers apps/menhealth/package.json pnpm-lock.yaml
git commit -m "feat(social): add Creatomate/ElevenLabs/Blob provider modules"
```

---

### Task 10: Site wrapper — `generate-ad-video-package.ts`

**Files:**
- Create: `apps/menhealth/lib/social/generate-ad-video-package.ts`

**Interfaces:**
- Consumes: `createAdVideoPackageGenerator` (Task 8), the three providers (Task 9), `env` (Task 1), `aiClient`/`db`/`FORBIDDEN_PATTERNS`/`HIGH_RISK_TOPIC_KEYWORDS`/`SITE_NAME` (existing).
- Produces: `generateAdVideoPackage`, `pollRenderingPackages` (bound to this site's config) — consumed by Task 11's routes and Task 13's cron job.

- [ ] **Step 1: Implement the wrapper**

Create `apps/menhealth/lib/social/generate-ad-video-package.ts`:

```ts
import { env } from "@/env";
import { aiClient } from "@/lib/ai/client";
import { db } from "@/lib/db/prisma";
import { createAdVideoPackageGenerator } from "@menhealth/core-social";
import { FORBIDDEN_PATTERNS, HIGH_RISK_TOPIC_KEYWORDS } from "./platform-rules";
import { SITE_NAME } from "@/lib/site-brand";
import { synthesizeElevenLabsVoiceover } from "./providers/elevenlabs";
import {
  startCreatomateRender,
  getCreatomateRenderStatus,
} from "./providers/creatomate";
import { uploadBufferToBlob, mirrorUrlToBlob } from "./providers/blob";

export type { Result } from "@menhealth/core-social";

const DISCLAIMER_LINE = "Educational only. Not medical advice.";

const OFFER_COPY =
  "Five AI-summarized men's health videos a week, each with checked claims " +
  "and a practical takeaway — free, unsubscribe anytime.";

function buildAdUtmUrl(): string {
  const url = new URL("/", env.NEXT_PUBLIC_APP_URL);
  url.searchParams.set("utm_source", "video_ad");
  url.searchParams.set("utm_medium", "video");
  url.searchParams.set("utm_campaign", "site_promo");
  return url.toString();
}

export const { generateAdVideoPackage, pollRenderingPackages } =
  createAdVideoPackageGenerator({
    db,
    aiClient,
    aiConfigured: Boolean(env.GROQ_API_KEY),
    siteName: SITE_NAME,
    offerCopy: OFFER_COPY,
    disclaimerLine: DISCLAIMER_LINE,
    utmUrl: buildAdUtmUrl(),
    forbiddenPatterns: FORBIDDEN_PATTERNS,
    highRiskKeywords: HIGH_RISK_TOPIC_KEYWORDS,
    synthesizeVoiceover: (script) =>
      synthesizeElevenLabsVoiceover(
        env.ELEVENLABS_API_KEY,
        env.ELEVENLABS_VOICE_ID,
        script,
      ),
    startRender: (input) =>
      startCreatomateRender(
        env.CREATOMATE_API_KEY,
        env.CREATOMATE_TEMPLATE_ID,
        input,
      ),
    getRenderStatus: (renderId) =>
      getCreatomateRenderStatus(env.CREATOMATE_API_KEY, renderId),
    uploadBuffer: (pathname, data, contentType) =>
      uploadBufferToBlob(env.BLOB_READ_WRITE_TOKEN, pathname, data, contentType),
    mirrorUrlToBlob: (pathname, sourceUrl) =>
      mirrorUrlToBlob(env.BLOB_READ_WRITE_TOKEN, pathname, sourceUrl),
  });
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter menhealth typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/menhealth/lib/social/generate-ad-video-package.ts
git commit -m "feat(social): wire up the ad video package generator for this site"
```

---

### Task 11: Generate / approve / reject API routes

**Files:**
- Create: `apps/menhealth/app/api/social/video-ads/generate/route.ts`
- Create: `apps/menhealth/app/api/social/video-ads/[id]/approve/route.ts`
- Create: `apps/menhealth/app/api/social/video-ads/[id]/reject/route.ts`
- Test: `apps/menhealth/__tests__/social-video-ads-routes.test.ts`

**Interfaces:**
- Consumes: `generateAdVideoPackage`, `pollRenderingPackages` (Task 10), `ApproveAdVideoPackageSchema`, `RejectAdVideoPackageSchema` (Task 3/8), `auth` (existing `@/lib/auth`), `db` (existing).

- [ ] **Step 1: Write the failing tests**

Create `apps/menhealth/__tests__/social-video-ads-routes.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as approveRoute } from "@/app/api/social/video-ads/[id]/approve/route";
import { POST as rejectRoute } from "@/app/api/social/video-ads/[id]/reject/route";
import { POST as generateRoute } from "@/app/api/social/video-ads/generate/route";

const { mockAuth, mockFindUnique, mockUpdate, mockGenerate } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockGenerate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

vi.mock("@/lib/db/prisma", () => ({
  db: { adVideoPackage: { findUnique: mockFindUnique, update: mockUpdate } },
}));

vi.mock("@/lib/social/generate-ad-video-package", () => ({
  generateAdVideoPackage: mockGenerate,
}));

const ADMIN_SESSION = { user: { email: "admin@test.com", isAdmin: true } };

function postRequest(path: string) {
  return new NextRequest(`https://example.com${path}`, { method: "POST" });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(ADMIN_SESSION);
});

describe("approve route", () => {
  it("rejects unauthenticated requests", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await approveRoute(postRequest("/api/social/video-ads/pkg_1/approve"), {
      params: Promise.resolve({ id: "pkg_1" }),
    });

    expect(res.status).toBe(401);
  });

  it("404s when the package does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await approveRoute(postRequest("/api/social/video-ads/pkg_1/approve"), {
      params: Promise.resolve({ id: "pkg_1" }),
    });

    expect(res.status).toBe(404);
  });

  it("409s when the package is not PENDING_REVIEW", async () => {
    mockFindUnique.mockResolvedValue({ id: "pkg_1", status: "RENDERING" });

    const res = await approveRoute(postRequest("/api/social/video-ads/pkg_1/approve"), {
      params: Promise.resolve({ id: "pkg_1" }),
    });

    expect(res.status).toBe(409);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("approves a PENDING_REVIEW package and records approvedBy", async () => {
    mockFindUnique.mockResolvedValue({ id: "pkg_1", status: "PENDING_REVIEW" });
    mockUpdate.mockResolvedValue({ id: "pkg_1", status: "APPROVED" });

    const res = await approveRoute(postRequest("/api/social/video-ads/pkg_1/approve"), {
      params: Promise.resolve({ id: "pkg_1" }),
    });

    expect(res.status).toBe(200);
    const updateArgs = mockUpdate.mock.calls[0]![0] as {
      data: { status: string; approvedBy: string };
    };
    expect(updateArgs.data.status).toBe("APPROVED");
    expect(updateArgs.data.approvedBy).toBe("admin@test.com");
  });
});

describe("reject route", () => {
  it("409s when the package is not PENDING_REVIEW", async () => {
    mockFindUnique.mockResolvedValue({ id: "pkg_1", status: "APPROVED" });

    const res = await rejectRoute(postRequest("/api/social/video-ads/pkg_1/reject"), {
      params: Promise.resolve({ id: "pkg_1" }),
    });

    expect(res.status).toBe(409);
  });

  it("rejects a PENDING_REVIEW package", async () => {
    mockFindUnique.mockResolvedValue({ id: "pkg_1", status: "PENDING_REVIEW" });
    mockUpdate.mockResolvedValue({ id: "pkg_1", status: "REJECTED" });

    const res = await rejectRoute(postRequest("/api/social/video-ads/pkg_1/reject"), {
      params: Promise.resolve({ id: "pkg_1" }),
    });

    expect(res.status).toBe(200);
    const updateArgs = mockUpdate.mock.calls[0]![0] as { data: { status: string } };
    expect(updateArgs.data.status).toBe("REJECTED");
  });
});

describe("generate route", () => {
  it("rejects unauthenticated requests", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await generateRoute(postRequest("/api/social/video-ads/generate"));

    expect(res.status).toBe(401);
  });

  it("returns 201 with the new packageId on success", async () => {
    mockGenerate.mockResolvedValue({ ok: true, value: { packageId: "pkg_1" } });

    const res = await generateRoute(postRequest("/api/social/video-ads/generate"));

    expect(res.status).toBe(201);
    const body = (await res.json()) as { packageId: string };
    expect(body.packageId).toBe("pkg_1");
  });

  it("returns 500 with the error message on failure", async () => {
    mockGenerate.mockResolvedValue({
      ok: false,
      error: new Error("AI client is not configured."),
    });

    const res = await generateRoute(postRequest("/api/social/video-ads/generate"));

    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter menhealth exec vitest run social-video-ads-routes`
Expected: FAIL — the route files don't exist yet.

- [ ] **Step 3: Implement the generate route**

Create `apps/menhealth/app/api/social/video-ads/generate/route.ts`:

```ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateAdVideoPackage } from "@/lib/social/generate-ad-video-package";

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await generateAdVideoPackage();

  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json(result.value, { status: 201 });
}
```

- [ ] **Step 4: Implement the approve route**

Create `apps/menhealth/app/api/social/video-ads/[id]/approve/route.ts`:

```ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { ApproveAdVideoPackageSchema } from "@/lib/social/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = ApproveAdVideoPackageSchema.safeParse({ packageId: id });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid package ID" }, { status: 422 });
  }

  const pkg = await db.adVideoPackage.findUnique({ where: { id } });
  if (!pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }
  if (pkg.status !== "PENDING_REVIEW") {
    return NextResponse.json(
      { error: "Package must be in PENDING_REVIEW status to approve" },
      { status: 409 },
    );
  }

  const updated = await db.adVideoPackage.update({
    where: { id },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy: session?.user?.email ?? "unknown",
    },
  });

  return NextResponse.json({ packageId: updated.id, status: updated.status });
}
```

- [ ] **Step 5: Implement the reject route**

Create `apps/menhealth/app/api/social/video-ads/[id]/reject/route.ts`:

```ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { RejectAdVideoPackageSchema } from "@/lib/social/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = RejectAdVideoPackageSchema.safeParse({ packageId: id });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid package ID" }, { status: 422 });
  }

  const pkg = await db.adVideoPackage.findUnique({ where: { id } });
  if (!pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }
  if (pkg.status !== "PENDING_REVIEW") {
    return NextResponse.json(
      { error: "Package must be in PENDING_REVIEW status to reject" },
      { status: 409 },
    );
  }

  const updated = await db.adVideoPackage.update({
    where: { id },
    data: { status: "REJECTED" },
  });

  return NextResponse.json({ packageId: updated.id, status: updated.status });
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter menhealth exec vitest run social-video-ads-routes`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/menhealth/app/api/social/video-ads apps/menhealth/__tests__/social-video-ads-routes.test.ts
git commit -m "feat(social): add generate/approve/reject routes for ad video packages"
```

---

### Task 12: Download route (zip)

**Files:**
- Create: `apps/menhealth/app/api/social/video-ads/[id]/download/route.ts`
- Test: `apps/menhealth/__tests__/social-video-ads-download.test.ts`
- Modify: `apps/menhealth/package.json` (add `jszip`)

**Interfaces:**
- Consumes: `db.adVideoPackage.findUnique` (existing), `auth` (existing).
- Produces: `GET` handler streaming a zip with `landscape-1920x1080.mp4`, `vertical-1080x1920.mp4`, `square-1080x1080.mp4`, `thumbnail.jpg`, `subtitles.srt`, `publishing_copy.txt`.

- [ ] **Step 1: Add the `jszip` dependency**

Run: `pnpm --filter menhealth add jszip`
Expected: `jszip` added to `apps/menhealth/package.json` dependencies and the lockfile updated.

- [ ] **Step 2: Write the failing tests**

Create `apps/menhealth/__tests__/social-video-ads-download.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import JSZip from "jszip";
import { GET as downloadRoute } from "@/app/api/social/video-ads/[id]/download/route";

const { mockAuth, mockFindUnique } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db/prisma", () => ({
  db: { adVideoPackage: { findUnique: mockFindUnique } },
}));

const ADMIN_SESSION = { user: { email: "admin@test.com", isAdmin: true } };

const APPROVED_PACKAGE = {
  id: "pkg_1",
  status: "APPROVED",
  landscapeUrl: "https://blob.example.com/landscape.mp4",
  verticalUrl: "https://blob.example.com/vertical.mp4",
  squareUrl: "https://blob.example.com/square.mp4",
  thumbnailUrl: "https://blob.example.com/thumbnail.jpg",
  subtitleUrl: "https://blob.example.com/subtitles.srt",
  caption: "Check out MenHealth Digest.",
  hashtags: ["#MensHealth"],
  disclaimerLine: "Educational only. Not medical advice.",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(ADMIN_SESSION);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode("fake-bytes").buffer,
    }),
  );
});

function getRequest(id: string) {
  return new NextRequest(
    `https://example.com/api/social/video-ads/${id}/download`,
  );
}

describe("download route", () => {
  it("404s when the package is not APPROVED", async () => {
    mockFindUnique.mockResolvedValue({ ...APPROVED_PACKAGE, status: "PENDING_REVIEW" });

    const res = await downloadRoute(getRequest("pkg_1"), {
      params: Promise.resolve({ id: "pkg_1" }),
    });

    expect(res.status).toBe(404);
  });

  it("streams a zip with all five expected files for an APPROVED package", async () => {
    mockFindUnique.mockResolvedValue(APPROVED_PACKAGE);

    const res = await downloadRoute(getRequest("pkg_1"), {
      params: Promise.resolve({ id: "pkg_1" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/zip");

    const buffer = Buffer.from(await res.arrayBuffer());
    const zip = await JSZip.loadAsync(buffer);
    expect(Object.keys(zip.files).sort()).toEqual(
      [
        "landscape-1920x1080.mp4",
        "vertical-1080x1920.mp4",
        "square-1080x1080.mp4",
        "thumbnail.jpg",
        "subtitles.srt",
        "publishing_copy.txt",
      ].sort(),
    );
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter menhealth exec vitest run social-video-ads-download`
Expected: FAIL — the route file doesn't exist yet.

- [ ] **Step 4: Implement the download route**

Create `apps/menhealth/app/api/social/video-ads/[id]/download/route.ts`:

```ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";

async function fetchAsBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch asset from ${url}: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const pkg = await db.adVideoPackage.findUnique({ where: { id } });

  if (!pkg || pkg.status !== "APPROVED") {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const [landscape, vertical, square, thumbnail, subtitles] = await Promise.all([
    fetchAsBuffer(pkg.landscapeUrl!),
    fetchAsBuffer(pkg.verticalUrl!),
    fetchAsBuffer(pkg.squareUrl!),
    fetchAsBuffer(pkg.thumbnailUrl!),
    fetchAsBuffer(pkg.subtitleUrl!),
  ]);

  const zip = new JSZip();
  zip.file("landscape-1920x1080.mp4", landscape);
  zip.file("vertical-1080x1920.mp4", vertical);
  zip.file("square-1080x1080.mp4", square);
  zip.file("thumbnail.jpg", thumbnail);
  zip.file("subtitles.srt", subtitles);
  zip.file(
    "publishing_copy.txt",
    [pkg.caption, "", pkg.hashtags.join(" "), "", pkg.disclaimerLine].join("\n"),
  );

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  return new NextResponse(zipBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="ad-video-package-${id}.zip"`,
    },
  });
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter menhealth exec vitest run social-video-ads-download`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/menhealth/app/api/social/video-ads/[id]/download apps/menhealth/__tests__/social-video-ads-download.test.ts apps/menhealth/package.json pnpm-lock.yaml
git commit -m "feat(social): add ad video package download route"
```

---

### Task 13: Poll cron job

**Files:**
- Create: `apps/menhealth/jobs/poll-ad-video-renders.ts`
- Create: `apps/menhealth/app/api/cron/poll-ad-video-renders/route.ts`

**Interfaces:**
- Consumes: `pollRenderingPackages` (Task 10), `env.CRON_SECRET` (existing).
- Produces: `pollAdVideoRenders(): Promise<{ checked: number; completed: number; failed: number }>`.

No dedicated unit test for this task — it's a 5-line pass-through to `pollRenderingPackages`, which already has full coverage from Task 7's tests, matching how `apps/menhealth/jobs/publish-scheduled-social.ts`'s sibling cron route (`api/cron/publish-scheduled-social/route.ts`) has no test file of its own either.

- [ ] **Step 1: Implement the job**

Create `apps/menhealth/jobs/poll-ad-video-renders.ts`:

```ts
import { pollRenderingPackages } from "@/lib/social/generate-ad-video-package";

export async function pollAdVideoRenders(): Promise<{
  checked: number;
  completed: number;
  failed: number;
}> {
  const result = await pollRenderingPackages();
  if (!result.ok) {
    throw result.error;
  }
  return result.value;
}
```

- [ ] **Step 2: Implement the cron route**

Create `apps/menhealth/app/api/cron/poll-ad-video-renders/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { pollAdVideoRenders } from "@/jobs/poll-ad-video-renders";
import { env } from "@/env";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await pollAdVideoRenders();
  return NextResponse.json(result);
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter menhealth typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/menhealth/jobs/poll-ad-video-renders.ts apps/menhealth/app/api/cron/poll-ad-video-renders
git commit -m "feat(social): add poll-ad-video-renders cron job"
```

Remember to schedule this route (e.g. every 1-2 minutes) at the hosting layer, the same place the other cron routes are scheduled — this is outside the repo.

---

### Task 14: Admin UI — list + generate pages

**Files:**
- Create: `apps/menhealth/app/admin/(protected)/social/video-ads/page.tsx`
- Create: `apps/menhealth/app/admin/(protected)/social/video-ads/generate/page.tsx`
- Create: `apps/menhealth/app/admin/(protected)/social/video-ads/generate/GenerateButton.tsx`

**Interfaces:**
- Consumes: `db.adVideoPackage.findMany` (existing), `POST /api/social/video-ads/generate` (Task 11).

- [ ] **Step 1: Implement the list page**

Create `apps/menhealth/app/admin/(protected)/social/video-ads/page.tsx`:

```tsx
import { db } from "@/lib/db/prisma";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  RENDERING: "bg-indigo-100 text-indigo-800",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
  FAILED: "bg-red-200 text-red-900",
};

export default async function AdVideoPackagesPage() {
  const packages = await db.adVideoPackage.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ad video packages</h1>
        <Link
          href="/admin/social/video-ads/generate"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Generate ad package
        </Link>
      </div>

      {packages.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <p className="text-gray-500">No ad video packages yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Caption
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {packages.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-gray-50">
                  <td className="max-w-md px-4 py-3">
                    <Link
                      href={`/admin/social/video-ads/${pkg.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      <span className="line-clamp-2">{pkg.caption}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[pkg.status] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {pkg.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                    {new Date(pkg.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement the generate button**

Create `apps/menhealth/app/admin/(protected)/social/video-ads/generate/GenerateButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/social/video-ads/generate", { method: "POST" });
      const data = (await res.json()) as { packageId?: string; error?: string };
      if (!res.ok || !data.packageId) {
        setError(data.error ?? "Request failed");
        return;
      }
      router.push(`/admin/social/video-ads/${data.packageId}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Generating…" : "Generate ad package"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Implement the generate page**

Create `apps/menhealth/app/admin/(protected)/social/video-ads/generate/page.tsx`:

```tsx
import GenerateButton from "./GenerateButton";

export default function GenerateAdVideoPackagePage() {
  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Generate ad package</h1>
      <p className="mb-6 text-sm text-gray-500">
        Generates a site-wide promo script, synthesizes a voiceover, and
        starts a render for landscape, vertical, and square video files plus
        a thumbnail and subtitles. Rendering typically takes 10 seconds to 2
        minutes — you&apos;ll land on the package detail page once it starts.
      </p>
      <GenerateButton />
    </div>
  );
}
```

- [ ] **Step 4: Manually verify in the browser**

Run: `pnpm --filter menhealth dev`, sign in as an admin, visit `/admin/social/video-ads`, click "Generate ad package," confirm it redirects to the new package's detail page (which won't render meaningfully until Task 15 exists — that's expected at this point).

- [ ] **Step 5: Commit**

```bash
git add "apps/menhealth/app/admin/(protected)/social/video-ads/page.tsx" "apps/menhealth/app/admin/(protected)/social/video-ads/generate"
git commit -m "feat(social): add ad video package list and generate admin pages"
```

---

### Task 15: Admin UI — detail page + actions

**Files:**
- Create: `apps/menhealth/app/admin/(protected)/social/video-ads/[id]/page.tsx`
- Create: `apps/menhealth/app/admin/(protected)/social/video-ads/[id]/VideoAdPackageActions.tsx`

**Interfaces:**
- Consumes: `db.adVideoPackage.findUnique` (existing), `POST /api/social/video-ads/[id]/{approve,reject}` (Task 11), `GET /api/social/video-ads/[id]/download` (Task 12), `POST /api/social/video-ads/generate` (Task 11).

- [ ] **Step 1: Implement the actions component**

Create `apps/menhealth/app/admin/(protected)/social/video-ads/[id]/VideoAdPackageActions.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  packageId: string;
  status: string;
};

export default function VideoAdPackageActions({ packageId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function callAction(action: "approve" | "reject") {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/social/video-ads/${packageId}/${action}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Request failed");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  async function handleGenerateNew() {
    setLoading("generate");
    setError(null);
    try {
      const res = await fetch("/api/social/video-ads/generate", { method: "POST" });
      const data = (await res.json()) as { packageId?: string; error?: string };
      if (!res.ok || !data.packageId) {
        setError(data.error ?? "Request failed");
        return;
      }
      router.push(`/admin/social/video-ads/${data.packageId}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  const isReviewable = status === "PENDING_REVIEW";
  const isApproved = status === "APPROVED";

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {isReviewable && (
        <div className="flex gap-2">
          <button
            onClick={() => callAction("approve")}
            disabled={loading !== null}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading === "approve" ? "Approving…" : "Approve"}
          </button>
          <button
            onClick={() => callAction("reject")}
            disabled={loading !== null}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {loading === "reject" ? "Rejecting…" : "Reject"}
          </button>
        </div>
      )}

      {isApproved && (
        <a
          href={`/api/social/video-ads/${packageId}/download`}
          className="inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Download package (.zip)
        </a>
      )}

      <div>
        <button
          onClick={handleGenerateNew}
          disabled={loading !== null}
          className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading === "generate" ? "Generating…" : "Generate new package"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement the detail page**

Create `apps/menhealth/app/admin/(protected)/social/video-ads/[id]/page.tsx`:

```tsx
import { db } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import VideoAdPackageActions from "./VideoAdPackageActions";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  RENDERING: "bg-indigo-100 text-indigo-800",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
  FAILED: "bg-red-200 text-red-900",
};

export default async function AdVideoPackageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pkg = await db.adVideoPackage.findUnique({ where: { id } });

  if (!pkg) notFound();

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/social/video-ads"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Ad video packages
        </Link>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[pkg.status] ?? "bg-gray-100 text-gray-700"}`}
        >
          {pkg.status.replace("_", " ")}
        </span>
      </div>

      {pkg.status === "FAILED" && pkg.errorMessage && (
        <p className="mb-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {pkg.errorMessage}
        </p>
      )}

      <div className="space-y-6">
        <section className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Script</h2>
          <pre className="text-sm whitespace-pre-wrap text-gray-900">{pkg.script}</pre>
        </section>

        <section className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Caption</h2>
          <pre className="text-sm whitespace-pre-wrap text-gray-900">{pkg.caption}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            {pkg.hashtags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        {(pkg.landscapeUrl || pkg.verticalUrl || pkg.squareUrl) && (
          <section className="rounded-lg border bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Renders</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {pkg.landscapeUrl && (
                <div>
                  <p className="mb-1 text-xs text-gray-500">Landscape (1920×1080)</p>
                  <video src={pkg.landscapeUrl} controls className="w-full rounded" />
                </div>
              )}
              {pkg.verticalUrl && (
                <div>
                  <p className="mb-1 text-xs text-gray-500">Vertical (1080×1920)</p>
                  <video src={pkg.verticalUrl} controls className="w-full rounded" />
                </div>
              )}
              {pkg.squareUrl && (
                <div>
                  <p className="mb-1 text-xs text-gray-500">Square (1080×1080)</p>
                  <video src={pkg.squareUrl} controls className="w-full rounded" />
                </div>
              )}
            </div>
          </section>
        )}

        {pkg.thumbnailUrl && (
          <section className="rounded-lg border bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Thumbnail</h2>
            {/* eslint-disable-next-line @next/next/no-img-element -- external Blob URL, not a local/optimizable asset */}
            <img src={pkg.thumbnailUrl} alt="Ad thumbnail" className="max-w-xs rounded" />
          </section>
        )}

        <section className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Actions</h2>
          <VideoAdPackageActions packageId={pkg.id} status={pkg.status} />
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Manually verify in the browser**

With `pnpm --filter menhealth dev` running: generate a package, confirm the detail page shows script/caption/hashtags; since real Creatomate/ElevenLabs credentials likely aren't configured locally, confirm the package lands in `FAILED` with a visible `errorMessage` rather than crashing the page, and that a `PENDING_REVIEW` row seeded directly via Prisma Studio shows Approve/Reject, and an `APPROVED` row shows the Download button and that clicking it downloads a `.zip`.

- [ ] **Step 4: Commit**

```bash
git add "apps/menhealth/app/admin/(protected)/social/video-ads/[id]"
git commit -m "feat(social): add ad video package detail page and actions"
```

---

### Task 16: Admin nav entry

**Files:**
- Modify: `apps/menhealth/app/admin/(protected)/layout.tsx`

**Interfaces:**
- Consumes: none new — pure nav wiring.

- [ ] **Step 1: Add the nav link**

In `apps/menhealth/app/admin/(protected)/layout.tsx`, in the `navGroups` array's `'Audience'` section, add a new item after `'Social schedule'`:

```ts
    {
      section: 'Audience',
      items: [
        { label: 'Subscribers', href: '/admin/subscribers' },
        { label: 'Social drafts', href: '/admin/social/drafts' },
        { label: 'Social schedule', href: '/admin/social/calendar' },
        { label: 'Ad video packages', href: '/admin/social/video-ads' },
      ],
    },
```

- [ ] **Step 2: Manually verify in the browser**

With `pnpm --filter menhealth dev` running, confirm "Ad video packages" appears in the sidebar under "Audience" and links to `/admin/social/video-ads`.

- [ ] **Step 3: Run the full test suite and typecheck one more time**

Run: `pnpm --filter menhealth typecheck && pnpm --filter menhealth test && pnpm --filter @menhealth/core-social typecheck`
Expected: PASS across the board.

- [ ] **Step 4: Commit**

```bash
git add "apps/menhealth/app/admin/(protected)/layout.tsx"
git commit -m "feat(social): add Ad video packages nav link"
```
