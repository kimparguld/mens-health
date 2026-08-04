# Topic Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a periodic topic-discovery pipeline — AI-brainstormed, YouTube-popularity-scored topic candidates queued for admin approve/reject — to `hype-check` first, then mirrored to `menhealth`, so new topic hubs can be added without hand-editing `site.config.ts`.

**Architecture:** Pure scoring/classification/merge functions live once in `packages/core-youtube` (shared by both apps, same package that already holds YouTube-client and video-scoring logic). Each app gets its own `TopicSuggestion` Prisma model, an AI-candidate-generation module (mirrors the existing `extract-warnings-costs-disclosures.ts` pattern: prompt → JSON → Zod-validated `Result<T>`), an orchestrating job, a cron route, and an admin review UI. Approved suggestions are never written into `site.config.ts` — they're merged into the working topic list at runtime and flow through the exact same `sync-youtube` pipeline as hardcoded topics.

**Tech Stack:** TypeScript, Next.js App Router route handlers, Prisma, Zod, Vitest, the existing `@menhealth/core-youtube` / `@menhealth/core-ai` packages.

## Global Constraints

- Never auto-add a topic to the live pipeline — every `TopicSuggestion` requires explicit admin approval via the existing session-gated `/admin` auth check (`lib/auth`, `session.user.isAdmin`).
- `site.config.ts` stays the hand-authored baseline; nothing in this feature writes to it.
- Approved topics go through the same per-video AI/compliance/risk-gating pipeline as hardcoded topics — no bypass.
- All external I/O (AI responses) validated with Zod at the boundary.
- No magic numbers — named constants for thresholds (popularity floor, candidate count, search-result count, evidence sample size).
- Follow each file's existing quote-style convention when editing it; use double quotes in new `.ts`/`.tsx` files (matches the dominant style in `jobs/`, `lib/`, `site.config.ts` across both apps).

---

### Task 1: Shared topic-discovery pure functions (`packages/core-youtube`)

**Files:**
- Create: `packages/core-youtube/src/topic-discovery.ts`
- Modify: `packages/core-youtube/src/index.ts`
- Test: `apps/hype-check/__tests__/topic-discovery.test.ts`

**Interfaces:**
- Produces: `TopicCandidateSchema` (Zod schema), `type TopicCandidate = { slug: string; name: string; query: string; description: string }`, `type TopicSeedLike = { slug: string; name: string; query: string; isHighRisk: boolean; description: string }`, `scoreTopicPopularity(videos: { viewCount: number; publishedAt: Date }[], now?: Date): number`, `isHighRiskCandidate(candidate: { name: string; description: string; query: string }, keywords: string[]): boolean`, `mergeTopicSeeds(seeds: TopicSeedLike[], approved: TopicSeedLike[]): TopicSeedLike[]` — all consumed by Tasks 3, 6, 9, 12.

- [ ] **Step 1: Write the failing test**

Create `apps/hype-check/__tests__/topic-discovery.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  scoreTopicPopularity,
  isHighRiskCandidate,
  mergeTopicSeeds,
} from "@menhealth/core-youtube";

describe("scoreTopicPopularity", () => {
  it("returns 0 for an empty list", () => {
    expect(scoreTopicPopularity([])).toBe(0);
  });

  it("ignores videos published outside the 90-day window", () => {
    const now = new Date("2026-08-04T00:00:00Z");
    const old = new Date("2026-01-01T00:00:00Z");
    const result = scoreTopicPopularity(
      [{ viewCount: 1_000_000, publishedAt: old }],
      now,
    );
    expect(result).toBe(0);
  });

  it("returns the median view count among recent videos (odd count)", () => {
    const now = new Date("2026-08-04T00:00:00Z");
    const recent = new Date("2026-07-20T00:00:00Z");
    const result = scoreTopicPopularity(
      [
        { viewCount: 100, publishedAt: recent },
        { viewCount: 500, publishedAt: recent },
        { viewCount: 300, publishedAt: recent },
      ],
      now,
    );
    expect(result).toBe(300);
  });

  it("returns the averaged median for an even count", () => {
    const now = new Date("2026-08-04T00:00:00Z");
    const recent = new Date("2026-07-20T00:00:00Z");
    const result = scoreTopicPopularity(
      [
        { viewCount: 100, publishedAt: recent },
        { viewCount: 200, publishedAt: recent },
        { viewCount: 300, publishedAt: recent },
        { viewCount: 400, publishedAt: recent },
      ],
      now,
    );
    expect(result).toBe(250);
  });
});

describe("isHighRiskCandidate", () => {
  const keywords = ["testosterone", "trt", "cancer"];

  it("matches a keyword in the name, description, or query", () => {
    expect(
      isHighRiskCandidate(
        { name: "TRT Basics", description: "x", query: "x" },
        keywords,
      ),
    ).toBe(true);
    expect(
      isHighRiskCandidate(
        { name: "x", description: "Understanding cancer risk", query: "x" },
        keywords,
      ),
    ).toBe(true);
    expect(
      isHighRiskCandidate(
        { name: "x", description: "x", query: "testosterone levels" },
        keywords,
      ),
    ).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(
      isHighRiskCandidate(
        { name: "TESTOSTERONE Guide", description: "x", query: "x" },
        keywords,
      ),
    ).toBe(true);
  });

  it("returns false when nothing matches", () => {
    expect(
      isHighRiskCandidate(
        { name: "Sleep Hygiene", description: "Better rest", query: "sleep" },
        keywords,
      ),
    ).toBe(false);
  });
});

describe("mergeTopicSeeds", () => {
  const base = {
    slug: "sleep",
    name: "Sleep",
    query: "sleep men health",
    isHighRisk: false,
    description: "Sleep quality",
  };

  it("appends approved suggestions not already present", () => {
    const approved = {
      slug: "grip-strength",
      name: "Grip Strength",
      query: "grip strength training",
      isHighRisk: false,
      description: "Grip strength training and testing",
    };
    const result = mergeTopicSeeds([base], [approved]);
    expect(result).toEqual([base, approved]);
  });

  it("lets the static seed win on a slug conflict", () => {
    const conflicting = { ...base, name: "Suggested Sleep Topic" };
    const result = mergeTopicSeeds([base], [conflicting]);
    expect(result).toEqual([base]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter hype-check test -- topic-discovery`
