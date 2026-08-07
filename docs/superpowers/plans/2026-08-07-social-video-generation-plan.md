# Social Draft Video Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin generate one 9:16 vertical video from an existing TikTok/YouTube Community social draft's own hook+script, store the resulting URL directly on that `SocialPost` row, and review it inline in the existing draft page — no new entity, no new approval lifecycle.

**Architecture:** A new `apps/menhealth/lib/social/generate-social-video.ts` service orchestrates four steps — one small AI call that turns the draft's `hook`+`script` into `{ narration, captionChunks }`, a compliance check reusing the existing `checkForbiddenPatterns` gate, OpenAI TTS narration synthesis, and a self-contained ffmpeg slideshow renderer — then uploads the result to Vercel Blob via the existing `uploadToBlob()` helper. A new `POST /api/social/drafts/[id]/video` route drives it and persists `videoUrl`/`videoStatus`/`videoError` on `SocialPost`. The whole feature lives in `apps/menhealth` only; nothing is added to the shared `packages/core-social` package.

**Tech Stack:** Next.js Route Handlers (Node runtime), Prisma/PostgreSQL, Zod, Vitest, `aiClient` (`packages/core-ai`), OpenAI TTS REST endpoint (`fetch`, no SDK), `ffmpeg-static` + `node:child_process` for rendering, existing `uploadToBlob()` (Vercel Blob).

## Global Constraints

- Never regenerate caption, hashtags, UTM link, or promotional copy — the AI call only transforms `hook`+`script` into video instructions (spec §2, §3).
- One AI call, one Zod-validated output shape (`VideoPlanSchema`) — no planner/writer/director abstractions (spec §3).
- Reuse the existing `checkForbiddenPatterns` gate from `apps/menhealth/lib/social/platform-rules.ts` — do not build a new compliance framework, and rendering must never start if the check fails (spec §4, §12).
- Exactly one canonical output format: `1080x1920`, 9:16, MP4 — no other aspect ratios (spec §5).
- `generateSocialVideo()` is the only public seam; all provider-specific code (TTS call, ffmpeg invocation) stays behind it (spec §8).
- Prefer synchronous request/response — the route waits for generation to finish and returns the final `videoUrl` in one round trip; no queue, cron, or extra entity (spec §9).
- Minimal new DB state: `videoUrl`, `videoStatus`, `videoError` only — no `providerRenderId`, since this provider is synchronous (spec §9).
- Video generation does not gate on or change `SocialPost.status` — the existing approve/reject/publish lifecycle is untouched (spec §7, §11).
- `Result<T, E>` return convention for domain functions (never throw across the service boundary) — matches `AGENTS.md` and `packages/core-social/src/generate-social-post.ts`.
- Small, single-concern files; named constants, not magic strings/numbers.

---

## Context you need before starting

- `SocialPost` (full model at `apps/menhealth/prisma/schema.prisma:430-453`) has `hook`, `script`, `caption`, `hashtags`, `platform` (`Platform` enum: `YOUTUBE_COMMUNITY | TIKTOK | REDDIT | X`), `status` (`PostStatus` enum), and no video fields yet.
- There is **no `prisma/migrations` directory** in this repo — schema changes are applied by the maintainer via `prisma db push` as a separate deploy-time step. Your job in this plan stops at `prisma generate` (schema-only, no DB connection needed) — do not attempt `prisma db push` or `prisma migrate`.
- `apps/menhealth/lib/social/platform-rules.ts` already exports zero-arg wrappers `checkForbiddenPatterns(text)` and `detectHighRiskTopic(text)` bound to this site's `FORBIDDEN_PATTERNS`/`HIGH_RISK_TOPIC_KEYWORDS` (from `site.config.ts`). Use these — do not import `@menhealth/core-compliance` directly.
- `apps/menhealth/lib/social/blob-storage.ts` exports `uploadToBlob({ pathname, body, contentType, token }): Promise<string>` — reuse as-is.
- `apps/menhealth/lib/ai/client.ts` exports `aiClient` (`{ anthropic: { messages: { create(...) } }, defaultModel }`) — the existing structured-output pattern (see `packages/core-social/src/generate-social-post.ts:126-153`) is: call `aiClient.anthropic.messages.create()`, find the text block, `JSON.parse` it, validate with a Zod schema via `.safeParse()`, and return a `Result`.
- Test aliasing: `apps/menhealth/vitest.config.ts` already aliases `@/env`, `@/lib/db/prisma`, and `@/lib/ai/client` to stub modules under `__tests__/__mocks__/`. The env stub (`__tests__/__mocks__/env.ts`) already includes a valid `OPENAI_API_KEY` and `BLOB_READ_WRITE_TOKEN`, so no test-mock changes are needed for those. Individual test files override the DB/AI mocks further with `vi.mock(...)` + `vi.hoisted(...)` where they need specific return values — follow the pattern in `apps/menhealth/__tests__/social-generate-post.test.ts` and `apps/menhealth/__tests__/social-video-ads-routes.test.ts`.
- Known pre-existing issue on this branch (not in scope, do not fix): `apps/menhealth/lib/social/generate-ad-video-package.ts` imports `createAdVideoPackageGenerator` from `@menhealth/core-social`, and `apps/menhealth/lib/social/validation.ts` re-exports `AdVideoPackageAiOutputSchema`/`GenerateAdVideoPackageSchema`/`WordTimestampSchema`/`WordTimestampsSchema` from the same package — none of these exist in `packages/core-social/src`. This is an unrelated broken import chain already on `main`/this branch. It does not block this plan (none of the new code touches it), but `pnpm --filter menhealth typecheck` may already fail before you start for reasons unrelated to your changes — confirm that by running it once before Task 1 so you know your baseline.

