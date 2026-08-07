# Port social video-generation + TikTok auto-publish to hype-check — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `apps/hype-check`'s admin social area up to parity with `apps/menhealth`: AI video generation (plan → optional TTS narration → ffmpeg vertical render → Vercel Blob upload) for TikTok/YouTube Community drafts, plus a direct TikTok publish flow via the Content Posting API.

**Architecture:** Every new `lib/social/*` file and API route is site-agnostic (imports `@/lib/auth`, `@/lib/db/prisma`, `@/env`, `@menhealth/core-social` — all already present in hype-check identically) and can be copied near-verbatim, with two adaptations applied consistently: (1) hype-check uses a custom Prisma client output at `@/app/generated/prisma`, not `@prisma/client` — every `Platform` type import must use that path; (2) hype-check's existing admin UI files carry their own theme (`bg-muted`, `text-emerald-600`, `text-accent`) that must be preserved when merging in the new sections, not overwritten with menhealth's hardcoded `indigo`/`emerald`. `packages/core-social` (the shared `TikTokAdapter` implementation) needs no changes — it's a workspace package already used identically by both apps.

**Tech Stack:** Next.js App Router, Prisma, `ffmpeg-static` (child_process, no fluent-ffmpeg wrapper), Vercel Blob HTTP API (no SDK), Vitest.

## Global Constraints

- Never download/proxy/rehost YouTube videos — not touched by this work (video generation here is TTS + caption slideshow, not YouTube footage).
- High-risk health categories still require admin approval before publish — untouched: `checkForbiddenPatterns` / `requiresReview` gating in `generate-social-video.ts` and the existing draft-approval flow are carried over unchanged.
- No auto-posting beyond what's already reviewed/approved — the new TikTok publish route only fires on an admin's explicit "Publish to TikTok" click on an `APPROVED` post with a `READY` video; nothing autoruns.
- Server-side API keys/secrets go through `env.ts` (Zod-validated) — `BLOB_READ_WRITE_TOKEN` must be added there, never read via raw `process.env` in application code.
- hype-check's Prisma client is generated to `@/app/generated/prisma`, not the default `@prisma/client` — every new/edited file must import `Platform` (and other Prisma types) from that path.
- Narration audio stays disabled (`NARRATION_AUDIO_ENABLED = false`) — do not turn it on; this matches menhealth's current state (OpenAI TTS needs a paid tier).

---

### Task 1: Prisma schema — video fields on SocialPost

**Files:**
- Modify: `apps/hype-check/prisma/schema.prisma:648-685` (insert enum before `model SocialPost`, add three fields inside it)

**Interfaces:**
- Produces: `VideoGenerationStatus` enum (`GENERATING | READY | FAILED`) and `SocialPost.videoUrl: String?`, `SocialPost.videoStatus: VideoGenerationStatus?`, `SocialPost.videoError: String?` — consumed by every later task that reads/writes video state (video route, publish route, `DraftActions.tsx`, `generate/[platform]/page.tsx`, and the ported tests).

- [ ] **Step 1: Add the enum and fields**

In `apps/hype-check/prisma/schema.prisma`, insert a new enum immediately before `model SocialPost` (currently at line 663):

```prisma
enum VideoGenerationStatus {
  GENERATING
  READY
  FAILED
}

model SocialPost {
```

Then, inside `model SocialPost`, add three fields right after `platformUrl String?` (currently line 679) and before `templateId String?`:

```prisma
  platformUrl    String?
  videoUrl       String?
  videoStatus    VideoGenerationStatus?
  videoError     String?
  templateId     String?
```

- [ ] **Step 2: Regenerate the Prisma client**

Run: `pnpm --filter hype-check exec prisma generate`
Expected: succeeds, regenerating `apps/hype-check/app/generated/prisma` with the new enum and fields.

- [ ] **Step 3: Create and apply a migration**

Run: `pnpm --filter hype-check exec prisma migrate dev --name add_social_post_video_fields`
Expected: a new migration is created and applied against the local hype-check database. If no local `DATABASE_URL` is reachable in this environment, skip applying and note it — the schema/client changes from Step 1-2 are still valid and sufficient for the remaining tasks to typecheck; flag to the user that the migration must be run against a real database before deploying.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: passes (nothing yet references the new fields, so no errors).

- [ ] **Step 5: Commit**

```bash
git add apps/hype-check/prisma/schema.prisma
git commit -m "feat(social): add video generation fields to hype-check's SocialPost model"
```

---

### Task 2: `platform-rules.ts` — supportsVideoGeneration

**Files:**
- Modify: `apps/hype-check/lib/social/platform-rules.ts`
- Test: `apps/hype-check/__tests__/social-platform-rules.test.ts`