Expected: FAIL — `@menhealth/core-youtube` has no export named `scoreTopicPopularity` (module doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `packages/core-youtube/src/topic-discovery.ts`:

```ts
import { z } from "zod";

export const TopicCandidateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be lowercase kebab-case"),
  name: z.string().min(1).max(80),
  query: z.string().min(1).max(200),
  description: z.string().min(1).max(400),
});

export type TopicCandidate = z.infer<typeof TopicCandidateSchema>;

export type TopicSeedLike = {
  slug: string;
  name: string;
  query: string;
  isHighRisk: boolean;
  description: string;
};

const POPULARITY_WINDOW_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Median view count among videos published within the last
 * `POPULARITY_WINDOW_DAYS` days — recency-filtered so a single old viral
 * video can't prop up a currently-dead niche. Returns 0 if no videos
 * qualify.
 */
export function scoreTopicPopularity(
  videos: { viewCount: number; publishedAt: Date }[],
  now: Date = new Date(),
): number {
  const cutoff = new Date(now.getTime() - POPULARITY_WINDOW_DAYS * MS_PER_DAY);
  const recentViewCounts = videos
    .filter((video) => video.publishedAt >= cutoff)
    .map((video) => video.viewCount)
    .sort((a, b) => a - b);

  if (recentViewCounts.length === 0) return 0;

  const mid = Math.floor(recentViewCounts.length / 2);
  return recentViewCounts.length % 2 === 0
    ? Math.round((recentViewCounts[mid - 1]! + recentViewCounts[mid]!) / 2)
    : recentViewCounts[mid]!;
}

/** Case-insensitive substring match of any keyword against the candidate's combined text. */
export function isHighRiskCandidate(
  candidate: { name: string; description: string; query: string },
  keywords: string[],
): boolean {
  const haystack =
    `${candidate.name} ${candidate.description} ${candidate.query}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

/** Dedupes by slug — the static seed list always wins over an approved suggestion. */
export function mergeTopicSeeds(
  seeds: TopicSeedLike[],
  approved: TopicSeedLike[],
): TopicSeedLike[] {
  const merged = new Map(seeds.map((seed) => [seed.slug, seed]));
  for (const candidate of approved) {
    if (!merged.has(candidate.slug)) {
      merged.set(candidate.slug, candidate);
    }
  }
  return Array.from(merged.values());
}
```

Modify `packages/core-youtube/src/index.ts` — add:

```ts
export {
  TopicCandidateSchema,
  scoreTopicPopularity,
  isHighRiskCandidate,
  mergeTopicSeeds,
} from "./topic-discovery";
export type { TopicCandidate, TopicSeedLike } from "./topic-discovery";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter hype-check test -- topic-discovery`
Expected: PASS (all cases in Step 1)

- [ ] **Step 5: Commit**

```bash
git add packages/core-youtube/src/topic-discovery.ts packages/core-youtube/src/index.ts apps/hype-check/__tests__/topic-discovery.test.ts
git commit -m "feat: add shared topic-discovery scoring/classification helpers"
```

---

### Task 2: `hype-check` — `TopicSuggestion` Prisma model

**Files:**
- Modify: `apps/hype-check/prisma/schema.prisma`

**Interfaces:**
- Produces: `db.topicSuggestion` (fields: `id`, `slug` (unique), `name`, `query`, `description`, `suggestedIsHighRisk`, `popularityScore`, `evidence` (Json), `status` (`SuggestionStatus`), `createdAt`, `reviewedAt`) — consumed by Tasks 4, 5, 6, 7.

- [ ] **Step 1: Add the model and enum**

In `apps/hype-check/prisma/schema.prisma`, add directly below the existing `model Topic { ... }` block (around line 171, right after its closing `}`):

```prisma
/// A candidate topic surfaced by the automated discovery job — requires
/// explicit admin approval before it's merged into the live topic list
/// (see getAllTopicSeeds in lib/youtube/topics.ts). Never auto-promoted.
model TopicSuggestion {
  id                  String           @id @default(cuid())
  slug                String           @unique
  name                String
  query               String
  description         String
  suggestedIsHighRisk Boolean          @default(false)
  popularityScore     Int
  evidence            Json
  status              SuggestionStatus @default(PENDING)
  createdAt           DateTime         @default(now())
  reviewedAt          DateTime?
}
```

Add the enum next to the other single-model enums (near `enum SubmissionStatus { ... }`, around line 566):

```prisma
enum SuggestionStatus {
  PENDING
  APPROVED
  REJECTED
}
```

- [ ] **Step 2: Regenerate the Prisma client**

Run: `pnpm --filter hype-check exec prisma generate`
Expected: `Generated Prisma Client` with no errors. (This only reads the schema file — it does not require a database connection, so it's safe to run here. Applying the schema to the real database via `prisma db push` is a separate, deploy-time step outside this plan's scope — this repo has no `prisma/migrations` directory, so schema application is already handled manually by the maintainer.)

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: PASS (no compile errors; `db.topicSuggestion` now exists on the generated client type)

- [ ] **Step 4: Commit**

```bash
git add apps/hype-check/prisma/schema.prisma
git commit -m "feat(hype-check): add TopicSuggestion model"
```

---

### Task 3: `hype-check` — AI candidate generation module

**Files:**
- Create: `apps/hype-check/lib/topics/discover-candidates.ts`
- Test: `apps/hype-check/__tests__/discover-candidates.test.ts`

**Interfaces:**
- Consumes: `TopicCandidateSchema`, `type TopicCandidate` from `@menhealth/core-youtube` (Task 1); `aiClient` from `@/lib/ai/client`; `SITE_NAME`, `SITE_DESCRIPTION` from `@/lib/site-brand`; `type Result` from `@menhealth/core-ai`.
- Produces: `validateCandidatesResponse(raw: unknown): Result<TopicCandidate[]>`, `discoverTopicCandidates(excludeSlugs: string[]): Promise<Result<TopicCandidate[]>>` — consumed by Task 4.

- [ ] **Step 1: Write the failing test**

Create `apps/hype-check/__tests__/discover-candidates.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateCandidatesResponse } from "@/lib/topics/discover-candidates";