---

### Task 1: Extend `SocialPost` with video fields

**Files:**
- Modify: `apps/menhealth/prisma/schema.prisma`

**Interfaces:**
- Produces: Prisma `VideoGenerationStatus` enum (`GENERATING | READY | FAILED`) and `SocialPost.videoUrl: String?`, `SocialPost.videoStatus: VideoGenerationStatus?`, `SocialPost.videoError: String?`, consumed by every later task.

- [ ] **Step 1: Add the enum and fields**

In `apps/menhealth/prisma/schema.prisma`, add the new enum immediately after the existing `enum AdPackageStatus { ... }` block (around line 424), and add the three fields to `model SocialPost` right after `platformUrl String?` (around line 449):

```prisma
enum VideoGenerationStatus {
  GENERATING
  READY
  FAILED
}
```

```prisma
model SocialPost {
  id             String                 @id @default(cuid())
  platform       Platform
  status         PostStatus             @default(DRAFT)
  sourceType     SourceType
  sourceId       String
  hook           String
  script         String
  caption        String
  hashtags       String[]
  utmUrl         String
  riskLevel      RiskLevel              @default(LOW)
  requiresReview Boolean                @default(true)
  scheduledAt    DateTime?
  publishedAt    DateTime?
  platformPostId String?
  platformUrl    String?
  videoUrl       String?
  videoStatus    VideoGenerationStatus?
  videoError     String?
  templateId     String?
  template       SocialTemplate?        @relation(fields: [templateId], references: [id])
  attempts       SocialPublishAttempt[]
  metrics        SocialMetric[]
  createdAt      DateTime               @default(now())
  updatedAt      DateTime               @updatedAt
}
```

- [ ] **Step 2: Regenerate the Prisma client**

Run: `pnpm --filter menhealth exec prisma generate`
Expected: `Generated Prisma Client` with no errors. This only reads the schema file — it does not require a database connection.

- [ ] **Step 3: Commit**

```bash
git add apps/menhealth/prisma/schema.prisma
git commit -m "feat(social): add video fields to SocialPost"
```

---

### Task 2: Platform capability helper

**Files:**
- Modify: `apps/menhealth/lib/social/platform-rules.ts`
- Test: `apps/menhealth/__tests__/social-platform-rules.test.ts`

**Interfaces:**
- Consumes: `Platform` type from `@prisma/client`.
- Produces: `VIDEO_CAPABLE_PLATFORMS: readonly Platform[]` and `supportsVideoGeneration(platform: Platform): boolean`, consumed by Task 7 (route) and Task 8 (UI).

- [ ] **Step 1: Write the failing test**

Add to `apps/menhealth/__tests__/social-platform-rules.test.ts` (append; this file already exists and tests forbidden-pattern/constraint logic — match its existing `describe`/`it` style):

```typescript
import { supportsVideoGeneration } from "@/lib/social/platform-rules";

describe("supportsVideoGeneration", () => {
  it("returns true for TIKTOK", () => {
    expect(supportsVideoGeneration("TIKTOK")).toBe(true);
  });

  it("returns true for YOUTUBE_COMMUNITY", () => {
    expect(supportsVideoGeneration("YOUTUBE_COMMUNITY")).toBe(true);
  });

  it("returns false for REDDIT and X", () => {
    expect(supportsVideoGeneration("REDDIT")).toBe(false);
    expect(supportsVideoGeneration("X")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter menhealth exec vitest run social-platform-rules -t supportsVideoGeneration`
Expected: FAIL — `supportsVideoGeneration` is not exported.

- [ ] **Step 3: Implement**

In `apps/menhealth/lib/social/platform-rules.ts`, add near the bottom (after the existing `detectHighRiskTopic` export):

```typescript
import type { Platform } from "@prisma/client";

export const VIDEO_CAPABLE_PLATFORMS: readonly Platform[] = [
  "TIKTOK",
  "YOUTUBE_COMMUNITY",
];

/**
 * Both platforms publish a 9:16 video-shaped asset — TikTok directly,
 * YouTube Community by the admin uploading it as a Short. Reddit and X
 * stay text-only.
 */
export function supportsVideoGeneration(platform: Platform): boolean {
  return VIDEO_CAPABLE_PLATFORMS.includes(platform);
}
```