**Interfaces:**
- Consumes: `Platform` type from `@/app/generated/prisma`.
- Produces: `VIDEO_CAPABLE_PLATFORMS: readonly Platform[]` and `supportsVideoGeneration(platform: Platform): boolean` — consumed by Task 12 (`video/route.ts`) and Task 14 (`DraftActions.tsx`'s `supportsVideo`).

- [ ] **Step 1: Write the failing test**

Read `apps/hype-check/__tests__/social-platform-rules.test.ts` first to match its existing style, then add:

```ts
import { supportsVideoGeneration } from "@/lib/social/platform-rules";

describe("supportsVideoGeneration()", () => {
  it("returns true for TikTok and YouTube Community", () => {
    expect(supportsVideoGeneration("TIKTOK")).toBe(true);
    expect(supportsVideoGeneration("YOUTUBE_COMMUNITY")).toBe(true);
  });

  it("returns false for Reddit and X", () => {
    expect(supportsVideoGeneration("REDDIT")).toBe(false);
    expect(supportsVideoGeneration("X")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter hype-check exec vitest run social-platform-rules`
Expected: FAIL — `supportsVideoGeneration is not a function` (or similar import error).

- [ ] **Step 3: Add the implementation**

In `apps/hype-check/lib/social/platform-rules.ts`, add the import and append the export at the end of the file:

```ts
import type { Platform } from "@/app/generated/prisma";
```

(add alongside the existing top imports)

```ts
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

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter hype-check exec vitest run social-platform-rules`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/hype-check/lib/social/platform-rules.ts apps/hype-check/__tests__/social-platform-rules.test.ts
git commit -m "feat(social): add supportsVideoGeneration platform helper to hype-check"
```

---

### Task 3: TikTok adapter wrapper — export the config type

**Files:**
- Modify: `apps/hype-check/lib/social/adapters/tiktok.ts`

**Interfaces:**
- Consumes: `TikTokAdapterConfig` from `@menhealth/core-social` (already exported by the shared package).
- Produces: re-exported `TikTokAdapterConfig` type — consumed by Task 13 (`publish/route.ts`).

- [ ] **Step 1: Add the missing re-export**

Replace the full contents of `apps/hype-check/lib/social/adapters/tiktok.ts`:

```ts
export { TikTokAdapter } from "@menhealth/core-social";
export type { TikTokAdapterConfig } from "@menhealth/core-social";
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/hype-check/lib/social/adapters/tiktok.ts
git commit -m "fix(social): export TikTokAdapterConfig from hype-check's tiktok adapter wrapper"
```

---

### Task 4: env.ts — BLOB_READ_WRITE_TOKEN

**Files:**
- Modify: `apps/hype-check/env.ts`

**Interfaces:**
- Produces: `env.BLOB_READ_WRITE_TOKEN: string | undefined` — consumed by Task 11 (`generate-social-video.ts`).

- [ ] **Step 1: Add to the server schema**

In `apps/hype-check/env.ts`, inside the `server: { ... }` block, add immediately after `CRON_SECRET: z.string().min(32),`:

```ts
    CRON_SECRET: z.string().min(32),
    BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
```

- [ ] **Step 2: Add to runtimeEnv**

In the same file's `runtimeEnv: { ... }` block, add immediately after `CRON_SECRET: process.env.CRON_SECRET,`:

```ts
    CRON_SECRET: process.env.CRON_SECRET,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: passes. `BLOB_READ_WRITE_TOKEN` is optional and unset locally, so no env validation failure.

- [ ] **Step 4: Commit**

```bash
git add apps/hype-check/env.ts
git commit -m "feat(social): add optional BLOB_READ_WRITE_TOKEN to hype-check env"
```

---

### Task 5: package.json + next.config.ts — ffmpeg-static wiring

**Files:**
- Modify: `apps/hype-check/package.json`
- Modify: `apps/hype-check/next.config.ts`

**Interfaces:**
- Produces: the `ffmpeg-static` package installed and its binary + the caption font correctly traced/externalized for the video route — consumed by Task 10 (`video-render.ts`) at runtime.

- [ ] **Step 1: Add the dependency**

In `apps/hype-check/package.json`, inside `"dependencies"`, add (keep alphabetical order — after `"eslint-config-next"` is devDependencies so place this among deps near "next start" cluster; alphabetically it goes right after `"@vercel/speed-insights"` and before `"groq-sdk"`):

```json
    "@vercel/speed-insights": "^2.0.0",
    "ffmpeg-static": "^5.3.0",
    "groq-sdk": "^1.3.0",
```

- [ ] **Step 2: Install**

Run: `pnpm install`
Expected: `ffmpeg-static` added to `apps/hype-check/node_modules` and the lockfile updated.

- [ ] **Step 3: Update next.config.ts**

In `apps/hype-check/next.config.ts`, add `serverExternalPackages` and `outputFileTracingIncludes` to the `nextConfig` object, right after `transpilePackages: ['@menhealth/ui'],`:

```ts
  transpilePackages: ['@menhealth/ui'],
  // ffmpeg-static resolves its binary path via `__dirname` at runtime;
  // bundling it rewrites `__dirname` to a path that doesn't exist on disk
  // (observed as `spawn .../ffmpeg-static/ffmpeg ENOENT` with a `/ROOT/`
  // prefix). Keep it external so Node's native `require` resolves the real
  // installed location instead.
  serverExternalPackages: ['ffmpeg-static'],
  outputFileTracingIncludes: {
    // ffmpeg-static binary and bundled caption font are resolved by
    // filesystem path at runtime, not via the module import graph, so they
    // need to be included in the trace explicitly for this route.
    '/api/social/drafts/\\[id\\]/video': [
      './node_modules/ffmpeg-static/**/*',
      './assets/fonts/**/*',
    ],
  },
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add apps/hype-check/package.json apps/hype-check/next.config.ts pnpm-lock.yaml
git commit -m "fix(social): mark ffmpeg-static as a server-external package in hype-check"
```

---

### Task 6: `blob-storage.ts` — new file

**Files:**
- Create: `apps/hype-check/lib/social/blob-storage.ts`

**Interfaces:**
- Produces: `uploadToBlob(input: { pathname: string; body: Uint8Array; contentType: string; token: string }): Promise<string>` — consumed by Task 11 (`generate-social-video.ts`).

- [ ] **Step 1: Create the file**

```ts
type UploadToBlobInput = {
  pathname: string;
  body: Uint8Array;
  contentType: string;
  token: string;
};

const BLOB_API_BASE_URL = 'https://blob.vercel-storage.com';

export async function uploadToBlob({
  pathname,
  body,
  contentType,
  token,
}: UploadToBlobInput): Promise<string> {
  const normalizedPath = pathname.startsWith('/')
    ? pathname.slice(1)
    : pathname;
  const binaryPayload = Uint8Array.from(body);

  const response = await fetch(`${BLOB_API_BASE_URL}/${normalizedPath}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
      'x-add-random-suffix': '1',
      'x-content-type': contentType,
    },
    body: new Blob([binaryPayload], { type: contentType }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Blob upload failed (${response.status}): ${details}`);
  }

  const jsonPayload = (await response.json()) as { url?: string };
  if (!jsonPayload.url) {
    throw new Error('Blob upload response did not include a URL');
  }

  return jsonPayload.url;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/hype-check/lib/social/blob-storage.ts
git commit -m "feat(social): add Vercel Blob upload helper to hype-check"
```

---

### Task 7: `video-narration-audio.ts` — new file

**Files:**
- Create: `apps/hype-check/lib/social/video-narration-audio.ts`

**Interfaces:**
- Consumes: `env.OPENAI_API_KEY` (already present in `apps/hype-check/env.ts`).
- Produces: `synthesizeNarrationAudio(narration: string): Promise<Buffer>` — consumed by Task 11 (`generate-social-video.ts`), gated behind `NARRATION_AUDIO_ENABLED = false` so it is not called at runtime yet.

- [ ] **Step 1: Create the file**

```ts
import { env } from "@/env";

const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";
const OPENAI_TTS_MODEL = "tts-1";
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

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/hype-check/lib/social/video-narration-audio.ts
git commit -m "feat(social): add OpenAI TTS narration synthesis to hype-check"
```

---

### Task 8: `video-plan.ts` — new file

**Files:**
- Create: `apps/hype-check/lib/social/video-plan.ts`

**Interfaces:**
- Consumes: `Platform` from `@/app/generated/prisma` (not `@prisma/client` — hype-check's custom client output), `Result` from `@menhealth/core-social`, `aiClient` from `@/lib/ai/client`.
- Produces: `VideoPlanSchema`, `VideoPlan` type, `CreateVideoPlanInput` type, `createVideoPlan(input): Promise<Result<VideoPlan>>` — consumed by Task 11 (`generate-social-video.ts`).

- [ ] **Step 1: Create the file**

```ts
import { z } from "zod";
import type { Platform } from "@/app/generated/prisma";
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
  try {
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
      return {
        ok: false,
        error: new Error("AI response was not valid JSON"),
      };
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
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: passes. This confirms `apps/hype-check/lib/ai/client.ts` exports `aiClient` with the same shape menhealth's does — if it errors here, read that file before proceeding (it should already exist per the repo's per-site AI client convention).

- [ ] **Step 3: Commit**

```bash
git add apps/hype-check/lib/social/video-plan.ts
git commit -m "feat(social): add AI video plan step to hype-check"
```

---

### Task 9: Caption font asset

**Files:**
- Create: `apps/hype-check/assets/fonts/social-video-caption.ttf` (binary copy)

**Interfaces:**
- Produces: the font file at the filesystem path `video-render.ts` (Task 10) resolves via `join(process.cwd(), "assets", "fonts", "social-video-caption.ttf")`.

- [ ] **Step 1: Copy the binary file**

Run:
```bash
mkdir -p apps/hype-check/assets/fonts
cp apps/menhealth/assets/fonts/social-video-caption.ttf apps/hype-check/assets/fonts/social-video-caption.ttf
```

- [ ] **Step 2: Verify the copy**

Run: `diff apps/menhealth/assets/fonts/social-video-caption.ttf apps/hype-check/assets/fonts/social-video-caption.ttf`
Expected: no output (files identical).

- [ ] **Step 3: Commit**

```bash
git add apps/hype-check/assets/fonts/social-video-caption.ttf
git commit -m "feat(social): add caption font asset to hype-check for video rendering"
```

---

### Task 10: `video-render.ts` — new file

**Files:**
- Create: `apps/hype-check/lib/social/video-render.ts`

**Interfaces:**
- Consumes: `ffmpeg-static` (Task 5), the font asset at `assets/fonts/social-video-caption.ttf` (Task 9).
- Produces: `RenderVerticalVideoInput` type, `renderVerticalVideo(input): Promise<Buffer>` — consumed by Task 11 (`generate-social-video.ts`).

- [ ] **Step 1: Create the file**

Identical to menhealth's version except the brand line, which must say "Hype Check" (this app's `siteConfig.name` in `apps/hype-check/site.config.ts`) instead of "MenHealth Digest":

```ts
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
const BRAND_LINE = "Hype Check";
const FONT_PATH = join(
  process.cwd(),
  "assets",
  "fonts",
  "social-video-caption.ttf",
);

export type RenderVerticalVideoInput = {
  narrationAudio?: Buffer;
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

const DURATION_PATTERN = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/;

// ffmpeg-static ships no ffprobe binary, so duration is read off ffmpeg's own
// stderr banner. `ffmpeg -i <file>` with no output always exits non-zero —
// that's expected here, only the Duration line in stderr is used.
function probeDurationSeconds(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg-static did not resolve a binary path"));
      return;
    }
    execFile(
      ffmpegPath,
      ["-i", filePath],
      { maxBuffer: 1024 * 1024 * 32 },
      (_error, _stdout, stderr) => {
        const match = DURATION_PATTERN.exec(stderr);
        if (!match) {
          reject(
            new Error(
              `Could not determine duration of ${filePath} from ffmpeg output`,
            ),
          );
          return;
        }
        const [, hours, minutes, seconds] = match;
        resolve(Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds));
      },
    );
  });
}