describe("validateCandidatesResponse", () => {
  it("accepts a well-formed candidate array", () => {
    const raw = [
      {
        slug: "grip-strength",
        name: "Grip Strength",
        query: "grip strength training",
        description: "Grip strength training and testing.",
      },
    ];
    const result = validateCandidatesResponse(raw);
    expect(result.ok).toBe(true);
  });

  it("rejects a non-kebab-case slug", () => {
    const raw = [
      {
        slug: "Grip Strength",
        name: "Grip Strength",
        query: "grip strength training",
        description: "Grip strength training and testing.",
      },
    ];
    const result = validateCandidatesResponse(raw);
    expect(result.ok).toBe(false);
  });

  it("rejects more than 5 candidates", () => {
    const raw = Array.from({ length: 6 }, (_, i) => ({
      slug: `topic-${i}`,
      name: `Topic ${i}`,
      query: `topic ${i} query`,
      description: `Description ${i}`,
    }));
    const result = validateCandidatesResponse(raw);
    expect(result.ok).toBe(false);
  });

  it("rejects non-array input", () => {
    const result = validateCandidatesResponse({ not: "an array" });
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter hype-check test -- discover-candidates`
Expected: FAIL — cannot find module `@/lib/topics/discover-candidates`

- [ ] **Step 3: Write minimal implementation**

Create `apps/hype-check/lib/topics/discover-candidates.ts`:

```ts
import { aiClient } from "@/lib/ai/client";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/site-brand";
import { TopicCandidateSchema, type TopicCandidate } from "@menhealth/core-youtube";
import type { Result } from "@menhealth/core-ai";

const CANDIDATE_COUNT = 5;

// Pulled out from discoverTopicCandidates so the parsing/validation step
// can be unit tested without a live AI call.
export function validateCandidatesResponse(
  raw: unknown,
): Result<TopicCandidate[]> {
  const validated = TopicCandidateSchema.array()
    .max(CANDIDATE_COUNT)
    .safeParse(raw);
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

export async function discoverTopicCandidates(
  excludeSlugs: string[],
): Promise<Result<TopicCandidate[]>> {
  const prompt = `You are a content strategist for ${SITE_NAME}. ${SITE_DESCRIPTION}

Suggest ${CANDIDATE_COUNT} new topic ideas this site could add, in the same niche, that are NOT already covered.

Topics already covered (do not repeat these slugs or close variants): ${excludeSlugs.join(", ") || "none"}

Respond with a JSON array of exactly ${CANDIDATE_COUNT} objects:
[{ "slug": "lowercase-kebab-case", "name": "Display Name", "query": "youtube search query for this topic", "description": "one sentence describing the topic" }]

Respond ONLY with the JSON array. No markdown, no explanation.`;

  try {
    const message = await aiClient.anthropic.messages.create({
      model: aiClient.defaultModel,
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ok: false, error: new Error("No text content in AI response") };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      return {
        ok: false,
        error: new Error(
          `AI response was not valid JSON: ${textBlock.text.slice(0, 200)}`,
        ),
      };
    }

    return validateCandidatesResponse(parsed);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter hype-check test -- discover-candidates`
Expected: PASS (all cases in Step 1)

- [ ] **Step 5: Commit**

```bash
git add apps/hype-check/lib/topics/discover-candidates.ts apps/hype-check/__tests__/discover-candidates.test.ts
git commit -m "feat(hype-check): add AI topic-candidate generation module"
```

---

### Task 4: `hype-check` — discovery job

**Files:**
- Create: `apps/hype-check/jobs/discover-topics.ts`

**Interfaces:**
- Consumes: `discoverTopicCandidates` (Task 3); `scoreTopicPopularity`, `isHighRiskCandidate` from `@menhealth/core-youtube` (Task 1); `searchAndEnrichVideos` from `@/lib/youtube/client`; `db.topicSuggestion` (Task 2); `TOPIC_SEEDS` from `@/lib/youtube/topics`; `siteConfig.highRiskTopicKeywords` from `@/site.config`.
- Produces: `discoverTopics(): Promise<{ evaluated: number; created: number; errors: number }>` — consumed by Task 5.

- [ ] **Step 1: Write the implementation**

Create `apps/hype-check/jobs/discover-topics.ts`:

```ts
import { db } from "@/lib/db/prisma";
import { siteConfig } from "@/site.config";
import { searchAndEnrichVideos } from "@/lib/youtube/client";
import { discoverTopicCandidates } from "@/lib/topics/discover-candidates";
import { TOPIC_SEEDS } from "@/lib/youtube/topics";
import { scoreTopicPopularity, isHighRiskCandidate } from "@menhealth/core-youtube";

// Median views (last 90 days) across a candidate's top search results.
// Low enough to catch a genuinely emerging niche, high enough to filter out
// queries with no real audience on YouTube.
const MIN_POPULARITY_SCORE = 5_000;
const SEARCH_RESULTS_PER_CANDIDATE = 10;
const EVIDENCE_SAMPLE_SIZE = 3;

export async function discoverTopics(): Promise<{
  evaluated: number;
  created: number;
  errors: number;
}> {
  let evaluated = 0;
  let created = 0;
  let errors = 0;

  const existingSuggestions = await db.topicSuggestion.findMany({
    select: { slug: true },
  });
  const excludeSlugs = [
    ...TOPIC_SEEDS.map((topic) => topic.slug),
    ...existingSuggestions.map((suggestion) => suggestion.slug),
  ];

  const candidatesResult = await discoverTopicCandidates(excludeSlugs);
  if (!candidatesResult.ok) {
    console.error(
      "Topic candidate generation failed:",
      candidatesResult.error,
    );
    return { evaluated: 0, created: 0, errors: 1 };
  }

  for (const candidate of candidatesResult.value) {
    if (excludeSlugs.includes(candidate.slug)) continue;
    evaluated++;

    try {
      const videos = await searchAndEnrichVideos(
        candidate.query,
        SEARCH_RESULTS_PER_CANDIDATE,
      );

      const popularityScore = scoreTopicPopularity(
        videos.map((video) => ({
          viewCount: video.viewCount,
          publishedAt: video.publishedAt,
        })),
      );

      if (popularityScore < MIN_POPULARITY_SCORE) continue;

      const evidence = [...videos]
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, EVIDENCE_SAMPLE_SIZE)
        .map((video) => ({ title: video.title, viewCount: video.viewCount }));

      const suggestedIsHighRisk = isHighRiskCandidate(
        candidate,
        siteConfig.highRiskTopicKeywords,
      );

      await db.topicSuggestion.upsert({
        where: { slug: candidate.slug },
        create: {
          slug: candidate.slug,
          name: candidate.name,
          query: candidate.query,
          description: candidate.description,
          suggestedIsHighRisk,
          popularityScore,
          evidence,
        },
        update: {},
      });
      created++;
    } catch (error) {
      console.error(
        `Error evaluating topic candidate "${candidate.slug}":`,
        error,
      );
      errors++;
    }
  }

  return { evaluated, created, errors };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/hype-check/jobs/discover-topics.ts
git commit -m "feat(hype-check): add discover-topics orchestration job"
```

---

### Task 5: `hype-check` — cron route + schedule

**Files:**
- Create: `apps/hype-check/app/api/cron/discover-topics/route.ts`
- Modify: `apps/hype-check/vercel.json`

**Interfaces:**
- Consumes: `discoverTopics` (Task 4); `env.CRON_SECRET` from `@/env`.

- [ ] **Step 1: Write the route**

Create `apps/hype-check/app/api/cron/discover-topics/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { discoverTopics } from "@/jobs/discover-topics";
import { env } from "@/env";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await discoverTopics();
  return NextResponse.json(result);
}
```

- [ ] **Step 2: Add the cron schedule**

In `apps/hype-check/vercel.json`, add to the `crons` array (monthly — frequent enough to catch shifting trends, infrequent enough to keep AI/YouTube-quota cost low):

```json
    {
      "path": "/api/cron/discover-topics",
      "schedule": "0 6 1 * *"
    }
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/hype-check/app/api/cron/discover-topics/route.ts apps/hype-check/vercel.json
git commit -m "feat(hype-check): schedule monthly topic-discovery cron"
```

---

### Task 6: `hype-check` — merge approved suggestions into the sync pipeline

**Files:**
- Modify: `apps/hype-check/lib/youtube/topics.ts`
- Modify: `apps/hype-check/jobs/sync-youtube.ts`
- Test: `apps/hype-check/__tests__/topics.test.ts`

**Interfaces:**
- Consumes: `mergeTopicSeeds` from `@menhealth/core-youtube` (Task 1); `db.topicSuggestion` (Task 2).
- Produces: `getAllTopicSeeds(): Promise<TopicSeedLike[]>` — consumed by Task 7 (admin page).

- [ ] **Step 1: Write the failing test**

Create `apps/hype-check/__tests__/topics.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  db: { topicSuggestion: { findMany: vi.fn() } },
}));

const { db } = await import("@/lib/db/prisma");
const { getAllTopicSeeds, TOPIC_SEEDS } = await import("@/lib/youtube/topics");

describe("getAllTopicSeeds", () => {
  it("merges approved suggestions after the static seeds", async () => {
    vi.mocked(db.topicSuggestion.findMany).mockResolvedValue([
      {
        id: "1",
        slug: "grip-strength",
        name: "Grip Strength",
        query: "grip strength training",
        description: "Grip strength training and testing.",
        suggestedIsHighRisk: false,
        popularityScore: 10_000,
        evidence: [],
        status: "APPROVED",
        createdAt: new Date(),
        reviewedAt: new Date(),
      } as never,
    ]);

    const result = await getAllTopicSeeds();
    expect(result).toHaveLength(TOPIC_SEEDS.length + 1);
    expect(result.at(-1)).toMatchObject({ slug: "grip-strength" });
    expect(db.topicSuggestion.findMany).toHaveBeenCalledWith({
      where: { status: "APPROVED" },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter hype-check test -- topics.test`
Expected: FAIL — `getAllTopicSeeds` is not exported from `@/lib/youtube/topics`

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `apps/hype-check/lib/youtube/topics.ts`:

```ts
import { siteConfig } from "@/site.config";
import { db } from "@/lib/db/prisma";
import { mergeTopicSeeds, type TopicSeedLike } from "@menhealth/core-youtube";

export type { TopicSeed } from "@menhealth/site-kit";
export const TOPIC_SEEDS = siteConfig.topics;

// Static seeds from site.config.ts plus any admin-approved TopicSuggestion
// rows, merged at runtime. Approved suggestions never get written back into
// site.config.ts — this is how they reach sync-youtube and the admin
// topics table without a code change.
export async function getAllTopicSeeds(): Promise<TopicSeedLike[]> {
  const approved = await db.topicSuggestion.findMany({
    where: { status: "APPROVED" },
  });
  return mergeTopicSeeds(
    TOPIC_SEEDS,
    approved.map((suggestion) => ({
      slug: suggestion.slug,
      name: suggestion.name,
      query: suggestion.query,
      isHighRisk: suggestion.suggestedIsHighRisk,
      description: suggestion.description,
    })),
  );
}
```

In `apps/hype-check/jobs/sync-youtube.ts`, change the import:

```ts
import { getAllTopicSeeds } from "@/lib/youtube/topics";
```

(replacing the existing `import { TOPIC_SEEDS } from "@/lib/youtube/topics";`)

And inside `syncYouTubeVideos()`, right after the `let errors = 0;` line, add:

```ts
  const topics = await getAllTopicSeeds();
```

then change `for (const topic of TOPIC_SEEDS) {` to `for (const topic of topics) {`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter hype-check test -- topics.test`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/hype-check/lib/youtube/topics.ts apps/hype-check/jobs/sync-youtube.ts apps/hype-check/__tests__/topics.test.ts
git commit -m "feat(hype-check): merge approved topic suggestions into sync pipeline"
```

---

### Task 7: `hype-check` — admin review UI

**Files:**
- Modify: `apps/hype-check/app/admin/(protected)/topics/page.tsx`
- Create: `apps/hype-check/app/admin/(protected)/topics/TopicSuggestionActions.tsx`
- Create: `apps/hype-check/app/api/admin/topic-suggestions/[id]/route.ts`

**Interfaces:**
- Consumes: `getAllTopicSeeds` (Task 6); `db.topicSuggestion` (Task 2); `auth` from `@/lib/auth` (existing admin session check, same pattern as `apps/hype-check/app/api/admin/cost-items/[id]/route.ts`).

- [ ] **Step 1: Write the approve/reject route**

Create `apps/hype-check/app/api/admin/topic-suggestions/[id]/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";
import type { NextRequest } from "next/server";

const ReviewActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = ReviewActionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const existing = await db.topicSuggestion.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Topic suggestion not found" }, { status: 404 });
  }

  const suggestion = await db.topicSuggestion.update({
    where: { id },
    data: {
      status: parsed.data.action === "approve" ? "APPROVED" : "REJECTED",
      reviewedAt: new Date(),
    },
  });

  return Response.json({ ok: true, suggestion });
}
```

- [ ] **Step 2: Write the client action buttons**

Create `apps/hype-check/app/admin/(protected)/topics/TopicSuggestionActions.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TopicSuggestionActions({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  async function review(action: "approve" | "reject") {
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/topic-suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => review("approve")}
        disabled={loading !== null}
        className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        {loading === "approve" ? "Approving…" : "Approve"}
      </button>
      <button
        onClick={() => review("reject")}
        disabled={loading !== null}
        className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
      >
        {loading === "reject" ? "Rejecting…" : "Reject"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Wire the admin page**

Modify `apps/hype-check/app/admin/(protected)/topics/page.tsx`:

- Replace `import { TOPIC_SEEDS } from '@/lib/youtube/topics';` with `import { getAllTopicSeeds } from '@/lib/youtube/topics';` and add `import { TopicSuggestionActions } from './TopicSuggestionActions';`.
- At the top of `AdminTopicsPage`, add:
  ```ts
  const topicSeeds = await getAllTopicSeeds();
  const pendingSuggestions = await db.topicSuggestion.findMany({
    where: { status: 'PENDING' },
    orderBy: { popularityScore: 'desc' },
  });
  ```
- Change the existing table's `{TOPIC_SEEDS.map((t) => {` to `{topicSeeds.map((t) => {`.
- After the closing `</div>` of the existing amber note box, add a new section:
  ```tsx
  {pendingSuggestions.length > 0 && (
    <div className="mt-8">
      <h2 className="mb-2 text-lg font-semibold text-gray-900">
        Suggested topics
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        Surfaced by the monthly discovery job from current YouTube search
        volume. Approving merges a topic into the live pipeline at runtime —
        it does not edit site.config.ts. Rejecting is permanent; the same
        slug will not be re-suggested.
      </p>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Query</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Suggested risk</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Popularity</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Evidence</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pendingSuggestions.map((s) => {
              const evidence = s.evidence as { title: string; viewCount: number }[];
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500">{s.query}</td>
                  <td className="px-4 py-3">
                    {s.suggestedIsHighRisk ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        High
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Normal
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.popularityScore.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {evidence.map((v) => v.title).join('; ')}
                  </td>
                  <td className="px-4 py-3">
                    <TopicSuggestionActions id={s.id} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  )}
  ```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: PASS

- [ ] **Step 5: Lint**

Run: `pnpm --filter hype-check lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add "apps/hype-check/app/admin/(protected)/topics" apps/hype-check/app/api/admin/topic-suggestions
git commit -m "feat(hype-check): add admin review UI for topic suggestions"
```

---

### Task 8: `menhealth` — `TopicSuggestion` Prisma model

**Files:**
- Modify: `apps/menhealth/prisma/schema.prisma`

**Interfaces:**
- Produces: `db.topicSuggestion` (same shape as Task 2) — consumed by Tasks 10, 11, 12.

- [ ] **Step 1: Add the model**

In `apps/menhealth/prisma/schema.prisma`, add directly below the existing `model Topic { ... }` block (around line 124, right after its closing `}`, before `model VideoTopic`):

```prisma
model TopicSuggestion {
  id                  String           @id @default(cuid())
  slug                String           @unique
  name                String
  query               String
  description         String
  suggestedIsHighRisk Boolean          @default(false)
  popularityScore     Int
  evidence            Json
  status              SuggestionStatus @default(PENDING)
  createdAt           DateTime         @default(now())
  reviewedAt          DateTime?
}
```

- [ ] **Step 2: Add the enum**

In the `// ---- Enums ----` section (around line 300-310, next to `enum RiskLevel`), add:

```prisma
enum SuggestionStatus {
  PENDING
  APPROVED
  REJECTED
}
```

- [ ] **Step 3: Regenerate the Prisma client**

Run: `pnpm --filter menhealth exec prisma generate`
Expected: `Generated Prisma Client` with no errors.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter menhealth typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/menhealth/prisma/schema.prisma
git commit -m "feat(menhealth): add TopicSuggestion model"
```

---

### Task 9: `menhealth` — AI candidate generation module

**Files:**
- Create: `apps/menhealth/lib/topics/discover-candidates.ts`
- Test: `apps/menhealth/__tests__/discover-candidates.test.ts`

**Interfaces:**
- Consumes: `TopicCandidateSchema`, `type TopicCandidate` from `@menhealth/core-youtube` (Task 1); `aiClient` from `@/lib/ai/client`; `SITE_NAME`, `SITE_DESCRIPTION` from `@/lib/site-brand`; `type Result` from `@menhealth/core-ai`.
- Produces: `validateCandidatesResponse`, `discoverTopicCandidates` — consumed by Task 10.

This is the same module as Task 3, built in `apps/menhealth` instead of `apps/hype-check` — the code is identical because none of it is health-vs-hype-specific; site-specific behavior comes entirely from `SITE_NAME`/`SITE_DESCRIPTION` at call time.

- [ ] **Step 1: Write the failing test**

Create `apps/menhealth/__tests__/discover-candidates.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateCandidatesResponse } from "@/lib/topics/discover-candidates";

describe("validateCandidatesResponse", () => {
  it("accepts a well-formed candidate array", () => {
    const raw = [
      {
        slug: "grip-strength",
        name: "Grip Strength",
        query: "grip strength training",
        description: "Grip strength training and testing.",
      },
    ];
    const result = validateCandidatesResponse(raw);
    expect(result.ok).toBe(true);
  });

  it("rejects a non-kebab-case slug", () => {
    const raw = [
      {
        slug: "Grip Strength",
        name: "Grip Strength",
        query: "grip strength training",
        description: "Grip strength training and testing.",
      },
    ];
    const result = validateCandidatesResponse(raw);
    expect(result.ok).toBe(false);
  });

  it("rejects more than 5 candidates", () => {
    const raw = Array.from({ length: 6 }, (_, i) => ({
      slug: `topic-${i}`,
      name: `Topic ${i}`,
      query: `topic ${i} query`,
      description: `Description ${i}`,
    }));
    const result = validateCandidatesResponse(raw);
    expect(result.ok).toBe(false);
  });

  it("rejects non-array input", () => {
    const result = validateCandidatesResponse({ not: "an array" });
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter menhealth test -- discover-candidates`
Expected: FAIL — cannot find module `@/lib/topics/discover-candidates`

- [ ] **Step 3: Write minimal implementation**

Create `apps/menhealth/lib/topics/discover-candidates.ts`:

```ts
import { aiClient } from "@/lib/ai/client";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/site-brand";
import { TopicCandidateSchema, type TopicCandidate } from "@menhealth/core-youtube";
import type { Result } from "@menhealth/core-ai";

const CANDIDATE_COUNT = 5;

// Pulled out from discoverTopicCandidates so the parsing/validation step
// can be unit tested without a live AI call.
export function validateCandidatesResponse(
  raw: unknown,
): Result<TopicCandidate[]> {
  const validated = TopicCandidateSchema.array()
    .max(CANDIDATE_COUNT)
    .safeParse(raw);
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

export async function discoverTopicCandidates(
  excludeSlugs: string[],
): Promise<Result<TopicCandidate[]>> {
  const prompt = `You are a content strategist for ${SITE_NAME}. ${SITE_DESCRIPTION}

Suggest ${CANDIDATE_COUNT} new topic ideas this site could add, in the same niche, that are NOT already covered.

Topics already covered (do not repeat these slugs or close variants): ${excludeSlugs.join(", ") || "none"}

Respond with a JSON array of exactly ${CANDIDATE_COUNT} objects:
[{ "slug": "lowercase-kebab-case", "name": "Display Name", "query": "youtube search query for this topic", "description": "one sentence describing the topic" }]

Respond ONLY with the JSON array. No markdown, no explanation.`;

  try {
    const message = await aiClient.anthropic.messages.create({
      model: aiClient.defaultModel,
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ok: false, error: new Error("No text content in AI response") };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      return {
        ok: false,
        error: new Error(
          `AI response was not valid JSON: ${textBlock.text.slice(0, 200)}`,
        ),
      };
    }

    return validateCandidatesResponse(parsed);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter menhealth test -- discover-candidates`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/menhealth/lib/topics/discover-candidates.ts apps/menhealth/__tests__/discover-candidates.test.ts
git commit -m "feat(menhealth): add AI topic-candidate generation module"
```

---

### Task 10: `menhealth` — discovery job

**Files:**
- Create: `apps/menhealth/jobs/discover-topics.ts`

**Interfaces:**
- Consumes: same as Task 4, from `apps/menhealth`'s own `lib/topics/discover-candidates` (Task 9), `lib/youtube/client`, `lib/youtube/topics`, `site.config`.
- Produces: `discoverTopics(): Promise<{ evaluated: number; created: number; errors: number }>` — consumed by Task 11.

- [ ] **Step 1: Write the implementation**

Create `apps/menhealth/jobs/discover-topics.ts`:

```ts
import { db } from "@/lib/db/prisma";
import { siteConfig } from "@/site.config";
import { searchAndEnrichVideos } from "@/lib/youtube/client";
import { discoverTopicCandidates } from "@/lib/topics/discover-candidates";
import { TOPIC_SEEDS } from "@/lib/youtube/topics";
import { scoreTopicPopularity, isHighRiskCandidate } from "@menhealth/core-youtube";

// Median views (last 90 days) across a candidate's top search results.
// Low enough to catch a genuinely emerging niche, high enough to filter out
// queries with no real audience on YouTube.
const MIN_POPULARITY_SCORE = 5_000;
const SEARCH_RESULTS_PER_CANDIDATE = 10;
const EVIDENCE_SAMPLE_SIZE = 3;

export async function discoverTopics(): Promise<{
  evaluated: number;
  created: number;
  errors: number;
}> {
  let evaluated = 0;
  let created = 0;
  let errors = 0;

  const existingSuggestions = await db.topicSuggestion.findMany({
    select: { slug: true },
  });
  const excludeSlugs = [
    ...TOPIC_SEEDS.map((topic) => topic.slug),
    ...existingSuggestions.map((suggestion) => suggestion.slug),
  ];

  const candidatesResult = await discoverTopicCandidates(excludeSlugs);
  if (!candidatesResult.ok) {
    console.error(
      "Topic candidate generation failed:",
      candidatesResult.error,
    );
    return { evaluated: 0, created: 0, errors: 1 };
  }

  for (const candidate of candidatesResult.value) {
    if (excludeSlugs.includes(candidate.slug)) continue;
    evaluated++;

    try {
      const videos = await searchAndEnrichVideos(
        candidate.query,
        SEARCH_RESULTS_PER_CANDIDATE,
      );

      const popularityScore = scoreTopicPopularity(
        videos.map((video) => ({
          viewCount: video.viewCount,
          publishedAt: video.publishedAt,
        })),
      );

      if (popularityScore < MIN_POPULARITY_SCORE) continue;

      const evidence = [...videos]
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, EVIDENCE_SAMPLE_SIZE)
        .map((video) => ({ title: video.title, viewCount: video.viewCount }));

      const suggestedIsHighRisk = isHighRiskCandidate(
        candidate,
        siteConfig.highRiskTopicKeywords,
      );

      await db.topicSuggestion.upsert({
        where: { slug: candidate.slug },
        create: {
          slug: candidate.slug,
          name: candidate.name,
          query: candidate.query,
          description: candidate.description,
          suggestedIsHighRisk,
          popularityScore,
          evidence,
        },
        update: {},
      });
      created++;
    } catch (error) {
      console.error(
        `Error evaluating topic candidate "${candidate.slug}":`,
        error,
      );
      errors++;
    }
  }

  return { evaluated, created, errors };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter menhealth typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/menhealth/jobs/discover-topics.ts
git commit -m "feat(menhealth): add discover-topics orchestration job"
```

---

### Task 11: `menhealth` — cron route + schedule

**Files:**
- Create: `apps/menhealth/app/api/cron/discover-topics/route.ts`
- Modify: `apps/menhealth/vercel.json`

**Interfaces:**
- Consumes: `discoverTopics` (Task 10); `env.CRON_SECRET` from `@/env`.

- [ ] **Step 1: Write the route**

Create `apps/menhealth/app/api/cron/discover-topics/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { discoverTopics } from "@/jobs/discover-topics";
import { env } from "@/env";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await discoverTopics();
  return NextResponse.json(result);
}
```

- [ ] **Step 2: Add the cron schedule**

In `apps/menhealth/vercel.json`, add the same entry as Task 5, Step 2:

```json
    {
      "path": "/api/cron/discover-topics",
      "schedule": "0 6 1 * *"
    }
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter menhealth typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/menhealth/app/api/cron/discover-topics/route.ts apps/menhealth/vercel.json
git commit -m "feat(menhealth): schedule monthly topic-discovery cron"
```

---

### Task 12: `menhealth` — merge approved suggestions into the sync pipeline

**Files:**
- Modify: `apps/menhealth/lib/youtube/topics.ts`
- Modify: `apps/menhealth/jobs/sync-youtube.ts`
- Test: `apps/menhealth/__tests__/topics.test.ts`

**Interfaces:**
- Same as Task 6, in `apps/menhealth`.
- Produces: `getAllTopicSeeds(): Promise<TopicSeedLike[]>` — consumed by Task 13.

- [ ] **Step 1: Write the failing test**

Create `apps/menhealth/__tests__/topics.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  db: { topicSuggestion: { findMany: vi.fn() } },
}));

const { db } = await import("@/lib/db/prisma");
const { getAllTopicSeeds, TOPIC_SEEDS } = await import("@/lib/youtube/topics");

describe("getAllTopicSeeds", () => {
  it("merges approved suggestions after the static seeds", async () => {
    vi.mocked(db.topicSuggestion.findMany).mockResolvedValue([
      {
        id: "1",
        slug: "grip-strength",
        name: "Grip Strength",
        query: "grip strength training",
        description: "Grip strength training and testing.",
        suggestedIsHighRisk: false,
        popularityScore: 10_000,
        evidence: [],
        status: "APPROVED",
        createdAt: new Date(),
        reviewedAt: new Date(),
      } as never,
    ]);

    const result = await getAllTopicSeeds();
    expect(result).toHaveLength(TOPIC_SEEDS.length + 1);
    expect(result.at(-1)).toMatchObject({ slug: "grip-strength" });
    expect(db.topicSuggestion.findMany).toHaveBeenCalledWith({
      where: { status: "APPROVED" },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter menhealth test -- topics.test`
Expected: FAIL — `getAllTopicSeeds` is not exported from `@/lib/youtube/topics`

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `apps/menhealth/lib/youtube/topics.ts`:

```ts
import { siteConfig } from "@/site.config";
import { db } from "@/lib/db/prisma";
import { mergeTopicSeeds, type TopicSeedLike } from "@menhealth/core-youtube";

export type { TopicSeed } from "@menhealth/site-kit";
export const TOPIC_SEEDS = siteConfig.topics;

// Static seeds from site.config.ts plus any admin-approved TopicSuggestion
// rows, merged at runtime. Approved suggestions never get written back into
// site.config.ts — this is how they reach sync-youtube and the admin
// topics table without a code change.
export async function getAllTopicSeeds(): Promise<TopicSeedLike[]> {
  const approved = await db.topicSuggestion.findMany({
    where: { status: "APPROVED" },
  });
  return mergeTopicSeeds(
    TOPIC_SEEDS,
    approved.map((suggestion) => ({
      slug: suggestion.slug,
      name: suggestion.name,
      query: suggestion.query,
      isHighRisk: suggestion.suggestedIsHighRisk,
      description: suggestion.description,
    })),
  );
}
```

In `apps/menhealth/jobs/sync-youtube.ts`, change the import:

```ts
import { getAllTopicSeeds } from "@/lib/youtube/topics";
```

(replacing the existing `import { TOPIC_SEEDS } from "@/lib/youtube/topics";`)

And inside `syncYouTubeVideos()`, right after the `let errors = 0;` line, add:

```ts
  const topics = await getAllTopicSeeds();
```

then change `for (const topic of TOPIC_SEEDS) {` to `for (const topic of topics) {`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter menhealth test -- topics.test`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter menhealth typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/menhealth/lib/youtube/topics.ts apps/menhealth/jobs/sync-youtube.ts apps/menhealth/__tests__/topics.test.ts
git commit -m "feat(menhealth): merge approved topic suggestions into sync pipeline"
```

---

### Task 13: `menhealth` — admin review UI

**Files:**
- Modify: `apps/menhealth/app/admin/(protected)/topics/page.tsx`
- Create: `apps/menhealth/app/admin/(protected)/topics/TopicSuggestionActions.tsx`
- Create: `apps/menhealth/app/api/admin/topic-suggestions/[id]/route.ts`

**Interfaces:**
- Same as Task 7, in `apps/menhealth`. Check `apps/menhealth/lib/auth` for the exact admin-session-check shape used elsewhere in this app (e.g. `apps/menhealth/app/api/admin/jobs/process-now/route.ts`) before writing the route — it should match `const session = await auth(); if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) return Response.json({ error: "Forbidden" }, { status: 403 });`, the same pattern already confirmed for this app.

- [ ] **Step 1: Write the approve/reject route**

Create `apps/menhealth/app/api/admin/topic-suggestions/[id]/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";
import type { NextRequest } from "next/server";

const ReviewActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = ReviewActionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const existing = await db.topicSuggestion.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Topic suggestion not found" }, { status: 404 });
  }

  const suggestion = await db.topicSuggestion.update({
    where: { id },
    data: {
      status: parsed.data.action === "approve" ? "APPROVED" : "REJECTED",
      reviewedAt: new Date(),
    },
  });

  return Response.json({ ok: true, suggestion });
}
```

- [ ] **Step 2: Write the client action buttons**

Create `apps/menhealth/app/admin/(protected)/topics/TopicSuggestionActions.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TopicSuggestionActions({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  async function review(action: "approve" | "reject") {
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/topic-suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => review("approve")}
        disabled={loading !== null}
        className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        {loading === "approve" ? "Approving…" : "Approve"}
      </button>
      <button
        onClick={() => review("reject")}
        disabled={loading !== null}
        className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
      >
        {loading === "reject" ? "Rejecting…" : "Reject"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Wire the admin page**

Modify `apps/menhealth/app/admin/(protected)/topics/page.tsx`:

- Replace `import { TOPIC_SEEDS } from "@/lib/youtube/topics";` with `import { getAllTopicSeeds } from "@/lib/youtube/topics";` and add `import { TopicSuggestionActions } from "./TopicSuggestionActions";`.
- At the top of `AdminTopicsPage`, add:
  ```ts
  const topicSeeds = await getAllTopicSeeds();
  const pendingSuggestions = await db.topicSuggestion.findMany({
    where: { status: "PENDING" },
    orderBy: { popularityScore: "desc" },
  });
  ```
- Change the existing table's `{TOPIC_SEEDS.map((t) => {` to `{topicSeeds.map((t) => {`.
- After the closing `</div>` of the existing amber note box, add a new section:
  ```tsx
  {pendingSuggestions.length > 0 && (
    <div className="mt-8">
      <h2 className="mb-2 text-lg font-semibold text-gray-900">
        Suggested topics
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        Surfaced by the monthly discovery job from current YouTube search
        volume. Approving merges a topic into the live pipeline at runtime —
        it does not edit site.config.ts. Rejecting is permanent; the same
        slug will not be re-suggested.
      </p>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Query</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Suggested risk</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Popularity</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Evidence</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pendingSuggestions.map((s) => {
              const evidence = s.evidence as { title: string; viewCount: number }[];
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500">{s.query}</td>
                  <td className="px-4 py-3">
                    {s.suggestedIsHighRisk ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        High
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Normal
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.popularityScore.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {evidence.map((v) => v.title).join("; ")}
                  </td>
                  <td className="px-4 py-3">
                    <TopicSuggestionActions id={s.id} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  )}
  ```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter menhealth typecheck`
Expected: PASS

- [ ] **Step 5: Lint**

Run: `pnpm --filter menhealth lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add "apps/menhealth/app/admin/(protected)/topics" apps/menhealth/app/api/admin/topic-suggestions
git commit -m "feat(menhealth): add admin review UI for topic suggestions"
```

---

### Task 14: Full verification and PR

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: PASS across both apps and all packages

- [ ] **Step 2: Run the full typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Run the full lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin topic-discovery
gh pr create --title "Add topic-discovery suggestion pipeline (hype-check + menhealth)" --body "$(cat <<'EOF'
## Summary
- Adds a monthly job that asks the AI client for candidate topics, scores them against real YouTube search volume, and queues them as TopicSuggestion rows for admin approve/reject — no topic ever reaches the live pipeline without explicit approval.
- Ships to hype-check first, then mirrors the same feature to menhealth, sharing the scoring/classification/merge logic via packages/core-youtube.
- Approved suggestions merge into the working topic list at runtime (getAllTopicSeeds) without touching site.config.ts.

## Test plan
- [ ] pnpm test (both apps + packages)
- [ ] pnpm typecheck
- [ ] pnpm lint
- [ ] Manually trigger POST to /api/cron/discover-topics (with CRON_SECRET) against a review deploy and confirm suggestions appear under /admin/topics
- [ ] Approve one suggestion and confirm it appears in the main topics table and gets picked up by the next sync-youtube run

Design doc: docs/superpowers/specs/2026-08-04-topic-discovery-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Report the PR URL back to the user.