(Add the `import type { Platform } from "@prisma/client";` line to the existing import block at the top of the file, not as a duplicate second import statement.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter menhealth exec vitest run social-platform-rules -t supportsVideoGeneration`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/menhealth/lib/social/platform-rules.ts apps/menhealth/__tests__/social-platform-rules.test.ts
git commit -m "feat(social): add supportsVideoGeneration platform helper"
```

---

### Task 3: AI video plan step

**Files:**
- Create: `apps/menhealth/lib/social/video-plan.ts`
- Test: `apps/menhealth/__tests__/social-video-plan.test.ts`

**Interfaces:**
- Consumes: `aiClient` from `@/lib/ai/client` (shape: `{ anthropic: { messages: { create(input): Promise<{content: Array<{type:'text', text:string}>}> } }, defaultModel: string }`).
- Produces: `VideoPlanSchema` (Zod), `type VideoPlan = z.infer<typeof VideoPlanSchema>`, `createVideoPlan(input: { hook: string; script: string; platform: Platform }): Promise<Result<VideoPlan>>` (using `Result` re-exported from `@menhealth/core-social`), consumed by Task 6.

- [ ] **Step 1: Write the failing test**

Create `apps/menhealth/__tests__/social-video-plan.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAiCreate } = vi.hoisted(() => ({
  mockAiCreate: vi.fn(),
}));

vi.mock("@/lib/ai/client", () => ({
  aiClient: {
    defaultModel: "test-model",
    anthropic: { messages: { create: mockAiCreate } },
  },
}));

import { createVideoPlan } from "@/lib/social/video-plan";

function aiJsonResponse(body: object) {
  return { content: [{ type: "text", text: JSON.stringify(body) }] };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createVideoPlan", () => {
  it("returns a validated plan from a well-formed AI response", async () => {
    mockAiCreate.mockResolvedValue(
      aiJsonResponse({
        narration:
          "Creatine is one of the most studied supplements for strength training. Research consistently links it to modest gains in muscle strength.",
        captionChunks: [
          "Creatine: one of the most studied supplements",
          "Linked to modest strength gains",
          "Always talk to a doctor before starting anything new",
        ],
      }),
    );

    const result = await createVideoPlan({
      hook: "Is creatine actually worth it?",
      script: "Creatine is one of the most studied supplements...",
      platform: "TIKTOK",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.value.captionChunks.length).toBeGreaterThan(0);
    expect(result.value.narration).toContain("Creatine");
  });

  it("fails when the AI response does not match the schema", async () => {
    mockAiCreate.mockResolvedValue(aiJsonResponse({ narration: "" }));

    const result = await createVideoPlan({
      hook: "Is creatine actually worth it?",
      script: "Creatine is one of the most studied supplements...",
      platform: "TIKTOK",
    });

    expect(result.ok).toBe(false);
  });

  it("fails when the AI response is not valid JSON", async () => {
    mockAiCreate.mockResolvedValue({
      content: [{ type: "text", text: "not json" }],
    });

    const result = await createVideoPlan({
      hook: "h",
      script: "s",
      platform: "TIKTOK",
    });

    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter menhealth exec vitest run social-video-plan`
Expected: FAIL — `@/lib/social/video-plan` does not exist.

- [ ] **Step 3: Implement**

Create `apps/menhealth/lib/social/video-plan.ts`:

```typescript
import { z } from "zod";
import type { Platform } from "@prisma/client";
import type { Result } from "@menhealth/core-social";
import { aiClient } from "@/lib/ai/client";

export const VideoPlanSchema = z.object({
  narration: z
    .string()
    .min(40)
    .max(900)
    .describe("Full spoken narration for a ~30-45 second vertical video"),
  captionChunks: z
    .array(z.string().min(1).max(100))
    .min(3)
    .max(6)
    .describe(
      "Short on-screen caption lines shown in sequence while the narration plays",
    ),
});

export type VideoPlan = z.infer<typeof VideoPlanSchema>;

export type CreateVideoPlanInput = {
  hook: string;
  script: string;
  platform: Platform;
};

function buildVideoPlanPrompt(input: CreateVideoPlanInput): string {
  return `You are turning an existing social media draft into a short vertical video.

Platform: ${input.platform}
Hook: ${input.hook}
Script: ${input.script}

Use only information contained in the hook and script above. You may rewrite
them for concise, natural spoken delivery, but you must not introduce any new:
- medical claims
- efficacy claims
- diagnoses
- dosages
- statistics
- treatment recommendations
- conclusions stronger than the supplied content

Preserve uncertainty where the source content is uncertain.

Return strict JSON matching this shape, with no other text:
{
  "narration": string, // full spoken narration, 40-900 characters
  "captionChunks": string[] // 3-6 short on-screen caption lines, each under 100 characters, in the order they should appear
}`;
}

export async function createVideoPlan(
  input: CreateVideoPlanInput,
): Promise<Result<VideoPlan>> {
  const message = await aiClient.anthropic.messages.create({
    model: aiClient.defaultModel,
    max_tokens: 800,
    messages: [{ role: "user", content: buildVideoPlanPrompt(input) }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { ok: false, error: new Error("No text block in AI response") };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    return { ok: false, error: new Error("AI response was not valid JSON") };
  }

  const validated = VideoPlanSchema.safeParse(parsed);
  if (!validated.success) {
    return {
      ok: false,
      error: new Error(
        `AI output failed validation: ${validated.error.message}`,
      ),
    };
  }

  return { ok: true, value: validated.data };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter menhealth exec vitest run social-video-plan`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/menhealth/lib/social/video-plan.ts apps/menhealth/__tests__/social-video-plan.test.ts
git commit -m "feat(social): add AI video plan step for draft-to-video generation"
```

---

### Task 4: Narration audio synthesis (OpenAI TTS)

**Files:**
- Create: `apps/menhealth/lib/social/video-narration-audio.ts`
- Test: `apps/menhealth/__tests__/social-video-narration-audio.test.ts`

**Interfaces:**
- Consumes: `env.OPENAI_API_KEY` from `@/env`.
- Produces: `synthesizeNarrationAudio(text: string): Promise<Buffer>` (throws on failure — this is a provider-boundary helper, not a `Result`-returning domain function), consumed by Task 6.

- [ ] **Step 1: Write the failing test**

Create `apps/menhealth/__tests__/social-video-narration-audio.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { synthesizeNarrationAudio } from "@/lib/social/video-narration-audio";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});