export async function renderVerticalVideo(
  input: RenderVerticalVideoInput,
): Promise<Buffer> {
  const workDir = await mkdtemp(join(tmpdir(), "social-video-"));

  try {
    const sceneFilterInputs: string[] = [];
    const drawTextFilters: string[] = [];
    const sceneLabels: string[] = [];
    let totalSceneSeconds = 0;

    for (const [index, chunk] of input.captionChunks.entries()) {
      const duration = sceneDurationSeconds(chunk);
      totalSceneSeconds += duration;
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
      "-movflags",
      "+faststart",
      scenesPath,
    ]);

    if (!input.narrationAudio) {
      return await readFile(scenesPath);
    }

    const narrationPath = join(workDir, "narration.mp3");
    await writeFile(narrationPath, input.narrationAudio);

    // ffmpeg's `-stream_loop -1` (infinite loop) does not reliably respect
    // `-shortest` — verified to loop indefinitely regardless of -c:v copy vs.
    // re-encode, eventually exhausting memory. Loop a known finite number of
    // times instead (enough to cover the narration), then hard-trim with -t.
    const narrationDurationSeconds = await probeDurationSeconds(narrationPath);
    const loopCount = Math.max(
      0,
      Math.ceil(narrationDurationSeconds / totalSceneSeconds) - 1,
    );

    const outputPath = join(workDir, "output.mp4");
    await runFfmpeg([
      "-y",
      "-stream_loop",
      String(loopCount),
      "-i",
      scenesPath,
      "-i",
      narrationPath,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-t",
      String(narrationDurationSeconds),
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

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/hype-check/lib/social/video-render.ts
git commit -m "feat(social): add ffmpeg-based vertical video renderer to hype-check"
```

---

### Task 11: `generate-social-video.ts` — new file

**Files:**
- Create: `apps/hype-check/lib/social/generate-social-video.ts`

**Interfaces:**
- Consumes: `createVideoPlan` (Task 8), `synthesizeNarrationAudio` (Task 7, unused while disabled), `renderVerticalVideo` (Task 10), `uploadToBlob` (Task 6), `checkForbiddenPatterns` (already in `platform-rules.ts`), `env` (Task 4), `Platform` from `@/app/generated/prisma`.
- Produces: `GenerateSocialVideoInput` type, `generateSocialVideo(input): Promise<Result<{ videoUrl: string }>>` — consumed by Task 12 (`video/route.ts`).

- [ ] **Step 1: Create the file**

Identical to menhealth's version, with the `Platform` import path adapted:

```ts
import type { Platform } from "@/app/generated/prisma";
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

// Narration audio requires a paid OpenAI TTS tier. Disabled for now — videos
// render as a silent caption slideshow until this is turned back on.
const NARRATION_AUDIO_ENABLED = false;

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
  if (NARRATION_AUDIO_ENABLED && !env.OPENAI_API_KEY) {
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

  let narrationAudio: Buffer | undefined;
  if (NARRATION_AUDIO_ENABLED) {
    try {
      narrationAudio = await synthesizeNarrationAudio(plan.narration);
    } catch (error) {
      return { ok: false, error: toError(error) };
    }
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

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/hype-check/lib/social/generate-social-video.ts
git commit -m "feat(social): add generateSocialVideo orchestrator to hype-check"
```

---

### Task 12: `POST /api/social/drafts/[id]/video` route

**Files:**
- Create: `apps/hype-check/app/api/social/drafts/[id]/video/route.ts`

**Interfaces:**
- Consumes: `auth` from `@/lib/auth`, `db` from `@/lib/db/prisma`, `generateSocialVideo` (Task 11), `supportsVideoGeneration` (Task 2).
- Produces: `POST` handler updating `SocialPost.videoUrl/videoStatus/videoError` — consumed by Task 14's `DraftActions.tsx` "Generate video" button.

- [ ] **Step 1: Create the file**

```ts
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

  try {
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
  } catch {
    // Defends against the process being killed mid-render (function
    // timeout), or an unexpected throw from generateSocialVideo/db calls —
    // without this, the row would stay stuck at GENERATING forever.
    try {
      await db.socialPost.update({
        where: { id },
        data: {
          videoStatus: "FAILED",
          videoError: "Video generation failed unexpectedly",
        },
      });
    } catch {
      // Best effort only — nothing more we can do if this also fails.
    }
    return NextResponse.json(
      { error: "Video generation failed" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add "apps/hype-check/app/api/social/drafts/[id]/video/route.ts"
git commit -m "feat(social): add POST /api/social/drafts/[id]/video route to hype-check"
```

---

### Task 13: `POST /api/social/drafts/[id]/publish` route

**Files:**
- Create: `apps/hype-check/app/api/social/drafts/[id]/publish/route.ts`

**Interfaces:**
- Consumes: `auth`, `db`, `env` (for `TIKTOK_CLIENT_ID`/`TIKTOK_CLIENT_SECRET`, already present in `apps/hype-check/env.ts`), `TikTokAdapter` + `TikTokAdapterConfig` (Task 3), `SocialPublisher` type from `@/lib/social/adapters/publisher`, `Platform` from `@/app/generated/prisma`.
- Produces: `POST` handler that publishes an approved, video-ready TikTok draft — consumed by Task 14's `DraftActions.tsx` "Publish to TikTok" button.

- [ ] **Step 1: Create the file**

Identical to menhealth's version, with the `Platform` import path adapted:

```ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { env } from "@/env";
import { TikTokAdapter } from "@/lib/social/adapters/tiktok";
import type { SocialPublisher } from "@/lib/social/adapters/publisher";
import type { Platform } from "@/app/generated/prisma";

export const runtime = "nodejs";
// TikTok's publish/upload/status-poll round trip can take a while.
export const maxDuration = 60;

const ADAPTERS: Partial<Record<Platform, SocialPublisher>> = {
  TIKTOK: new TikTokAdapter({
    clientId: env.TIKTOK_CLIENT_ID,
    clientSecret: env.TIKTOK_CLIENT_SECRET,
    db,
  }),
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const post = await db.socialPost.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const adapter = ADAPTERS[post.platform];
  if (!adapter) {
    return NextResponse.json(
      {
        error: `Direct publish is not available for ${post.platform}. Use Schedule (X) or the manual posting workflow.`,
      },
      { status: 422 },
    );
  }

  const validation = await adapter.validate(post);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.errors.join("; ") },
      { status: 422 },
    );
  }

  const result = await adapter.publish(post);

  if (result.ok) {
    await db.$transaction([
      db.socialPublishAttempt.create({
        data: {
          postId: post.id,
          success: true,
          response: {
            platformPostId: result.platformPostId,
            platformUrl: result.platformUrl,
          },
        },
      }),
      db.socialPost.update({
        where: { id: post.id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          platformPostId: result.platformPostId,
          platformUrl: result.platformUrl,
        },
      }),
    ]);

    return NextResponse.json({
      id: post.id,
      status: "PUBLISHED",
      platformPostId: result.platformPostId,
      platformUrl: result.platformUrl,
    });
  }

  await db.$transaction([
    db.socialPublishAttempt.create({
      data: {
        postId: post.id,
        success: false,
        errorCode: result.errorCode,
        errorMsg: result.errorMsg,
      },
    }),
    db.socialPost.update({
      where: { id: post.id },
      data: { status: "FAILED" },
    }),
  ]);

  return NextResponse.json({ error: result.errorMsg }, { status: 502 });
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: passes. If `SocialPublisher` isn't exported from `apps/hype-check/lib/social/adapters/publisher.ts`, read that file first — it should already mirror menhealth's (unmodified by this plan).

- [ ] **Step 3: Commit**

```bash
git add "apps/hype-check/app/api/social/drafts/[id]/publish/route.ts"
git commit -m "feat(social): add POST /api/social/drafts/[id]/publish route to hype-check"
```

---

### Task 14: `DraftActions.tsx` — video + TikTok publish UI

**Files:**
- Modify: `apps/hype-check/app/admin/(protected)/social/drafts/[id]/DraftActions.tsx`

**Interfaces:**
- Consumes: `videoUrl`, `videoStatus`, `videoError` props (threaded in by Task 16) — calls `POST /api/social/drafts/[id]/video` (Task 12) and `POST /api/social/drafts/[id]/publish` (Task 13) via the existing `callJson` helper.
- Produces: updated `Props` type consumed by Task 16.

This file currently treats TikTok as a manual-only platform (`isManualPlatform` includes `'TIKTOK'`). It becomes an auto-publish platform once a video is ready, matching menhealth. Preserve hype-check's existing theme classes (`bg-muted/60`, `text-muted/80`, `text-muted/60`) on the parts of the file that already have them — do not replace them with menhealth's hardcoded `indigo`/`emerald`. The two new sections (Video, Publish to TikTok) use only neutral grays and TikTok's brand black, same as menhealth, so no retheming is needed there.

- [ ] **Step 1: Add the three new props**

In the `Props` type (after `caption: string;`):

```ts
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

And destructure them in the component signature (after `caption,`):

```ts
export default function DraftActions({
  postId,
  platform,
  status,
  riskLevel,
  requiresReview,
  initialScheduledAt,
  caption,
  videoUrl,
  videoStatus,
  videoError,
}: Props) {
```

- [ ] **Step 2: Update the platform-capability constants**

Replace:

```ts
  const isX = platform === 'X';
  const isReddit = platform === 'REDDIT';
  // Only X has a working auto-publisher (via the scheduled cron). Everything
  // else — YouTube Community, Reddit, and TikTok — is always manual: copy
  // the text, post it yourself, then record the link here.
  const isManualPlatform =
    platform === 'YOUTUBE_COMMUNITY' || isReddit || platform === 'TIKTOK';
  const canMarkManuallyPublished =
    isManualPlatform && (isApproved || isScheduled);
  const canSchedule = isX && (isApproved || isScheduled);
```

with:

```ts
  const isX = platform === 'X';
  const isReddit = platform === 'REDDIT';
  const isTikTok = platform === 'TIKTOK';
  const supportsVideo = isTikTok || platform === 'YOUTUBE_COMMUNITY';
  // X auto-publishes via the scheduled cron; TikTok auto-publishes
  // immediately via the Content Posting API once a video is ready. Everything
  // else — YouTube Community and Reddit — is always manual: copy the text,
  // post it yourself, then record the link here.
  const isManualPlatform = platform === 'YOUTUBE_COMMUNITY' || isReddit;
  const canMarkManuallyPublished =
    isManualPlatform && (isApproved || isScheduled);
  const canSchedule = isX && (isApproved || isScheduled);
  const canPublishToTikTok =
    isTikTok && isApproved && videoStatus === 'READY' && Boolean(videoUrl);
```

- [ ] **Step 3: Append the Video and Publish-to-TikTok sections**

Immediately before the closing `</div>` and `);` at the end of the component's returned JSX (i.e., right after the manual-publish block's closing `)}` — the block that starts with `{isManualPlatform && (isApproved || isScheduled) && (`), add:

```tsx
      {supportsVideo && (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-xs font-semibold text-gray-600">Video</p>

          {videoStatus === 'FAILED' && videoError && (
            <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">
              {videoError}
            </p>
          )}

          {videoUrl && videoStatus === 'READY' && (
            <>
              {}
              <video
                controls
                className="w-full max-w-[240px] rounded"
                src={videoUrl}
              />
              <a
                href={videoUrl}
                download
                rel="noopener noreferrer"
                className="mr-8 rounded-md border bg-gray-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Download video
              </a>
            </>
          )}

          <button
            onClick={() => callJson('video')}
            disabled={loading !== null}
            className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading === 'video'
              ? 'Generating video…'
              : videoUrl
                ? 'Regenerate video'
                : 'Generate video'}
          </button>
        </div>
      )}

      {isTikTok && (isApproved || status === 'PUBLISHED') && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-semibold text-gray-600">
            Publish to TikTok
          </p>
          {status === 'PUBLISHED' ? (
            <p className="text-xs text-gray-500">
              Published — posted to TikTok.
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-500">
                Uploads the generated video directly to TikTok via the Content
                Posting API and publishes it publicly.
                {!canPublishToTikTok && ' Generate a video above first.'}
              </p>
              <button
                onClick={() => callJson('publish')}
                disabled={loading !== null || !canPublishToTikTok}
                className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading === 'publish' ? 'Publishing…' : 'Publish to TikTok'}
              </button>
            </>
          )}
        </div>
      )}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add "apps/hype-check/app/admin/(protected)/social/drafts/[id]/DraftActions.tsx"
git commit -m "feat(social): add video generation and TikTok publish UI to hype-check's DraftActions"
```

---

### Task 15: `accounts/page.tsx` — TikTok connect card

**Files:**
- Modify: `apps/hype-check/app/admin/(protected)/social/accounts/page.tsx`

**Interfaces:**
- Consumes: `env.TIKTOK_CLIENT_ID`/`TIKTOK_REDIRECT_URI` (already in `apps/hype-check/env.ts`), `db.socialAccount.findMany`.

Preserve hype-check's existing import style (`@/app/generated/prisma` for `SocialAccount`, single quotes) and its `text-muted/60` accent class in place of menhealth's `text-indigo-600`.

- [ ] **Step 1: Replace the whole file**

```tsx
import type { SocialAccount } from '@/app/generated/prisma';
import { env } from '@/env';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';

// Only platforms whose adapter actually reads the stored OAuth token to
// publish are listed here. YouTube Community and Reddit adapters never read
// a stored token — they're always manual — so connecting an account for them
// would do nothing.
const PLATFORM_CONFIGS = [
  {
    platform: 'X' as const,
    label: 'X (Twitter)',
    oauthPath: '/api/social/x/oauth',
    configured: !!(env.X_CLIENT_ID && env.X_REDIRECT_URI),
    setupDocs: 'https://developer.twitter.com/en/portal/dashboard',
    envVars: ['X_CLIENT_ID', 'X_CLIENT_SECRET', 'X_REDIRECT_URI'],
  },
  {
    platform: 'TIKTOK' as const,
    label: 'TikTok',
    oauthPath: '/api/social/tiktok/oauth',
    configured: !!(env.TIKTOK_CLIENT_ID && env.TIKTOK_REDIRECT_URI),
    setupDocs: 'https://developers.tiktok.com/apps',
    envVars: ['TIKTOK_CLIENT_ID', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_REDIRECT_URI'],
  },
];

export default async function SocialAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    redirect('/admin/login');
  }

  const { connected, error } = await searchParams;
  const connectedLabel = PLATFORM_CONFIGS.find(
    (p) => p.platform.toLowerCase() === connected,
  )?.label;

  const accounts = await db.socialAccount.findMany({
    where: { platform: { in: PLATFORM_CONFIGS.map((p) => p.platform) } },
  });
  const accountByPlatform = new Map<string, SocialAccount>(
    accounts.map((a) => [a.platform, a]),
  );

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Social accounts</h1>
      <p className="text-sm text-gray-500">
        X and TikTok are the platforms with a working auto-publisher, so
        they&apos;re the ones that need a connected account here. YouTube
        Community and Reddit are always posted manually from{' '}
        <Link href="/admin/social/drafts" className="underline">
          Social drafts
        </Link>{' '}
        — no connection needed.
      </p>

      {connected && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          ✓ {connectedLabel ?? connected} connected successfully.
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          Connection error: <code className="font-mono">{error}</code>. Check
          your OAuth app credentials and try again.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {PLATFORM_CONFIGS.map((config) => {
          const account = accountByPlatform.get(config.platform) ?? null;
          const expired =
            account?.tokenExpiry && account.tokenExpiry < new Date();

          return (
            <div
              key={config.platform}
              className="flex flex-col justify-between gap-4 rounded-lg border bg-white p-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">
                    {config.label}
                  </span>
                  {account ? (
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${expired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                    >
                      {expired ? 'Token expired' : 'Connected'}
                    </span>
                  ) : (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                      Not connected
                    </span>
                  )}
                </div>

                {account && (
                  <p className="mt-1 text-sm text-gray-500">
                    {account.handle}
                    {account.tokenExpiry && (
                      <span className="ml-2 text-xs text-gray-400">
                        · expires {account.tokenExpiry.toLocaleDateString()}
                      </span>
                    )}
                  </p>
                )}
              </div>

              {config.configured ? (
                <a
                  href={config.oauthPath}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {account ? 'Reconnect' : 'Connect'}
                </a>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">
                    Set these env vars to enable:
                  </p>
                  <ul className="space-y-0.5">
                    {config.envVars.map((v) => (
                      <li key={v} className="font-mono text-xs text-gray-400">
                        {v}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={config.setupDocs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted/60 mt-1 inline-block text-xs hover:underline"
                  >
                    Create app →
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border bg-amber-50 p-4 text-xs text-amber-800">
        <strong>Security:</strong> Access tokens are stored server-side only and
        are never sent to the browser. Reconnect if the token shows as expired.
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: passes. `SocialAccount.platform` is typed as the Prisma `Platform` enum; `accountByPlatform` is keyed by `string` via `.get(config.platform)` where `config.platform` is a literal union member of `Platform` — this matches menhealth's working version, so it should compile the same way.

- [ ] **Step 3: Commit**

```bash
git add "apps/hype-check/app/admin/(protected)/social/accounts/page.tsx"
git commit -m "feat(social): add TikTok account connection to hype-check's accounts page"
```

---

### Task 16: `generate/[platform]/page.tsx` — thread video props

**Files:**
- Modify: `apps/hype-check/app/admin/(protected)/social/generate/[platform]/page.tsx`

**Interfaces:**
- Produces: passes `post.videoUrl`, `post.videoStatus`, `post.videoError` into `<DraftActions>` (Task 14).

- [ ] **Step 1: Add the three props to the `<DraftActions>` call**

Find the existing call (around the current end of the file):

```tsx
              <DraftActions
                postId={post.id}
                platform={post.platform}
                status={post.status}
                riskLevel={post.riskLevel}
                requiresReview={post.requiresReview}
                initialScheduledAt={post.scheduledAt?.toISOString() ?? null}
                caption={post.caption}
              />
```

Replace with:

```tsx
              <DraftActions
                postId={post.id}
                platform={post.platform}
                status={post.status}
                riskLevel={post.riskLevel}
                requiresReview={post.requiresReview}
                initialScheduledAt={post.scheduledAt?.toISOString() ?? null}
                caption={post.caption}
                videoUrl={post.videoUrl}
                videoStatus={post.videoStatus}
                videoError={post.videoError}
              />
```

Do not touch `db.sourceVideo.findUnique(...)` a few lines above — that is hype-check's existing model name and must stay as-is (menhealth's equivalent uses `db.video`, a naming difference unrelated to this feature).

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add "apps/hype-check/app/admin/(protected)/social/generate/[platform]/page.tsx"
git commit -m "fix(social): thread video props into hype-check's generate-page DraftActions call"
```

---

### Task 17: Port TikTok adapter tests

**Files:**
- Modify: `apps/hype-check/__tests__/social-adapters.test.ts`

**Interfaces:**
- Consumes: `TikTokAdapter` (Task 3).

- [ ] **Step 1: Update the imports and `PartialPost` type**

Replace the top of the file:

```ts
import { describe, it, expect } from "vitest";
import { XAdapter } from "@/lib/social/adapters/x";
import { RedditAdapter } from "@/lib/social/adapters/reddit";
```

with:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { XAdapter } from "@/lib/social/adapters/x";
import { RedditAdapter } from "@/lib/social/adapters/reddit";
import { TikTokAdapter } from "@/lib/social/adapters/tiktok";
```

In the `PartialPost` type, add two fields after `templateId: string | null;`:

```ts
  templateId: string | null;
  videoUrl: string | null;
  videoStatus: string | null;
```

In `makePost`'s default object, add the same two fields (with `null` defaults) after `templateId: null,`:

```ts
    templateId: null,
    videoUrl: null,
    videoStatus: null,
```

- [ ] **Step 2: Append the TikTok test suites**

At the end of the file (after the closing `});` of the `"XAdapter.createDraft() — not supported"` describe block), append:

```ts
// ---------------------------------------------------------------------------
// TikTok adapter — validate()
// ---------------------------------------------------------------------------

function makeTikTokPost(overrides: PartialPost = {}) {
  return makePost({
    platform: "TIKTOK",
    status: "APPROVED",
    caption: "Legit or hype? Let's check the numbers.",
    hashtags: ["HypeCheck"],
    videoUrl: "https://blob.example.com/social-videos/1.mp4",
    videoStatus: "READY",
    ...overrides,
  });
}

describe("TikTokAdapter.validate()", () => {
  const adapter = new TikTokAdapter();

  it("accepts an approved post with a ready video", async () => {
    const result = await adapter.validate(makeTikTokPost());
    expect(result.ok).toBe(true);
  });

  it("rejects a post that is not APPROVED", async () => {
    const result = await adapter.validate(
      makeTikTokPost({ status: "PENDING_REVIEW" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toMatch(/APPROVED/);
    }
  });

  it("rejects a post with no generated video", async () => {
    const result = await adapter.validate(
      makeTikTokPost({ videoUrl: null, videoStatus: null }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toMatch(/video/i);
    }
  });

  it("rejects a post whose video is still generating", async () => {
    const result = await adapter.validate(
      makeTikTokPost({ videoStatus: "GENERATING" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toMatch(/video/i);
    }
  });

  it("rejects an oversized caption", async () => {
    const result = await adapter.validate(
      makeTikTokPost({ caption: "A".repeat(2201) }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toMatch(/2200/);
    }
  });
});

// ---------------------------------------------------------------------------
// TikTok adapter — publish()
// ---------------------------------------------------------------------------

describe("TikTokAdapter.publish()", () => {
  const db = {
    socialAccount: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    db.socialAccount.findUnique.mockReset();
    db.socialAccount.update.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fails validation before attempting any network call", async () => {
    const adapter = new TikTokAdapter({
      clientId: "id",
      clientSecret: "secret",
      db,
    });
    const result = await adapter.publish(
      makeTikTokPost({ videoUrl: null, videoStatus: null }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("VALIDATION_FAILED");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("publishes and returns the public video URL once TikTok reports completion", async () => {
    db.socialAccount.findUnique.mockResolvedValue({
      accessToken: "token",
      refreshToken: null,
      tokenExpiry: new Date(Date.now() + 3600_000),
      handle: "hypecheck",
    });

    fetchMock
      // video fetch
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })
      // init
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            data: { publish_id: "pub_1", upload_url: "https://upload.example.com" },
          }),
      })
      // upload
      .mockResolvedValueOnce({ ok: true, text: async () => "" })
      // status poll
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            status: "PUBLISH_COMPLETE",
            publicly_available_post_id: [123],
          },
        }),
      });

    const adapter = new TikTokAdapter({
      clientId: "id",
      clientSecret: "secret",
      db,
    });
    const result = await adapter.publish(makeTikTokPost());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.platformPostId).toBe("pub_1");
      expect(result.platformUrl).toBe(
        "https://www.tiktok.com/@hypecheck/video/123",
      );
    }
  }, 15000);

  it("returns an error when the init call fails", async () => {
    db.socialAccount.findUnique.mockResolvedValue({
      accessToken: "token",
      refreshToken: null,
      tokenExpiry: new Date(Date.now() + 3600_000),
      handle: "hypecheck",
    });

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "bad request",
      });

    const adapter = new TikTokAdapter({
      clientId: "id",
      clientSecret: "secret",
      db,
    });
    const result = await adapter.publish(makeTikTokPost());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("TIKTOK_INIT_400");
  });

  it("createDraft() returns NOT_SUPPORTED", async () => {
    const adapter = new TikTokAdapter();
    const result = await adapter.createDraft(makeTikTokPost());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("NOT_SUPPORTED");
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `pnpm --filter hype-check exec vitest run social-adapters`
Expected: PASS — all existing X/Reddit suites plus the new TikTok suites green.

- [ ] **Step 4: Run the full hype-check test suite and typecheck**

Run: `pnpm --filter hype-check test && pnpm --filter hype-check typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/hype-check/__tests__/social-adapters.test.ts
git commit -m "test(social): port TikTok adapter test coverage to hype-check"
```

---

## Final verification

- [ ] Run `pnpm --filter hype-check typecheck && pnpm --filter hype-check test && pnpm --filter hype-check lint`
- [ ] Manually start hype-check's dev server, sign in as admin, open a TikTok or YouTube Community draft, and confirm the "Video" section renders with a working "Generate video" button, and `/admin/social/accounts` shows both X and TikTok connect cards using hype-check's existing visual style.
- [ ] Confirm the Task 1 migration was applied to a real database before this ships to production (flag this explicitly to the user if it could not be run in the implementation environment).