describe("synthesizeNarrationAudio", () => {
  it("returns a Buffer of the returned audio bytes", async () => {
    const fakeAudio = new Uint8Array([1, 2, 3, 4]);
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => fakeAudio.buffer,
    });

    const result = await synthesizeNarrationAudio("Hello there.");

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(Array.from(result)).toEqual([1, 2, 3, 4]);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/audio/speech",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws with the response status when the request fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "invalid api key",
    });

    await expect(synthesizeNarrationAudio("Hello there.")).rejects.toThrow(
      /401/,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter menhealth exec vitest run social-video-narration-audio`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

Create `apps/menhealth/lib/social/video-narration-audio.ts`:

```typescript
import { env } from "@/env";

const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";
const OPENAI_TTS_MODEL = "gpt-4o-mini-tts";
const DEFAULT_TTS_VOICE = "alloy";

export async function synthesizeNarrationAudio(
  narration: string,
): Promise<Buffer> {
  const response = await fetch(OPENAI_TTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_TTS_MODEL,
      voice: DEFAULT_TTS_VOICE,
      input: narration,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `OpenAI TTS request failed (${response.status}): ${details}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter menhealth exec vitest run social-video-narration-audio`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/menhealth/lib/social/video-narration-audio.ts apps/menhealth/__tests__/social-video-narration-audio.test.ts
git commit -m "feat(social): add OpenAI TTS narration synthesis for social video"
```

---

### Task 5: Vertical video renderer (ffmpeg)

**Files:**
- Modify: `apps/menhealth/package.json` (add `ffmpeg-static` dependency)
- Create: `apps/menhealth/assets/fonts/social-video-caption.ttf` (binary font asset, not application code)
- Create: `apps/menhealth/lib/social/video-render.ts`
- Test: `apps/menhealth/__tests__/social-video-render.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (pure rendering primitive).
- Produces: `renderVerticalVideo(input: { narrationAudio: Buffer; captionChunks: string[] }): Promise<Buffer>` (throws on failure), consumed by Task 6.

- [ ] **Step 1: Add the `ffmpeg-static` dependency**

Run: `pnpm --filter menhealth add ffmpeg-static`
Expected: `ffmpeg-static` and its version appear under `dependencies` in `apps/menhealth/package.json`, lockfile updated.

- [ ] **Step 2: Add a bundled caption font**

ffmpeg's `drawtext` filter needs an explicit `fontfile` — Vercel's Node serverless runtime does not guarantee any system fonts are available to the statically-linked `ffmpeg-static` binary, so a font file must ship in the repo.

Run:

```bash
mkdir -p apps/menhealth/assets/fonts
curl -L -o apps/menhealth/assets/fonts/social-video-caption.ttf \
  https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Bold.ttf
```

Verify the download actually got a font file, not an error page: `file apps/menhealth/assets/fonts/social-video-caption.ttf` should report `TrueType Font data` and the file should be well over 10KB. If that URL has moved, substitute any OFL/Apache-licensed `.ttf` you have available — the code below only needs a valid path.

- [ ] **Step 3: Write the failing test**

Create `apps/menhealth/__tests__/social-video-render.test.ts`:

```typescript
import { writeFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockExecFile } = vi.hoisted(() => ({
  mockExecFile: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFile: mockExecFile,
}));

import { renderVerticalVideo } from "@/lib/social/video-render";

beforeEach(() => {
  vi.clearAllMocks();
  // Both ffmpeg passes succeed; write a fake output file each time so the
  // renderer has something to read back.
  mockExecFile.mockImplementation(
    (
      _cmd: string,
      args: string[],
      _opts: unknown,
      callback: (err: Error | null, stdout: string, stderr: string) => void,
    ) => {
      const outputPath = args[args.length - 1] as string;
      writeFileSync(outputPath, "fake-mp4-bytes");
      callback(null, "", "");
    },
  );
});

describe("renderVerticalVideo", () => {
  it("runs two ffmpeg passes and returns the rendered buffer", async () => {
    const result = await renderVerticalVideo({
      narrationAudio: Buffer.from("fake-mp3-bytes"),
      captionChunks: ["First line", "Second line"],
    });

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe("fake-mp4-bytes");
    expect(mockExecFile).toHaveBeenCalledTimes(2);

    const firstPassArgs = mockExecFile.mock.calls[0]![1] as string[];
    expect(firstPassArgs.join(" ")).toContain("1080x1920");

    const secondPassArgs = mockExecFile.mock.calls[1]![1] as string[];
    expect(secondPassArgs).toContain("-shortest");
  });

  it("throws when ffmpeg exits with an error", async () => {
    mockExecFile.mockImplementation(
      (
        _cmd: string,
        _args: string[],
        _opts: unknown,
        callback: (err: Error | null, stdout: string, stderr: string) => void,
      ) => {
        callback(new Error("ffmpeg failed"), "", "broken pipe");
      },
    );

    await expect(
      renderVerticalVideo({
        narrationAudio: Buffer.from("fake-mp3-bytes"),
        captionChunks: ["First line"],
      }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm --filter menhealth exec vitest run social-video-render`
Expected: FAIL — module does not exist.

- [ ] **Step 5: Implement**

Create `apps/menhealth/lib/social/video-render.ts`:

```typescript
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";

const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;
const SCENE_BACKGROUND_COLORS = ["#0f172a", "#111827"];
const WORDS_PER_SECOND = 2.5;
const MIN_SCENE_SECONDS = 2.5;
const MAX_SCENE_SECONDS = 6;
const BRAND_LINE = "MenHealth Digest";
const FONT_PATH = join(
  process.cwd(),
  "assets",
  "fonts",
  "social-video-caption.ttf",
);

export type RenderVerticalVideoInput = {
  narrationAudio: Buffer;
  captionChunks: string[];
};

function sceneDurationSeconds(text: string): number {
  const words = text.trim().split(/\s+/).length;
  const estimate = words / WORDS_PER_SECOND;
  return Math.min(Math.max(estimate, MIN_SCENE_SECONDS), MAX_SCENE_SECONDS);
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg-static did not resolve a binary path"));
      return;
    }
    execFile(ffmpegPath, args, { maxBuffer: 1024 * 1024 * 32 }, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(`ffmpeg failed: ${error.message}\n${stderr}`));
        return;
      }
      resolve();
    });
  });
}

export async function renderVerticalVideo(
  input: RenderVerticalVideoInput,
): Promise<Buffer> {
  const workDir = await mkdtemp(join(tmpdir(), "social-video-"));

  try {
    const narrationPath = join(workDir, "narration.mp3");
    await writeFile(narrationPath, input.narrationAudio);

    const sceneFilterInputs: string[] = [];
    const drawTextFilters: string[] = [];
    const sceneLabels: string[] = [];

    for (const [index, chunk] of input.captionChunks.entries()) {
      const duration = sceneDurationSeconds(chunk);
      const color = SCENE_BACKGROUND_COLORS[index % SCENE_BACKGROUND_COLORS.length];

      sceneFilterInputs.push(
        "-f",
        "lavfi",
        "-i",
        `color=c=${color}:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:d=${duration}`,
      );

      const textPath = join(workDir, `scene-${index}.txt`);
      await writeFile(textPath, `${chunk}\n\n${BRAND_LINE}`, "utf8");

      const label = `v${index}`;
      sceneLabels.push(label);
      drawTextFilters.push(
        `[${index}:v]drawtext=fontfile='${FONT_PATH}':textfile='${textPath}':fontsize=64:fontcolor=white:` +
          `line_spacing=16:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.4:boxborderw=30[${label}]`,
      );
    }

    const concatFilter = `${sceneLabels.map((label) => `[${label}]`).join("")}concat=n=${sceneLabels.length}:v=1:a=0[slides]`;
    const filterComplex = [...drawTextFilters, concatFilter].join(";");

    const scenesPath = join(workDir, "scenes.mp4");
    await runFfmpeg([
      "-y",
      ...sceneFilterInputs,
      "-filter_complex",
      filterComplex,
      "-map",
      "[slides]",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-r",
      "30",
      scenesPath,
    ]);

    const outputPath = join(workDir, "output.mp4");
    await runFfmpeg([
      "-y",
      "-stream_loop",
      "-1",
      "-i",
      scenesPath,
      "-i",
      narrationPath,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-shortest",
      "-movflags",
      "+faststart",
      outputPath,
    ]);

    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter menhealth exec vitest run social-video-render`
Expected: PASS (2 tests) — the mocked `execFile` never invokes the real ffmpeg binary, so this test does not require the font file or a working ffmpeg install to pass in CI.

- [ ] **Step 7: Commit**

```bash
git add apps/menhealth/package.json pnpm-lock.yaml apps/menhealth/assets/fonts/social-video-caption.ttf apps/menhealth/lib/social/video-render.ts apps/menhealth/__tests__/social-video-render.test.ts
git commit -m "feat(social): add ffmpeg-based vertical video renderer"
```

---

### Task 6: `generateSocialVideo()` orchestrator

**Files:**
- Create: `apps/menhealth/lib/social/generate-social-video.ts`
- Test: `apps/menhealth/__tests__/social-generate-video.test.ts`

**Interfaces:**
- Consumes: `createVideoPlan` (Task 3), `synthesizeNarrationAudio` (Task 4), `renderVerticalVideo` (Task 5), `uploadToBlob` from `./blob-storage`, `checkForbiddenPatterns` from `./platform-rules`, `env` from `@/env`.
- Produces: `generateSocialVideo(input: { hook: string; script: string; platform: Platform }): Promise<Result<{ videoUrl: string }>>`, consumed by Task 7 (route).

- [ ] **Step 1: Write the failing tests**

Create `apps/menhealth/__tests__/social-generate-video.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockCreateVideoPlan,
  mockSynthesizeNarrationAudio,
  mockRenderVerticalVideo,
  mockUploadToBlob,
} = vi.hoisted(() => ({
  mockCreateVideoPlan: vi.fn(),
  mockSynthesizeNarrationAudio: vi.fn(),
  mockRenderVerticalVideo: vi.fn(),
  mockUploadToBlob: vi.fn(),
}));

vi.mock("@/lib/social/video-plan", () => ({
  createVideoPlan: mockCreateVideoPlan,
}));
vi.mock("@/lib/social/video-narration-audio", () => ({
  synthesizeNarrationAudio: mockSynthesizeNarrationAudio,
}));
vi.mock("@/lib/social/video-render", () => ({
  renderVerticalVideo: mockRenderVerticalVideo,
}));
vi.mock("@/lib/social/blob-storage", () => ({
  uploadToBlob: mockUploadToBlob,
}));

import { generateSocialVideo } from "@/lib/social/generate-social-video";

const VALID_PLAN = {
  narration:
    "Creatine is one of the most studied supplements for strength training.",
  captionChunks: ["Creatine: one of the most studied supplements"],
};

const INPUT = {
  hook: "Is creatine actually worth it?",
  script: "Creatine is one of the most studied supplements...",
  platform: "TIKTOK" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateVideoPlan.mockResolvedValue({ ok: true, value: VALID_PLAN });
  mockSynthesizeNarrationAudio.mockResolvedValue(Buffer.from("audio"));
  mockRenderVerticalVideo.mockResolvedValue(Buffer.from("video"));
  mockUploadToBlob.mockResolvedValue("https://blob.test/social-videos/1.mp4");
});

describe("generateSocialVideo", () => {
  it("returns the uploaded video URL on success", async () => {
    const result = await generateSocialVideo(INPUT);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.value.videoUrl).toBe(
      "https://blob.test/social-videos/1.mp4",
    );
    expect(mockSynthesizeNarrationAudio).toHaveBeenCalledWith(
      VALID_PLAN.narration,
    );
    expect(mockRenderVerticalVideo).toHaveBeenCalledWith({
      narrationAudio: Buffer.from("audio"),
      captionChunks: VALID_PLAN.captionChunks,
    });
  });

  it("fails without calling TTS or rendering when the plan step fails", async () => {
    mockCreateVideoPlan.mockResolvedValue({
      ok: false,
      error: new Error("AI output failed validation"),
    });

    const result = await generateSocialVideo(INPUT);

    expect(result.ok).toBe(false);
    expect(mockSynthesizeNarrationAudio).not.toHaveBeenCalled();
    expect(mockRenderVerticalVideo).not.toHaveBeenCalled();
  });

  it("fails without calling TTS or rendering when the narration violates forbidden-pattern rules", async () => {
    mockCreateVideoPlan.mockResolvedValue({
      ok: true,
      value: {
        narration: "This cures low testosterone fast.",
        captionChunks: ["This cures low testosterone fast."],
      },
    });

    const result = await generateSocialVideo(INPUT);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure result");
    expect(result.error.message).toMatch(/forbidden/i);
    expect(mockSynthesizeNarrationAudio).not.toHaveBeenCalled();
    expect(mockRenderVerticalVideo).not.toHaveBeenCalled();
  });

  it("fails when narration synthesis throws", async () => {
    mockSynthesizeNarrationAudio.mockRejectedValue(new Error("TTS down"));

    const result = await generateSocialVideo(INPUT);

    expect(result.ok).toBe(false);
    expect(mockRenderVerticalVideo).not.toHaveBeenCalled();
  });

  it("fails when rendering throws", async () => {
    mockRenderVerticalVideo.mockRejectedValue(new Error("ffmpeg failed"));

    const result = await generateSocialVideo(INPUT);

    expect(result.ok).toBe(false);
    expect(mockUploadToBlob).not.toHaveBeenCalled();
  });

  it("fails when the upload throws", async () => {
    mockUploadToBlob.mockRejectedValue(new Error("blob upload failed"));

    const result = await generateSocialVideo(INPUT);

    expect(result.ok).toBe(false);
  });
});
```

Note: this test relies on the real `site.config.ts` forbidden-pattern list via `checkForbiddenPatterns` (not mocked) — `"This cures..."` already matches the existing `/this\s+cures?/i` pattern shown in `apps/menhealth/site.config.ts`, so no extra fixture is needed.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter menhealth exec vitest run social-generate-video`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

Create `apps/menhealth/lib/social/generate-social-video.ts`:

```typescript
import type { Platform } from "@prisma/client";
import type { Result } from "@menhealth/core-social";
import { env } from "@/env";
import { createVideoPlan } from "./video-plan";
import { synthesizeNarrationAudio } from "./video-narration-audio";
import { renderVerticalVideo } from "./video-render";
import { uploadToBlob } from "./blob-storage";
import { checkForbiddenPatterns } from "./platform-rules";

export type GenerateSocialVideoInput = {
  hook: string;
  script: string;
  platform: Platform;
};

function isAiConfigured(): boolean {
  return Boolean(
    env.ANTHROPIC_API_KEY ||
      env.GROQ_API_KEY ||
      env.OPENROUTER_API_KEY ||
      env.OPENAI_API_KEY ||
      env.GEMINI_API_KEY,
  );
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export async function generateSocialVideo(
  input: GenerateSocialVideoInput,
): Promise<Result<{ videoUrl: string }>> {
  if (!isAiConfigured()) {
    return { ok: false, error: new Error("No AI provider is configured.") };
  }
  if (!env.OPENAI_API_KEY) {
    return {
      ok: false,
      error: new Error(
        "Video generation requires OPENAI_API_KEY for narration audio.",
      ),
    };
  }
  if (!env.BLOB_READ_WRITE_TOKEN) {
    return {
      ok: false,
      error: new Error(
        "Video generation requires BLOB_READ_WRITE_TOKEN for asset storage.",
      ),
    };
  }

  const planResult = await createVideoPlan(input);
  if (!planResult.ok) return planResult;
  const plan = planResult.value;

  const combinedText = [plan.narration, ...plan.captionChunks].join(" ");
  const forbiddenCheck = checkForbiddenPatterns(combinedText);
  if (forbiddenCheck.matched) {
    return {
      ok: false,
      error: new Error(
        `Generated video content contains forbidden patterns: ${forbiddenCheck.violations
          .map((v) => v.reason)
          .join(", ")}`,
      ),
    };
  }

  let narrationAudio: Buffer;
  try {
    narrationAudio = await synthesizeNarrationAudio(plan.narration);
  } catch (error) {
    return { ok: false, error: toError(error) };
  }

  let videoBuffer: Buffer;
  try {
    videoBuffer = await renderVerticalVideo({
      narrationAudio,
      captionChunks: plan.captionChunks,
    });
  } catch (error) {
    return { ok: false, error: toError(error) };
  }

  try {
    const videoUrl = await uploadToBlob({
      pathname: `social-videos/${Date.now()}.mp4`,
      body: videoBuffer,
      contentType: "video/mp4",
      token: env.BLOB_READ_WRITE_TOKEN,
    });
    return { ok: true, value: { videoUrl } };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter menhealth exec vitest run social-generate-video`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/menhealth/lib/social/generate-social-video.ts apps/menhealth/__tests__/social-generate-video.test.ts
git commit -m "feat(social): add generateSocialVideo orchestrator"
```

---

### Task 7: API route `POST /api/social/drafts/[id]/video`

**Files:**
- Create: `apps/menhealth/app/api/social/drafts/[id]/video/route.ts`
- Test: `apps/menhealth/__tests__/social-video-route.test.ts`

**Interfaces:**
- Consumes: `auth()` from `@/lib/auth`, `db` from `@/lib/db/prisma`, `generateSocialVideo` (Task 6), `supportsVideoGeneration` (Task 2).
- Produces: `POST` handler at this route path, consumed by Task 8 (UI `fetch` call to `/api/social/drafts/${postId}/video`).

- [ ] **Step 1: Write the failing tests**

Create `apps/menhealth/__tests__/social-video-route.test.ts`:

```typescript
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockFindUnique, mockUpdate, mockGenerateSocialVideo } =
  vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockFindUnique: vi.fn(),
    mockUpdate: vi.fn(),
    mockGenerateSocialVideo: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

vi.mock("@/lib/db/prisma", () => ({
  db: {
    socialPost: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}));

vi.mock("@/lib/social/generate-social-video", () => ({
  generateSocialVideo: mockGenerateSocialVideo,
}));

function makeRequest(id: string) {
  return new NextRequest(
    `http://localhost/api/social/drafts/${id}/video`,
    { method: "POST" },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({
    user: { isAdmin: true, email: "admin@example.com" },
  });
  mockUpdate.mockResolvedValue({});
});

describe("POST /api/social/drafts/[id]/video", () => {
  it("generates and persists a video for a supported draft", async () => {
    const { POST } = await import("@/app/api/social/drafts/[id]/video/route");

    mockFindUnique.mockResolvedValue({
      id: "post_1",
      platform: "TIKTOK",
      hook: "hook",
      script: "script",
    });
    mockGenerateSocialVideo.mockResolvedValue({
      ok: true,
      value: { videoUrl: "https://blob.test/social-videos/1.mp4" },
    });

    const response = await POST(makeRequest("post_1"), {
      params: Promise.resolve({ id: "post_1" }),
    });
    const body = (await response.json()) as {
      videoUrl?: string;
      videoStatus?: string;
    };

    expect(response.status).toBe(200);
    expect(body.videoStatus).toBe("READY");
    expect(body.videoUrl).toBe("https://blob.test/social-videos/1.mp4");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "post_1" },
      data: { videoStatus: "GENERATING", videoError: null },
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "post_1" },
      data: {
        videoUrl: "https://blob.test/social-videos/1.mp4",
        videoStatus: "READY",
        videoError: null,
      },
    });
  });

  it("marks the draft FAILED with a useful error when generation fails", async () => {
    const { POST } = await import("@/app/api/social/drafts/[id]/video/route");

    mockFindUnique.mockResolvedValue({
      id: "post_1",
      platform: "TIKTOK",
      hook: "hook",
      script: "script",
    });
    mockGenerateSocialVideo.mockResolvedValue({
      ok: false,
      error: new Error("TTS down"),
    });

    const response = await POST(makeRequest("post_1"), {
      params: Promise.resolve({ id: "post_1" }),
    });

    expect(response.status).toBe(500);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "post_1" },
      data: { videoStatus: "FAILED", videoError: "TTS down" },
    });
  });

  it("rejects platforms that don't support video with 422 and does not call generateSocialVideo", async () => {
    const { POST } = await import("@/app/api/social/drafts/[id]/video/route");

    mockFindUnique.mockResolvedValue({
      id: "post_1",
      platform: "REDDIT",
      hook: "hook",
      script: "",
    });

    const response = await POST(makeRequest("post_1"), {
      params: Promise.resolve({ id: "post_1" }),
    });

    expect(response.status).toBe(422);
    expect(mockGenerateSocialVideo).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown draft id", async () => {
    const { POST } = await import("@/app/api/social/drafts/[id]/video/route");

    mockFindUnique.mockResolvedValue(null);

    const response = await POST(makeRequest("missing"), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 401 for a non-admin session", async () => {
    mockAuth.mockResolvedValue({ user: { isAdmin: false } });
    const { POST } = await import("@/app/api/social/drafts/[id]/video/route");

    const response = await POST(makeRequest("post_1"), {
      params: Promise.resolve({ id: "post_1" }),
    });

    expect(response.status).toBe(401);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter menhealth exec vitest run social-video-route`
Expected: FAIL — route module does not exist.

- [ ] **Step 3: Implement**

Create `apps/menhealth/app/api/social/drafts/[id]/video/route.ts`:

```typescript
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { generateSocialVideo } from "@/lib/social/generate-social-video";
import { supportsVideoGeneration } from "@/lib/social/platform-rules";

export const runtime = "nodejs";
// TTS synthesis + ffmpeg render for a short clip can take up to ~2 minutes.
export const maxDuration = 120;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const draft = await db.socialPost.findUnique({ where: { id } });
  if (!draft) {
    return NextResponse.json(
      { error: "Social draft not found" },
      { status: 404 },
    );
  }

  if (!supportsVideoGeneration(draft.platform)) {
    return NextResponse.json(
      { error: "Video generation is not supported for this platform" },
      { status: 422 },
    );
  }

  await db.socialPost.update({
    where: { id },
    data: { videoStatus: "GENERATING", videoError: null },
  });

  const result = await generateSocialVideo({
    hook: draft.hook,
    script: draft.script,
    platform: draft.platform,
  });

  if (!result.ok) {
    await db.socialPost.update({
      where: { id },
      data: { videoStatus: "FAILED", videoError: result.error.message },
    });
    return NextResponse.json(
      { error: "Video generation failed" },
      { status: 500 },
    );
  }

  await db.socialPost.update({
    where: { id },
    data: {
      videoUrl: result.value.videoUrl,
      videoStatus: "READY",
      videoError: null,
    },
  });

  return NextResponse.json({
    videoUrl: result.value.videoUrl,
    videoStatus: "READY",
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter menhealth exec vitest run social-video-route`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/menhealth/app/api/social/drafts/[id]/video/route.ts apps/menhealth/__tests__/social-video-route.test.ts
git commit -m "feat(social): add POST /api/social/drafts/[id]/video route"
```

---

### Task 8: Wire video generation into the Social Draft admin UI

**Files:**
- Modify: `apps/menhealth/app/admin/(protected)/social/drafts/[id]/DraftActions.tsx`
- Modify: `apps/menhealth/app/admin/(protected)/social/drafts/[id]/page.tsx`

**Interfaces:**
- Consumes: `POST /api/social/drafts/[id]/video` (Task 7), `SocialPost.videoUrl/videoStatus/videoError` (Task 1).
- Produces: no new interfaces — this is the UI leaf.

There is no existing component-test coverage for `DraftActions.tsx` (the project's stated quality bar is unit tests for scoring/parsing/AI-output-validation, which this component isn't) — verify this task by running the app, not by adding component tests.

- [ ] **Step 1: Extend `DraftActions` props and add the video section**

In `apps/menhealth/app/admin/(protected)/social/drafts/[id]/DraftActions.tsx`, extend the `Props` type (after `caption: string;`):

```typescript
type Props = {
  postId: string;
  platform: string;
  status: string;
  riskLevel: string;
  requiresReview: boolean;
  initialScheduledAt?: string | null;
  caption: string;
  videoUrl?: string | null;
  videoStatus?: string | null;
  videoError?: string | null;
};
```

Add `videoUrl`, `videoStatus`, `videoError` to the destructured function parameters, and add this derived flag next to the other `isX`/`isReddit` constants:

```typescript
  const supportsVideo = platform === "TIKTOK" || platform === "YOUTUBE_COMMUNITY";
```

Add this block at the end of the returned JSX, just before the closing `</div>` of the component (after the manual-platform block, so it renders regardless of draft status — video generation is independent of the approve/reject lifecycle):

```tsx
      {supportsVideo && (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-xs font-semibold text-gray-600">Video</p>

          {videoStatus === "FAILED" && videoError && (
            <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">
              {videoError}
            </p>
          )}

          {videoUrl && videoStatus === "READY" && (
            // eslint-disable-next-line jsx-a11y/media-has-caption -- captions are burned into the video itself
            <video
              controls
              className="w-full max-w-[240px] rounded"
              src={videoUrl}
            />
          )}

          <button
            onClick={() => callJson("video")}
            disabled={loading !== null || videoStatus === "GENERATING"}
            className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading === "video" || videoStatus === "GENERATING"
              ? "Generating video…"
              : videoUrl
                ? "Regenerate video"
                : "Generate video"}
          </button>
        </div>
      )}
```

- [ ] **Step 2: Pass the new fields from the page**

In `apps/menhealth/app/admin/(protected)/social/drafts/[id]/page.tsx`, add the three fields to the `<DraftActions ... />` call (after `caption={post.caption}`):

```tsx
            videoUrl={post.videoUrl}
            videoStatus={post.videoStatus}
            videoError={post.videoError}
```

- [ ] **Step 3: Manually verify in the browser**

Run: `pnpm --filter menhealth dev`

1. Open a TikTok or YouTube Community draft under `/admin/social/drafts/[id]`.
2. Confirm a "Video" section with a "Generate video" button appears; confirm it does **not** appear on a Reddit or X draft.
3. Click "Generate video", confirm the button shows "Generating video…" and is disabled, and that after the request completes the page shows either the `<video controls>` preview (success) or the red error box (failure) with `videoStatus`/`videoError` persisted (reload the page to confirm persistence).
4. Confirm the button relabels to "Regenerate video" once a `videoUrl` exists, and that clicking it again re-runs generation without disturbing `status`/approve/reject/publish state.

- [ ] **Step 4: Commit**

```bash
git add apps/menhealth/app/admin/\(protected\)/social/drafts/\[id\]/DraftActions.tsx apps/menhealth/app/admin/\(protected\)/social/drafts/\[id\]/page.tsx
git commit -m "feat(social): add video generation to the draft admin UI"
```

---

### Task 9: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `pnpm --filter menhealth test`
Expected: all tests pass, including the six new files from Tasks 2–7.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter menhealth typecheck`
Expected: no new errors introduced by this plan's files. (If the pre-existing `AdVideoPackageAiOutputSchema`/`createAdVideoPackageGenerator` errors noted in "Context you need before starting" are present, confirm they match your Task-0 baseline and are unrelated to any file this plan touched.)

- [ ] **Step 3: Lint**

Run: `pnpm --filter menhealth lint`
Expected: no new errors in the files this plan created or modified.

- [ ] **Step 4: Commit** (only if any of the above required fixes)

```bash
git add -A
git commit -m "fix(social): address verification findings for video generation"
```

---

## What this plan deliberately does not do

- Does not touch `packages/core-social` — everything lives in `apps/menhealth/lib/social/**` since this is a single-consumer feature, not shared cross-site business logic.
- Does not add `providerRenderId` or any polling state — OpenAI TTS and the ffmpeg render both complete synchronously inside the request.
- Does not gate video generation on `SocialPost.status` — it's available at any draft status, consistent with "video generation should not introduce another approval lifecycle."
- Does not fix the pre-existing broken `createAdVideoPackageGenerator` import chain (`generate-ad-video-package.ts`, `lib/social/validation.ts`) — out of scope, flagged separately.
