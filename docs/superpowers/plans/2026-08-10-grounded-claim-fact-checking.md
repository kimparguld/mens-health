# Grounded fact-checking for LOW/MEDIUM claims Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give LOW/MEDIUM-risk claims a real, Gemini-search-grounded fact-check verdict (with persisted citation URLs) instead of today's unsourced LLM guess, without ever touching HIGH-floor classification or the auto-publish gate.

**Architecture:** `packages/core-ai` grows a Gemini-only grounded call path (`AiClient.groundedFactCheck`, `groundedFactCheckClaim`) alongside the existing ungrounded one. Both `apps/menhealth` and `apps/hype-check` wire it into their per-claim extraction loop (`process-video-pipeline.ts`) and their admin backfill route, each falling back to (menhealth/extraction) or failing loudly into (both apps' backfill route) today's behavior when grounding is unavailable. Evidence persists to each app's own Prisma table — `EvidenceSource` in menhealth, `EvidenceItem` in hype-check — which are structurally close but not identical (see Global Constraints).

**Tech Stack:** TypeScript, Next.js 16 route handlers, Prisma, Zod, Vitest (per-app, no package-level test runner exists in this repo — see Global Constraints).

## Global Constraints

- Never change `CATEGORY_RISK_FLOOR`, `classifyDeterministicRisk`, or `auto-publish-gate.ts` — this plan only changes where a LOW/MEDIUM claim's `evidenceStatus`/sources come from.
- Never call grounding for a HIGH-floored claim — spend zero extra search calls on claims that are admin-gated regardless of evidence quality.
- Grounding must be a dedicated Gemini-only path requiring `geminiApiKey` directly — it does **not** join the Groq→OpenRouter→OpenAI→Gemini fallback chain in `client.ts`'s `anthropic.messages.create()`.
- If grounding is unconfigured or the Gemini call fails, `process-video-pipeline.ts` falls back to exactly today's ungrounded verdict (never fails or stalls extraction); `backfill-auto-review/route.ts` counts the claim as `failed` instead (no silent fallback there — see spec §5).
- No package in this monorepo (`packages/*`) currently has its own test runner — every `packages/*` `package.json` has only a `typecheck` script. Shared-package logic (e.g. `packages/core-compliance`'s `classifyDeterministicRisk`) is tested exclusively from an app's `__tests__/` directory today. Follow that convention: the new `packages/core-ai` code (`callGeminiGrounded`, `groundedFactCheck`, `groundedFactCheckClaim`) is tested once, from `apps/menhealth/__tests__/`, by importing `@menhealth/core-ai` directly — not duplicated in `apps/hype-check/__tests__/` and not given new package-level test infra.
- menhealth's Prisma types come from `@prisma/client`; hype-check's come from `@/app/generated/prisma` (a different generator output path). Don't mix these imports up between the two apps' files.
- menhealth: `Claim.category: ClaimCategory`, `Claim.videoId`, evidence table is `EvidenceSource` (relation field `sources`, required columns `title`/`url`/`source`, optional `year`/`summary`).
- hype-check: `Claim.claimType: ClaimCategory`, `Claim.subjectId`, evidence table is `EvidenceItem` (relation field `evidenceItems`, same required/optional columns as `EvidenceSource` plus `position` and `reliability`, both enums with defaults — omit them from `createMany` data, defaults apply).
- The design doc (`docs/superpowers/specs/2026-08-10-grounded-claim-fact-checking-design.md`) writes the internal client helper as `callGeminiGrounded(text: string, category: string, apiKey: string)` but then gives `AiClient.groundedFactCheck` an exact, authoritative type of `(prompt: string) => Promise<{ text, citations }>` — a single-argument function. This plan resolves that inconsistency by implementing `callGeminiGrounded(prompt: string, apiKey: string)` (two args, matching the exposed method exactly) and having `groundedFactCheckClaim` in `pipeline.ts` build the *entire* prompt (claim text + category folded in) before calling `client.groundedFactCheck(prompt)` — the same division of responsibility every other pipeline function already uses with `client.anthropic.messages.create()`.

---

## File Structure

New/changed files, by task:

```
packages/core-ai/src/
  client.ts            # MODIFY — add callGeminiGrounded + AiClient.groundedFactCheck
  pipeline.ts           # MODIFY — add groundedFactCheckClaim + GroundedFactCheckResult
  index.ts              # MODIFY — export GroundedFactCheckResult

apps/menhealth/
  lib/ai/pipeline.ts                       # MODIFY — re-export groundedFactCheckClaim
  lib/ai/grounded-fact-check-claim.ts       # CREATE — one-liner re-export (matches fact-check-claim.ts pattern)
  lib/videos/process-video-pipeline.ts      # MODIFY — call groundedFactCheckClaim, persist EvidenceSource
  app/api/admin/claims/backfill-auto-review/route.ts   # MODIFY — swap to groundedFactCheckClaim, persist EvidenceSource
  __tests__/grounded-fact-check-client.test.ts   # CREATE
  __tests__/grounded-fact-check-claim.test.ts    # CREATE
  __tests__/process-video-pipeline-grounding.test.ts  # CREATE
  __tests__/backfill-auto-review.test.ts         # CREATE

apps/hype-check/
  lib/ai/pipeline.ts                       # MODIFY — re-export groundedFactCheckClaim
  lib/ai/grounded-fact-check-claim.ts       # CREATE
  lib/videos/process-video-pipeline.ts      # MODIFY — call groundedFactCheckClaim, persist EvidenceItem
  app/api/admin/claims/backfill-auto-review/route.ts   # MODIFY — swap to groundedFactCheckClaim, persist EvidenceItem
  __tests__/process-video-pipeline-grounding.test.ts  # CREATE
  __tests__/backfill-auto-review.test.ts         # CREATE
```

`apps/*/lib/ai/client.ts` needs **no** change — both apps already pass `geminiApiKey: env.GEMINI_API_KEY` into `createAiClient()`.

---

### Task 1: `packages/core-ai/src/client.ts` — `callGeminiGrounded` + `AiClient.groundedFactCheck`

**Files:**
- Modify: `packages/core-ai/src/client.ts`
- Test: `apps/menhealth/__tests__/grounded-fact-check-client.test.ts`

**Interfaces:**
- Produces: `AiClient.groundedFactCheck?: (prompt: string) => Promise<{ text: string; citations: Array<{ title: string; url: string }> }>` — present only when `config.geminiApiKey` is set. Later tasks call this directly (Task 2) and check its presence with `if (!client.groundedFactCheck)`.

- [ ] **Step 1: Write the failing tests**

Create `apps/menhealth/__tests__/grounded-fact-check-client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAiClient } from "@menhealth/core-ai";

describe("createAiClient — groundedFactCheck", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is undefined when geminiApiKey is not configured", () => {
    const client = createAiClient({});
    expect(client.groundedFactCheck).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("parses grounding chunks into citations alongside the answer text", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: { parts: [{ text: "The answer text" }] },
            groundingMetadata: {
              groundingChunks: [
                { web: { uri: "https://example.com/a", title: "Source A" } },
                { web: { uri: "https://example.com/b", title: "Source B" } },
              ],
            },
          },
        ],
      }),
    });

    const client = createAiClient({ geminiApiKey: "test-key" });
    const result = await client.groundedFactCheck!("some prompt");

    expect(result).toEqual({
      text: "The answer text",
      citations: [
        { title: "Source A", url: "https://example.com/a" },
        { title: "Source B", url: "https://example.com/b" },
      ],
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(":generateContent?key=test-key");
    const body = JSON.parse((init as { body: string }).body);
    expect(body.tools).toEqual([{ google_search: {} }]);
    expect(body.contents[0].parts[0].text).toBe("some prompt");
  });

  it("returns an empty citations array when groundingMetadata is missing", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "No sources needed" }] } }],
      }),
    });

    const client = createAiClient({ geminiApiKey: "test-key" });
    const result = await client.groundedFactCheck!("some prompt");

    expect(result).toEqual({ text: "No sources needed", citations: [] });
  });

  it("throws when Gemini responds with a non-ok status", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "server error",
    });

    const client = createAiClient({ geminiApiKey: "test-key" });

    await expect(client.groundedFactCheck!("some prompt")).rejects.toThrow(
      /Gemini grounded 500/,
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/menhealth && pnpm vitest run __tests__/grounded-fact-check-client.test.ts`
Expected: FAIL — `client.groundedFactCheck` is `undefined` in all cases (property doesn't exist yet).

- [ ] **Step 3: Implement `callGeminiGrounded` and wire `groundedFactCheck` onto `AiClient`**

In `packages/core-ai/src/client.ts`, add a new function right after `callGemini` (after line 121):

```typescript
async function callGeminiGrounded(
  prompt: string,
  apiKey: string,
): Promise<{ text: string; citations: Array<{ title: string; url: string }> }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    const err = Object.assign(new Error(`Gemini grounded ${res.status}: ${body}`), {
      status: res.status,
    });
    throw err;
  }
  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      groundingMetadata?: {
        groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
      };
    }>;
  };
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text ?? '';
  const citations = (candidate?.groundingMetadata?.groundingChunks ?? [])
    .filter(
      (chunk): chunk is { web: { uri: string; title: string } } =>
        typeof chunk.web?.uri === 'string' && typeof chunk.web?.title === 'string',
    )
    .map((chunk) => ({ title: chunk.web.title, url: chunk.web.uri }));
  return { text, citations };
}
```

Update the `AiClient` type (around line 123) to add the optional method:

```typescript
export type AiClient = {
  anthropic: {
    messages: {
      create(input: {
        model: string;
        max_tokens: number;
        messages: AiMessage[];
      }): Promise<{ content: Array<{ type: 'text'; text: string }> }>;
    };
  };
  /**
   * This site's configured default model id. Threaded through to `.create()`
   * as `model` for callers that still pass it, but no provider branch below
   * reads it — each hardcodes its own model (`groqModel`, the OpenRouter
   * model list, `openAiModel`, `GEMINI_MODEL`). Kept only so existing callers
   * (e.g. `client.defaultModel` in `pipeline.ts`, `generate-social-post.ts`)
   * don't need to change.
   */
  defaultModel: string;
  /**
   * Real web-search-grounded Gemini call — a dedicated path that does not
   * join the Groq→OpenRouter→OpenAI→Gemini fallback chain above. Only
   * present when `config.geminiApiKey` is set; callers check for its
   * presence rather than catching a "not configured" error.
   */
  groundedFactCheck?: (prompt: string) => Promise<{
    text: string;
    citations: Array<{ title: string; url: string }>;
  }>;
};
```

Update `createAiClient`'s return statement (currently just `return { defaultModel, anthropic: {...} };`) to conditionally include `groundedFactCheck`:

```typescript
export function createAiClient(config: AiClientConfig): AiClient {
  const defaultModel = DEFAULT_GROQ_MODEL;
  const groqModel = DEFAULT_GROQ_MODEL;
  const openRouterModels = DEFAULT_OPENROUTER_MODELS;
  const openAiModel = DEFAULT_OPENAI_MODEL;
  const groq = new Groq({ apiKey: config.groqApiKey ?? '' });
  const geminiApiKey = config.geminiApiKey;

  return {
    defaultModel,
    anthropic: {
      messages: {
        async create({ max_tokens, messages }) {
          // ...unchanged...
        },
      },
    },
    ...(geminiApiKey
      ? { groundedFactCheck: (prompt: string) => callGeminiGrounded(prompt, geminiApiKey) }
      : {}),
  };
}
```

(Leave the body of `anthropic.messages.create` completely untouched — only the surrounding return statement changes.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/menhealth && pnpm vitest run __tests__/grounded-fact-check-client.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Typecheck the package**

Run: `cd packages/core-ai && pnpm typecheck`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add packages/core-ai/src/client.ts apps/menhealth/__tests__/grounded-fact-check-client.test.ts
git commit -m "feat(core-ai): add Gemini-grounded search call path to AiClient"
```

---

### Task 2: `packages/core-ai/src/pipeline.ts` — `groundedFactCheckClaim`

**Files:**
- Modify: `packages/core-ai/src/pipeline.ts`
- Modify: `packages/core-ai/src/index.ts`
- Test: `apps/menhealth/__tests__/grounded-fact-check-claim.test.ts`

**Interfaces:**
- Consumes: `AiClient.groundedFactCheck?: (prompt: string) => Promise<{ text: string; citations: Array<{ title: string; url: string }> }>` (Task 1).
- Produces: `GroundedFactCheckResult = FactCheckResult & { sources: Array<{ title: string; url: string; source: string; year?: number; summary?: string }> }`, and `groundedFactCheckClaim(input: FactCheckClaimInput): Promise<Result<GroundedFactCheckResult>>` returned from `createAiPipeline(...)` alongside the existing 5 functions. Later tasks (3, 6) re-export this from each app; tasks 4/5/7/8 call it.

- [ ] **Step 1: Write the failing tests**

Create `apps/menhealth/__tests__/grounded-fact-check-claim.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { createAiPipeline, type AiClient } from "@menhealth/core-ai";

function makePipeline(groundedFactCheck?: AiClient["groundedFactCheck"]) {
  const fakeClient: AiClient = {
    anthropic: { messages: { create: vi.fn() } },
    defaultModel: "test-model",
    groundedFactCheck,
  };
  return createAiPipeline(fakeClient, {
    siteName: "Test Site",
    domainDescription: "a test platform",
    audienceDescription: "test readers",
    claimCategories: ["NUTRITION", "EXERCISE", "OTHER"],
    claimTypeLabel: "health claims",
    riskLevelGuide: "- LOW: general advice",
  });
}

describe("groundedFactCheckClaim", () => {
  it("returns ok:false immediately when the client has no groundedFactCheck method, without any network call", async () => {
    const pipeline = makePipeline(undefined);

    const result = await pipeline.groundedFactCheckClaim({
      text: "Walking helps cardiovascular health",
      category: "EXERCISE",
    });

    expect(result).toEqual({
      ok: false,
      error: new Error("Gemini grounding not configured"),
    });
  });

  it("succeeds with citations, deriving source domains from citation URLs", async () => {
    const groundedFactCheck = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        evidenceStatus: "SUPPORTED",
        rationale: "Backed by cardiology studies",
      }),
      citations: [{ title: "AHA Guidelines", url: "https://www.heart.org/guidelines" }],
    });
    const pipeline = makePipeline(groundedFactCheck);

    const result = await pipeline.groundedFactCheckClaim({
      text: "Walking helps cardiovascular health",
      category: "EXERCISE",
    });

    expect(result).toEqual({
      ok: true,
      value: {
        evidenceStatus: "SUPPORTED",
        rationale: "Backed by cardiology studies",
        sources: [
          { title: "AHA Guidelines", url: "https://www.heart.org/guidelines", source: "www.heart.org" },
        ],
      },
    });
    expect(groundedFactCheck).toHaveBeenCalledTimes(1);
    expect(groundedFactCheck.mock.calls[0][0]).toContain("Walking helps cardiovascular health");
  });

  it("succeeds with zero citations, leaving sources empty", async () => {
    const groundedFactCheck = vi.fn().mockResolvedValue({
      text: JSON.stringify({ evidenceStatus: "MIXED", rationale: "Evidence is mixed" }),
      citations: [],
    });
    const pipeline = makePipeline(groundedFactCheck);

    const result = await pipeline.groundedFactCheckClaim({
      text: "Some claim",
      category: "OTHER",
    });

    expect(result).toEqual({
      ok: true,
      value: { evidenceStatus: "MIXED", rationale: "Evidence is mixed", sources: [] },
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/menhealth && pnpm vitest run __tests__/grounded-fact-check-claim.test.ts`
Expected: FAIL — `pipeline.groundedFactCheckClaim` is not a function.

- [ ] **Step 3: Implement `groundedFactCheckClaim` and `GroundedFactCheckResult`**

In `packages/core-ai/src/pipeline.ts`, add the new exported type right after `FactCheckResult`'s definition (after line 121, `export type FactCheckResult = z.infer<typeof FactCheckResultSchema>;`):

```typescript
export type GroundedFactCheckResult = FactCheckResult & {
  sources: Array<{
    title: string;
    url: string;
    source: string;
    year?: number;
    summary?: string;
  }>;
};
```

Inside `createAiPipeline`, add `groundedFactCheckClaim` right after the existing `factCheckClaim` function (after line 418, before `generateEditorialTitle`):

```typescript
  // Same prompt intent as factCheckClaim, but built for client.groundedFactCheck
  // (real web-search grounding) instead of client.anthropic.messages.create.
  // Only ever called for LOW/MEDIUM claims — HIGH-floor claims are admin-only
  // regardless of evidence quality, so callers never spend a search call there.
  async function groundedFactCheckClaim(
    input: FactCheckClaimInput,
  ): Promise<Result<GroundedFactCheckResult>> {
    if (!client.groundedFactCheck) {
      return { ok: false, error: new Error("Gemini grounding not configured") };
    }

    const prompt = `You are a ${claimTypeLabel} fact-checker for ${siteName}.

Evaluate the following claim using web search and give a fact-check verdict grounded in real sources.

Claim: ${input.text}
Category: ${input.category}

Respond with a JSON object:
{
  "evidenceStatus": "SUPPORTED|MIXED|WEAK|UNSUPPORTED",
  "rationale": "one to two sentence rationale"
}

Respond ONLY with the JSON object.`;

    try {
      const { text, citations } = await client.groundedFactCheck(prompt);

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return {
          ok: false,
          error: new Error("AI response was not valid JSON"),
        };
      }

      const validated = FactCheckResultSchema.safeParse(parsed);
      if (!validated.success) {
        return {
          ok: false,
          error: new Error(
            `Fact-check output failed validation: ${validated.error.message}`,
          ),
        };
      }

      const sources = citations.map((citation) => ({
        title: citation.title,
        url: citation.url,
        source: new URL(citation.url).hostname,
      }));

      return { ok: true, value: { ...validated.data, sources } };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
```

Add it to the factory's return object (the final `return { summarizeVideo, extractClaims, factCheckClaim, generateEditorialTitle, generateTopicFaq };` near the end of the file):

```typescript
  return {
    summarizeVideo,
    extractClaims,
    factCheckClaim,
    groundedFactCheckClaim,
    generateEditorialTitle,
    generateTopicFaq,
  };
```

In `packages/core-ai/src/index.ts`, add `GroundedFactCheckResult` to the `export type { ... } from "./pipeline";` block:

```typescript
export { createAiPipeline } from "./pipeline";
export type {
  AiPipelineOptions,
  SummaryOutput,
  SummaryInput,
  ExtractedClaim,
  ClaimExtractionInput,
  FactCheckResult,
  FactCheckClaimInput,
  GroundedFactCheckResult,
  EditorialTitleInput,
  FaqOutput,
  FaqGenerationInput,
} from "./pipeline";
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/menhealth && pnpm vitest run __tests__/grounded-fact-check-claim.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Typecheck the package**

Run: `cd packages/core-ai && pnpm typecheck`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add packages/core-ai/src/pipeline.ts packages/core-ai/src/index.ts apps/menhealth/__tests__/grounded-fact-check-claim.test.ts
git commit -m "feat(core-ai): add groundedFactCheckClaim with real citation sourcing"
```

---

### Task 3: menhealth app wiring — re-export `groundedFactCheckClaim`

**Files:**
- Modify: `apps/menhealth/lib/ai/pipeline.ts`
- Create: `apps/menhealth/lib/ai/grounded-fact-check-claim.ts`

**Interfaces:**
- Consumes: `groundedFactCheckClaim`, `GroundedFactCheckResult` from `@menhealth/core-ai` (Task 2).
- Produces: `groundedFactCheckClaim` importable from `@/lib/ai/pipeline` and from `@/lib/ai/grounded-fact-check-claim` (mirrors the existing `factCheckClaim` / `@/lib/ai/fact-check-claim.ts` pattern exactly). Tasks 4 and 5 import from `@/lib/ai/grounded-fact-check-claim`.

This task has no behavior of its own to unit-test — it's a one-line re-export, matching the existing untested `lib/ai/fact-check-claim.ts`, `lib/ai/summarize-video.ts`, `lib/ai/extract-claims.ts` files. Its correctness is verified by Task 4/5's tests, which import through it.

- [ ] **Step 1: Update `apps/menhealth/lib/ai/pipeline.ts`**

```typescript
import { createAiPipeline } from "@menhealth/core-ai";
import { SITE_NAME } from "@/lib/site-brand";
import { aiClient } from "./client";

export const {
  summarizeVideo,
  extractClaims,
  factCheckClaim,
  groundedFactCheckClaim,
  generateEditorialTitle,
  generateTopicFaq,
} = createAiPipeline(aiClient, {
  siteName: SITE_NAME,
  domainDescription: "a men's health content curation platform",
  audienceDescription:
    "men aged 30–55 who are health-conscious but not medical professionals",
  claimCategories: [
    "NUTRITION",
    "EXERCISE",
    "HORMONES",
    "MENTAL_HEALTH",
    "SUPPLEMENTS",
    "MEDICATIONS",
    "CANCER",
    "LONGEVITY",
    "SEXUAL_HEALTH",
    "OTHER",
  ],
  claimTypeLabel: "health claims",
  riskLevelGuide:
    "- HIGH: Claims about medications, TRT, hormones, sexual health, mental health treatment, cancer, supplements as cures\n" +
    "- MEDIUM: Diet claims, specific supplement dosages, training frequency claims with quantified outcomes\n" +
    "- LOW: General lifestyle advice, widely accepted recommendations",
});

export type {
  Result,
  SummaryOutput,
  SummaryInput,
  ExtractedClaim,
  ClaimExtractionInput,
  FactCheckResult,
  FactCheckClaimInput,
  GroundedFactCheckResult,
  EditorialTitleInput,
  FaqOutput,
  FaqGenerationInput,
} from "@menhealth/core-ai";
```

- [ ] **Step 2: Create `apps/menhealth/lib/ai/grounded-fact-check-claim.ts`**

```typescript
export { groundedFactCheckClaim } from "./pipeline";
export type { GroundedFactCheckResult, FactCheckResult, FactCheckClaimInput, Result } from "./pipeline";
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/menhealth && pnpm typecheck`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/menhealth/lib/ai/pipeline.ts apps/menhealth/lib/ai/grounded-fact-check-claim.ts
git commit -m "feat(menhealth): wire up groundedFactCheckClaim re-export"
```

---

### Task 4: menhealth — `process-video-pipeline.ts` grounding + `EvidenceSource` persistence

**Files:**
- Modify: `apps/menhealth/lib/videos/process-video-pipeline.ts`
- Test: `apps/menhealth/__tests__/process-video-pipeline-grounding.test.ts`

**Interfaces:**
- Consumes: `groundedFactCheckClaim` from `@/lib/ai/grounded-fact-check-claim` (Task 3); `GroundedFactCheckResult`, `FactCheckResult` types from the same.
- Produces: no new exports — behavior change inside `generateSummaryAndClaims`.

- [ ] **Step 1: Write the failing tests**

Create `apps/menhealth/__tests__/process-video-pipeline-grounding.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// generateSummaryAndClaims persists via db.summary/claim/evidenceSource/video —
// none of which exist on the shared __tests__/__mocks__/prisma.ts stub (that
// stub only covers the social engine's tables). File-scoped override, same
// pattern as apps/hype-check/__tests__/process-video-pipeline-risk-escalation.test.ts.
const mockDb = vi.hoisted(() => ({
  summary: { create: vi.fn() },
  claim: { create: vi.fn(), update: vi.fn() },
  evidenceSource: { createMany: vi.fn() },
  video: { update: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({ db: mockDb }));

vi.mock("@/lib/ai/pipeline", () => ({
  summarizeVideo: vi.fn(),
  extractClaims: vi.fn(),
  factCheckClaim: vi.fn(),
  groundedFactCheckClaim: vi.fn(),
  generateEditorialTitle: vi.fn(),
  generateTopicFaq: vi.fn(),
}));

import { generateSummaryAndClaims } from "@/lib/videos/process-video-pipeline";
import { summarizeVideo, extractClaims, groundedFactCheckClaim } from "@/lib/ai/pipeline";

const mockSummarizeVideo = vi.mocked(summarizeVideo);
const mockExtractClaims = vi.mocked(extractClaims);
const mockGroundedFactCheckClaim = vi.mocked(groundedFactCheckClaim);

const baseVideo = {
  id: "video-1",
  title: "Test video",
  description: "Test description",
  durationSeconds: 300,
  riskLevel: "LOW" as const,
};

describe("generateSummaryAndClaims grounded fact-checking", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSummarizeVideo.mockResolvedValue({
      ok: true,
      value: {
        shortSummary: "short summary",
        longSummary: "long summary",
        takeaways: [],
        warnings: [],
        targetAudience: "everyone",
        redFlags: [],
      },
    });

    mockDb.summary.create.mockResolvedValue({ id: "summary-1", shortSummary: "short summary" });
    mockDb.claim.create.mockImplementation(async ({ data }) => ({ id: "claim-1", ...data }));
    mockDb.claim.update.mockImplementation(async ({ where, data }) => ({ id: where.id, ...data }));
  });

  it("uses the grounded verdict and persists EvidenceSource rows for a LOW-risk claim", async () => {
    mockExtractClaims.mockResolvedValue({
      ok: true,
      value: [
        {
          text: "Walking 30 minutes a day improves cardiovascular health",
          category: "EXERCISE",
          riskLevel: "LOW",
          factCheck: { evidenceStatus: "MIXED", rationale: "ungrounded guess" },
        },
      ],
    });
    mockGroundedFactCheckClaim.mockResolvedValue({
      ok: true,
      value: {
        evidenceStatus: "SUPPORTED",
        rationale: "Backed by multiple cardiology studies",
        sources: [
          { title: "AHA Guidelines", url: "https://www.heart.org/guidelines", source: "www.heart.org" },
        ],
      },
    });

    const result = await generateSummaryAndClaims(baseVideo, "Some Channel", { modelUsed: "test-model" });

    expect(result.ok).toBe(true);
    expect(mockDb.claim.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          evidenceStatus: "SUPPORTED",
          explanation: "Backed by multiple cardiology studies",
        }),
      }),
    );
    expect(mockDb.evidenceSource.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          title: "AHA Guidelines",
          url: "https://www.heart.org/guidelines",
          source: "www.heart.org",
          claimId: "claim-1",
        }),
      ],
    });
  });

  it("falls back to the ungrounded factCheck verdict when groundedFactCheckClaim fails, without creating EvidenceSource rows", async () => {
    mockExtractClaims.mockResolvedValue({
      ok: true,
      value: [
        {
          text: "Protein intake supports muscle recovery",
          category: "NUTRITION",
          riskLevel: "MEDIUM",
          factCheck: { evidenceStatus: "SUPPORTED", rationale: "General consensus" },
        },
      ],
    });
    mockGroundedFactCheckClaim.mockResolvedValue({
      ok: false,
      error: new Error("Gemini grounding not configured"),
    });

    const result = await generateSummaryAndClaims(baseVideo, "Some Channel", { modelUsed: "test-model" });

    expect(result.ok).toBe(true);
    expect(mockDb.claim.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ evidenceStatus: "SUPPORTED", explanation: "General consensus" }),
      }),
    );
    expect(mockDb.evidenceSource.createMany).not.toHaveBeenCalled();
  });

  it("never calls groundedFactCheckClaim for a HIGH-risk (category-floored) claim", async () => {
    mockExtractClaims.mockResolvedValue({
      ok: true,
      value: [
        {
          text: "TRT reverses aging",
          category: "HORMONES",
          riskLevel: "LOW",
          factCheck: { evidenceStatus: "SUPPORTED", rationale: "should never be used" },
        },
      ],
    });

    const result = await generateSummaryAndClaims(baseVideo, "Some Channel", { modelUsed: "test-model" });

    expect(result.ok).toBe(true);
    expect(mockGroundedFactCheckClaim).not.toHaveBeenCalled();
    expect(mockDb.claim.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ evidenceStatus: "NOT_CHECKED", explanation: null }) }),
    );
    expect(mockDb.evidenceSource.createMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/menhealth && pnpm vitest run __tests__/process-video-pipeline-grounding.test.ts`
Expected: FAIL — `groundedFactCheckClaim` is never called; `evidenceSource.createMany` is never called (current code doesn't import or use either).

- [ ] **Step 3: Implement the change**

In `apps/menhealth/lib/videos/process-video-pipeline.ts`, add the import (alongside the existing `claim-risk` import):

```typescript
import { groundedFactCheckClaim } from "@/lib/ai/grounded-fact-check-claim";
import type { FactCheckResult, GroundedFactCheckResult } from "@/lib/ai/grounded-fact-check-claim";
```

Replace the existing block:

```typescript
    // HIGH claims never get an automated verdict — discarded by
    // construction, not by a UI hint that could later be relaxed.
    const factCheck =
      deterministicRisk === "HIGH" ? undefined : extracted.factCheck;

    const created = await db.claim.create({
      data: {
        videoId: video.id,
        text: extracted.text,
        category,
        riskLevel: deterministicRisk,
        evidenceStatus: factCheck?.evidenceStatus ?? "NOT_CHECKED",
        explanation: factCheck?.rationale ?? extracted.explanation ?? null,
        // Only LOW-risk claims with an actual AI verdict are auto-reviewed;
        // MEDIUM claims get the verdict pre-filled but still need a human
        // one-click confirm, and HIGH claims never get a verdict at all.
        autoReviewed: deterministicRisk === "LOW" && factCheck != null,
      },
    });
    const withSlug = await db.claim.update({
      where: { id: created.id },
      data: { slug: generateClaimSlug(extracted.text, created.id) },
    });
    claims.push(withSlug);
```

with:

```typescript
    // HIGH claims never get an automated verdict — discarded by
    // construction, not by a UI hint that could later be relaxed.
    let factCheck: FactCheckResult | undefined;
    let groundedSources: GroundedFactCheckResult["sources"] = [];

    if (deterministicRisk !== "HIGH") {
      factCheck = extracted.factCheck; // today's fallback, pre-assigned
      const grounded = await groundedFactCheckClaim({ text: extracted.text, category });
      if (grounded.ok) {
        factCheck = grounded.value;
        groundedSources = grounded.value.sources;
      }
      // else: factCheck stays extracted.factCheck — today's behavior, unchanged.
    }

    const created = await db.claim.create({
      data: {
        videoId: video.id,
        text: extracted.text,
        category,
        riskLevel: deterministicRisk,
        evidenceStatus: factCheck?.evidenceStatus ?? "NOT_CHECKED",
        explanation: factCheck?.rationale ?? extracted.explanation ?? null,
        // Only LOW-risk claims with an actual AI verdict are auto-reviewed;
        // MEDIUM claims get the verdict pre-filled but still need a human
        // one-click confirm, and HIGH claims never get a verdict at all.
        autoReviewed: deterministicRisk === "LOW" && factCheck != null,
      },
    });

    if (groundedSources.length > 0) {
      await db.evidenceSource.createMany({
        data: groundedSources.map((s) => ({ ...s, claimId: created.id })),
      });
    }

    const withSlug = await db.claim.update({
      where: { id: created.id },
      data: { slug: generateClaimSlug(extracted.text, created.id) },
    });
    claims.push(withSlug);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/menhealth && pnpm vitest run __tests__/process-video-pipeline-grounding.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full menhealth test suite to check for regressions**

Run: `cd apps/menhealth && pnpm vitest run`
Expected: all pass (no other suite exercises `process-video-pipeline.ts`, so no regressions expected, but confirm)

- [ ] **Step 6: Typecheck**

Run: `cd apps/menhealth && pnpm typecheck`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add apps/menhealth/lib/videos/process-video-pipeline.ts apps/menhealth/__tests__/process-video-pipeline-grounding.test.ts
git commit -m "feat(menhealth): ground LOW/MEDIUM claim fact-checks during extraction"
```

---

### Task 5: menhealth — `backfill-auto-review/route.ts` grounding + `EvidenceSource` persistence

**Files:**
- Modify: `apps/menhealth/app/api/admin/claims/backfill-auto-review/route.ts`
- Test: `apps/menhealth/__tests__/backfill-auto-review.test.ts`

**Interfaces:**
- Consumes: `groundedFactCheckClaim` from `@/lib/ai/grounded-fact-check-claim` (Task 3).

- [ ] **Step 1: Write the failing tests**

Create `apps/menhealth/__tests__/backfill-auto-review.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

const mockDb = vi.hoisted(() => ({
  claim: { findMany: vi.fn(), update: vi.fn(), count: vi.fn() },
  evidenceSource: { createMany: vi.fn() },
}));
vi.mock("@/lib/db/prisma", () => ({ db: mockDb }));

vi.mock("@/lib/ai/grounded-fact-check-claim", () => ({
  groundedFactCheckClaim: vi.fn(),
}));

import { POST } from "@/app/api/admin/claims/backfill-auto-review/route";
import { groundedFactCheckClaim } from "@/lib/ai/grounded-fact-check-claim";

const mockGroundedFactCheckClaim = vi.mocked(groundedFactCheckClaim);

function makeRequest(): NextRequest {
  return new Request("http://localhost/api/admin/claims/backfill-auto-review", {
    method: "POST",
  }) as unknown as NextRequest;
}

describe("POST /api/admin/claims/backfill-auto-review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { isAdmin: true } });
    mockDb.claim.update.mockResolvedValue({});
    mockDb.claim.count.mockResolvedValue(0);
  });

  it("rejects non-admin sessions without querying claims", async () => {
    mockAuth.mockResolvedValue({ user: { isAdmin: false } });

    const res = await POST(makeRequest());

    expect(res.status).toBe(403);
    expect(mockDb.claim.findMany).not.toHaveBeenCalled();
  });

  it("skips HIGH-risk claims without calling groundedFactCheckClaim", async () => {
    mockDb.claim.findMany.mockResolvedValue([
      { id: "c1", category: "HORMONES", riskLevel: "HIGH", text: "TRT reverses aging" },
    ]);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(mockGroundedFactCheckClaim).not.toHaveBeenCalled();
    expect(body.skippedHighRisk).toBe(1);
    expect(body.failed).toBe(0);
  });

  it("counts a grounded-call failure as failed and leaves the claim untouched", async () => {
    mockDb.claim.findMany.mockResolvedValue([
      { id: "c2", category: "NUTRITION", riskLevel: "LOW", text: "Protein helps recovery" },
    ]);
    mockGroundedFactCheckClaim.mockResolvedValue({
      ok: false,
      error: new Error("Gemini grounding not configured"),
    });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(body.failed).toBe(1);
    expect(body.autoReviewed).toBe(0);
    expect(mockDb.claim.update).not.toHaveBeenCalled();
    expect(mockDb.evidenceSource.createMany).not.toHaveBeenCalled();
  });

  it("auto-reviews a LOW-risk claim on grounded success and persists its EvidenceSource rows", async () => {
    mockDb.claim.findMany.mockResolvedValue([
      { id: "c3", category: "EXERCISE", riskLevel: "LOW", text: "Walking helps cardio health" },
    ]);
    mockGroundedFactCheckClaim.mockResolvedValue({
      ok: true,
      value: {
        evidenceStatus: "SUPPORTED",
        rationale: "Backed by AHA guidance",
        sources: [
          { title: "AHA Guidelines", url: "https://www.heart.org/guidelines", source: "www.heart.org" },
        ],
      },
    });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(body.autoReviewed).toBe(1);
    expect(mockDb.claim.update).toHaveBeenCalledWith({
      where: { id: "c3" },
      data: { evidenceStatus: "SUPPORTED", explanation: "Backed by AHA guidance", autoReviewed: true },
    });
    expect(mockDb.evidenceSource.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ claimId: "c3", title: "AHA Guidelines" })],
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/menhealth && pnpm vitest run __tests__/backfill-auto-review.test.ts`
Expected: FAIL — route still imports `factCheckClaim` from `@/lib/ai/fact-check-claim`, so mocking `@/lib/ai/grounded-fact-check-claim` has no effect and `mockGroundedFactCheckClaim` is never called; `evidenceSource.createMany` assertion fails.

- [ ] **Step 3: Implement the change**

Replace the full contents of `apps/menhealth/app/api/admin/claims/backfill-auto-review/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { classifyDeterministicRisk } from "@/lib/ai/claim-risk";
import { groundedFactCheckClaim } from "@/lib/ai/grounded-fact-check-claim";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

// Bounded per request so this stays well within a serverless function
// timeout even with a large backlog — the admin UI calls this repeatedly,
// batch by batch, until there's no more forward progress to make.
const BATCH_SIZE = 20;

// Retroactively applies the same LOW/MEDIUM/HIGH auto-review rules used for
// newly extracted claims (see lib/videos/process-video-pipeline.ts) to
// claims created before that logic existed. LOW-risk claims get a
// search-grounded AI verdict applied automatically; MEDIUM-risk claims get
// it pre-filled but still require a human one-click confirm; HIGH-risk
// claims are never touched — left NOT_CHECKED for full manual review, same
// as always. A grounded-call failure (e.g. no GEMINI_API_KEY) counts toward
// `failed` rather than silently falling back to an ungrounded guess — this
// route is an explicit admin-triggered batch action, so surfacing the
// failure is more useful here than a silent fallback would be.
export async function POST(_request: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Ordering by riskLevel ascending relies on Postgres native enum ordering
  // matching declaration order (LOW, MEDIUM, HIGH in schema.prisma) — sorts
  // auto-reviewable claims to the front so HIGH-risk claims that can never
  // be resolved here don't get stuck re-fetched at the head of every batch.
  const claims = await db.claim.findMany({
    where: { evidenceStatus: "NOT_CHECKED" },
    orderBy: [{ riskLevel: "asc" }, { createdAt: "asc" }],
    take: BATCH_SIZE,
  });

  let autoReviewed = 0;
  let prefilled = 0;
  let skippedHighRisk = 0;
  let failed = 0;

  for (const claim of claims) {
    const deterministicRisk = classifyDeterministicRisk(
      claim.category,
      claim.riskLevel,
      claim.text,
    );
    if (deterministicRisk !== claim.riskLevel) {
      await db.claim.update({
        where: { id: claim.id },
        data: { riskLevel: deterministicRisk },
      });
    }

    if (deterministicRisk === "HIGH") {
      skippedHighRisk++;
      continue;
    }

    const factCheckResult = await groundedFactCheckClaim({
      text: claim.text,
      category: claim.category,
    });

    if (!factCheckResult.ok) {
      failed++;
      continue;
    }

    await db.claim.update({
      where: { id: claim.id },
      data: {
        evidenceStatus: factCheckResult.value.evidenceStatus,
        explanation: factCheckResult.value.rationale,
        // Only LOW-risk claims are marked auto-reviewed; MEDIUM claims get
        // the verdict pre-filled but still need a human confirm click.
        autoReviewed: deterministicRisk === "LOW",
      },
    });

    if (factCheckResult.value.sources.length > 0) {
      await db.evidenceSource.createMany({
        data: factCheckResult.value.sources.map((s) => ({ ...s, claimId: claim.id })),
      });
    }

    if (deterministicRisk === "LOW") {
      autoReviewed++;
    } else {
      prefilled++;
    }
  }

  const remaining = await db.claim.count({
    where: { evidenceStatus: "NOT_CHECKED" },
  });

  revalidateTag("videos", "max");

  return Response.json({
    ok: true,
    processed: claims.length,
    autoReviewed,
    prefilled,
    skippedHighRisk,
    failed,
    remaining,
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/menhealth && pnpm vitest run __tests__/backfill-auto-review.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Typecheck**

Run: `cd apps/menhealth && pnpm typecheck`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add apps/menhealth/app/api/admin/claims/backfill-auto-review/route.ts apps/menhealth/__tests__/backfill-auto-review.test.ts
git commit -m "feat(menhealth): ground the backfill-auto-review fact-check call"
```

---

### Task 6: hype-check app wiring — re-export `groundedFactCheckClaim`

**Files:**
- Modify: `apps/hype-check/lib/ai/pipeline.ts`
- Create: `apps/hype-check/lib/ai/grounded-fact-check-claim.ts`

**Interfaces:**
- Consumes: `groundedFactCheckClaim`, `GroundedFactCheckResult` from `@menhealth/core-ai` (Task 2 — the shared package name is `@menhealth/core-ai` regardless of which app consumes it).
- Produces: same as Task 3, for hype-check. Tasks 7 and 8 import from `@/lib/ai/grounded-fact-check-claim`.

- [ ] **Step 1: Update `apps/hype-check/lib/ai/pipeline.ts`**

```typescript
import { createAiPipeline } from "@menhealth/core-ai";
import { SITE_NAME } from "@/lib/site-brand";
import { aiClient } from "./client";

export const {
  summarizeVideo,
  extractClaims,
  factCheckClaim,
  groundedFactCheckClaim,
  generateEditorialTitle,
  generateTopicFaq,
} = createAiPipeline(aiClient, {
  siteName: SITE_NAME,
  domainDescription:
    "a platform that reviews trending products, courses, side hustles, and investment apps for hype vs. reality",
  audienceDescription:
    "people trying to figure out whether a trending product, course, or money-making opportunity is worth their money",
  claimCategories: [
    "SAFETY",
    "LEGITIMACY",
    "REGULATION",
    "GUARANTEE",
    "INCOME",
    "PRICING",
    "ENDORSEMENT",
    "PERFORMANCE",
    "POPULARITY",
    "SCARCITY",
    "OTHER",
  ],
  claimTypeLabel: "claims about products, courses, and money-making opportunities",
  riskLevelGuide:
    "- HIGH: Claims about safety/injury risk, whether the company or product is legitimate, regulatory compliance (SEC/FTC), or guaranteed returns/income\n" +
    "- MEDIUM: Specific income or pricing figures, endorsements that may be paid but undisclosed\n" +
    "- LOW: General product performance claims, popularity/social-proof claims, urgency or scarcity language",
});

export type {
  Result,
  SummaryOutput,
  SummaryInput,
  ExtractedClaim,
  ClaimExtractionInput,
  FactCheckResult,
  FactCheckClaimInput,
  GroundedFactCheckResult,
  EditorialTitleInput,
  FaqOutput,
  FaqGenerationInput,
} from "@menhealth/core-ai";
```

- [ ] **Step 2: Create `apps/hype-check/lib/ai/grounded-fact-check-claim.ts`**

```typescript
export { groundedFactCheckClaim } from "./pipeline";
export type { GroundedFactCheckResult, FactCheckResult, FactCheckClaimInput, Result } from "./pipeline";
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/hype-check && pnpm typecheck`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/hype-check/lib/ai/pipeline.ts apps/hype-check/lib/ai/grounded-fact-check-claim.ts
git commit -m "feat(hype-check): wire up groundedFactCheckClaim re-export"
```

---

### Task 7: hype-check — `process-video-pipeline.ts` grounding + `EvidenceItem` persistence

**Files:**
- Modify: `apps/hype-check/lib/videos/process-video-pipeline.ts`
- Test: `apps/hype-check/__tests__/process-video-pipeline-grounding.test.ts`

**Interfaces:**
- Consumes: `groundedFactCheckClaim` from `@/lib/ai/grounded-fact-check-claim` (Task 6).
- Note: hype-check's evidence table is `EvidenceItem`, not `EvidenceSource` — `db.evidenceItem.createMany`, not `db.evidenceSource.createMany`. `position`/`reliability` columns are omitted from the `createMany` payload; Prisma applies their schema defaults (`UNVERIFIED` / `MEDIUM`).

- [ ] **Step 1: Write the failing tests**

Create `apps/hype-check/__tests__/process-video-pipeline-grounding.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  summary: { create: vi.fn() },
  claim: { create: vi.fn(), update: vi.fn() },
  evidenceItem: { createMany: vi.fn() },
  warningSign: { createMany: vi.fn() },
  costItem: { createMany: vi.fn() },
  disclosure: { createMany: vi.fn() },
  subject: { update: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({ db: mockDb }));

vi.mock("@/lib/ai/pipeline", () => ({
  summarizeVideo: vi.fn(),
  extractClaims: vi.fn(),
  factCheckClaim: vi.fn(),
  groundedFactCheckClaim: vi.fn(),
  generateEditorialTitle: vi.fn(),
  generateTopicFaq: vi.fn(),
}));

vi.mock("@/lib/ai/extract-warnings-costs-disclosures", () => ({
  extractWarningsCostsDisclosures: vi.fn(),
}));

import { generateSummaryAndClaims } from "@/lib/videos/process-video-pipeline";
import { summarizeVideo, extractClaims, groundedFactCheckClaim } from "@/lib/ai/pipeline";
import { extractWarningsCostsDisclosures } from "@/lib/ai/extract-warnings-costs-disclosures";

const mockSummarizeVideo = vi.mocked(summarizeVideo);
const mockExtractClaims = vi.mocked(extractClaims);
const mockGroundedFactCheckClaim = vi.mocked(groundedFactCheckClaim);
const mockExtractWarningsCostsDisclosures = vi.mocked(extractWarningsCostsDisclosures);

const baseVideo = {
  subjectId: "subject-1",
  sourceVideoId: "source-video-1",
  title: "Test video",
  description: "Test description",
  durationSeconds: 300,
  riskLevel: "LOW" as const,
};

describe("generateSummaryAndClaims grounded fact-checking (hype-check)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSummarizeVideo.mockResolvedValue({
      ok: true,
      value: {
        shortSummary: "short summary",
        longSummary: "long summary",
        takeaways: [],
        warnings: [],
        targetAudience: "everyone",
        redFlags: [],
      },
    });
    mockExtractWarningsCostsDisclosures.mockResolvedValue({
      ok: true,
      value: { warningSigns: [], costItems: [], disclosures: [] },
    });

    mockDb.summary.create.mockResolvedValue({ id: "summary-1", shortSummary: "short summary" });
    mockDb.claim.create.mockImplementation(async ({ data }) => ({ id: "claim-1", ...data }));
    mockDb.claim.update.mockImplementation(async ({ where, data }) => ({ id: where.id, ...data }));
  });

  it("uses the grounded verdict and persists EvidenceItem rows for a LOW-risk claim", async () => {
    mockExtractClaims.mockResolvedValue({
      ok: true,
      value: [
        {
          text: "This course has a 30-day money-back guarantee",
          category: "PRICING",
          riskLevel: "LOW",
          factCheck: { evidenceStatus: "MIXED", rationale: "ungrounded guess" },
        },
      ],
    });
    mockGroundedFactCheckClaim.mockResolvedValue({
      ok: true,
      value: {
        evidenceStatus: "SUPPORTED",
        rationale: "Confirmed on the vendor's own terms page",
        sources: [{ title: "Vendor Terms", url: "https://vendor.example.com/terms", source: "vendor.example.com" }],
      },
    });

    const result = await generateSummaryAndClaims(baseVideo, "Some Channel", { modelUsed: "test-model" });

    expect(result.ok).toBe(true);
    expect(mockDb.claim.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          evidenceStatus: "SUPPORTED",
          explanation: "Confirmed on the vendor's own terms page",
        }),
      }),
    );
    expect(mockDb.evidenceItem.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          title: "Vendor Terms",
          url: "https://vendor.example.com/terms",
          source: "vendor.example.com",
          claimId: "claim-1",
        }),
      ],
    });
  });

  it("falls back to the ungrounded factCheck verdict when groundedFactCheckClaim fails, without creating EvidenceItem rows", async () => {
    mockExtractClaims.mockResolvedValue({
      ok: true,
      value: [
        {
          text: "Users report 20% average monthly returns",
          category: "INCOME",
          riskLevel: "MEDIUM",
          factCheck: { evidenceStatus: "WEAK", rationale: "General consensus" },
        },
      ],
    });
    mockGroundedFactCheckClaim.mockResolvedValue({
      ok: false,
      error: new Error("Gemini grounding not configured"),
    });

    const result = await generateSummaryAndClaims(baseVideo, "Some Channel", { modelUsed: "test-model" });

    expect(result.ok).toBe(true);
    expect(mockDb.claim.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ evidenceStatus: "WEAK", explanation: "General consensus" }),
      }),
    );
    expect(mockDb.evidenceItem.createMany).not.toHaveBeenCalled();
  });

  it("never calls groundedFactCheckClaim for a HIGH-risk (category-floored) claim", async () => {
    mockExtractClaims.mockResolvedValue({
      ok: true,
      value: [
        {
          text: "Guaranteed 40% monthly returns, no risk",
          category: "GUARANTEE",
          riskLevel: "LOW",
          factCheck: { evidenceStatus: "SUPPORTED", rationale: "should never be used" },
        },
      ],
    });

    const result = await generateSummaryAndClaims(baseVideo, "Some Channel", { modelUsed: "test-model" });

    expect(result.ok).toBe(true);
    expect(mockGroundedFactCheckClaim).not.toHaveBeenCalled();
    expect(mockDb.evidenceItem.createMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/hype-check && pnpm vitest run __tests__/process-video-pipeline-grounding.test.ts`
Expected: FAIL — `groundedFactCheckClaim` and `evidenceItem.createMany` are never called.

- [ ] **Step 3: Implement the change**

In `apps/hype-check/lib/videos/process-video-pipeline.ts`, add the import (alongside the existing `claim-risk` import):

```typescript
import { groundedFactCheckClaim } from "@/lib/ai/grounded-fact-check-claim";
import type { FactCheckResult, GroundedFactCheckResult } from "@/lib/ai/grounded-fact-check-claim";
```

Replace the existing block inside the `if (claimsResult.ok) { for (const extracted of claimsResult.value) { ... } }` loop:

```typescript
      // HIGH claims never get an automated verdict — discarded by
      // construction, not by a UI hint that could later be relaxed.
      const factCheck =
        deterministicRisk === "HIGH" ? undefined : extracted.factCheck;

      const created = await db.claim.create({
        data: {
          subjectId: video.subjectId,
          text: extracted.text,
          claimType: category,
          riskLevel: deterministicRisk,
          evidenceStatus: factCheck?.evidenceStatus ?? "NOT_CHECKED",
          explanation: factCheck?.rationale ?? extracted.explanation ?? null,
          // Only LOW-risk claims with an actual AI verdict are auto-reviewed;
          // MEDIUM claims get the verdict pre-filled but still need a human
          // one-click confirm, and HIGH claims never get a verdict at all.
          autoReviewed: deterministicRisk === "LOW" && factCheck != null,
        },
      });
      const withSlug = await db.claim.update({
        where: { id: created.id },
        data: { slug: generateClaimSlug(extracted.text, created.id) },
      });
      claims.push(withSlug);
```

with:

```typescript
      // HIGH claims never get an automated verdict — discarded by
      // construction, not by a UI hint that could later be relaxed.
      let factCheck: FactCheckResult | undefined;
      let groundedSources: GroundedFactCheckResult["sources"] = [];

      if (deterministicRisk !== "HIGH") {
        factCheck = extracted.factCheck; // today's fallback, pre-assigned
        const grounded = await groundedFactCheckClaim({ text: extracted.text, category });
        if (grounded.ok) {
          factCheck = grounded.value;
          groundedSources = grounded.value.sources;
        }
        // else: factCheck stays extracted.factCheck — today's behavior, unchanged.
      }

      const created = await db.claim.create({
        data: {
          subjectId: video.subjectId,
          text: extracted.text,
          claimType: category,
          riskLevel: deterministicRisk,
          evidenceStatus: factCheck?.evidenceStatus ?? "NOT_CHECKED",
          explanation: factCheck?.rationale ?? extracted.explanation ?? null,
          // Only LOW-risk claims with an actual AI verdict are auto-reviewed;
          // MEDIUM claims get the verdict pre-filled but still need a human
          // one-click confirm, and HIGH claims never get a verdict at all.
          autoReviewed: deterministicRisk === "LOW" && factCheck != null,
        },
      });

      if (groundedSources.length > 0) {
        await db.evidenceItem.createMany({
          data: groundedSources.map((s) => ({ ...s, claimId: created.id })),
        });
      }

      const withSlug = await db.claim.update({
        where: { id: created.id },
        data: { slug: generateClaimSlug(extracted.text, created.id) },
      });
      claims.push(withSlug);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/hype-check && pnpm vitest run __tests__/process-video-pipeline-grounding.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full hype-check test suite to check for regressions**

Run: `cd apps/hype-check && pnpm vitest run`
Expected: all pass, including the pre-existing `process-video-pipeline-risk-escalation.test.ts`

- [ ] **Step 6: Typecheck**

Run: `cd apps/hype-check && pnpm typecheck`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add apps/hype-check/lib/videos/process-video-pipeline.ts apps/hype-check/__tests__/process-video-pipeline-grounding.test.ts
git commit -m "feat(hype-check): ground LOW/MEDIUM claim fact-checks during extraction"
```

---

### Task 8: hype-check — `backfill-auto-review/route.ts` grounding + `EvidenceItem` persistence

**Files:**
- Modify: `apps/hype-check/app/api/admin/claims/backfill-auto-review/route.ts`
- Test: `apps/hype-check/__tests__/backfill-auto-review.test.ts`

**Interfaces:**
- Consumes: `groundedFactCheckClaim` from `@/lib/ai/grounded-fact-check-claim` (Task 6).

- [ ] **Step 1: Write the failing tests**

Create `apps/hype-check/__tests__/backfill-auto-review.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

const mockDb = vi.hoisted(() => ({
  claim: { findMany: vi.fn(), update: vi.fn(), count: vi.fn() },
  evidenceItem: { createMany: vi.fn() },
}));
vi.mock("@/lib/db/prisma", () => ({ db: mockDb }));

vi.mock("@/lib/ai/grounded-fact-check-claim", () => ({
  groundedFactCheckClaim: vi.fn(),
}));

import { POST } from "@/app/api/admin/claims/backfill-auto-review/route";
import { groundedFactCheckClaim } from "@/lib/ai/grounded-fact-check-claim";

const mockGroundedFactCheckClaim = vi.mocked(groundedFactCheckClaim);

function makeRequest(): NextRequest {
  return new Request("http://localhost/api/admin/claims/backfill-auto-review", {
    method: "POST",
  }) as unknown as NextRequest;
}

describe("POST /api/admin/claims/backfill-auto-review (hype-check)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { isAdmin: true } });
    mockDb.claim.update.mockResolvedValue({});
    mockDb.claim.count.mockResolvedValue(0);
  });

  it("rejects non-admin sessions without querying claims", async () => {
    mockAuth.mockResolvedValue({ user: { isAdmin: false } });

    const res = await POST(makeRequest());

    expect(res.status).toBe(403);
    expect(mockDb.claim.findMany).not.toHaveBeenCalled();
  });

  it("skips HIGH-risk claims without calling groundedFactCheckClaim", async () => {
    mockDb.claim.findMany.mockResolvedValue([
      { id: "c1", claimType: "GUARANTEE", riskLevel: "HIGH", text: "Guaranteed 40% returns" },
    ]);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(mockGroundedFactCheckClaim).not.toHaveBeenCalled();
    expect(body.skippedHighRisk).toBe(1);
    expect(body.failed).toBe(0);
  });

  it("counts a grounded-call failure as failed and leaves the claim untouched", async () => {
    mockDb.claim.findMany.mockResolvedValue([
      { id: "c2", claimType: "INCOME", riskLevel: "MEDIUM", text: "Users report 20% monthly returns" },
    ]);
    mockGroundedFactCheckClaim.mockResolvedValue({
      ok: false,
      error: new Error("Gemini grounding not configured"),
    });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(body.failed).toBe(1);
    expect(body.prefilled).toBe(0);
    expect(mockDb.claim.update).not.toHaveBeenCalled();
    expect(mockDb.evidenceItem.createMany).not.toHaveBeenCalled();
  });

  it("auto-reviews a LOW-risk claim on grounded success and persists its EvidenceItem rows", async () => {
    mockDb.claim.findMany.mockResolvedValue([
      { id: "c3", claimType: "PRICING", riskLevel: "LOW", text: "30-day money-back guarantee" },
    ]);
    mockGroundedFactCheckClaim.mockResolvedValue({
      ok: true,
      value: {
        evidenceStatus: "SUPPORTED",
        rationale: "Confirmed on vendor terms page",
        sources: [{ title: "Vendor Terms", url: "https://vendor.example.com/terms", source: "vendor.example.com" }],
      },
    });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(body.autoReviewed).toBe(1);
    expect(mockDb.claim.update).toHaveBeenCalledWith({
      where: { id: "c3" },
      data: { evidenceStatus: "SUPPORTED", explanation: "Confirmed on vendor terms page", autoReviewed: true },
    });
    expect(mockDb.evidenceItem.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ claimId: "c3", title: "Vendor Terms" })],
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/hype-check && pnpm vitest run __tests__/backfill-auto-review.test.ts`
Expected: FAIL — route still imports `factCheckClaim` from `@/lib/ai/fact-check-claim`.

- [ ] **Step 3: Implement the change**

Replace the full contents of `apps/hype-check/app/api/admin/claims/backfill-auto-review/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { classifyDeterministicRisk } from "@/lib/ai/claim-risk";
import { groundedFactCheckClaim } from "@/lib/ai/grounded-fact-check-claim";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

// Bounded per request so this stays well within a serverless function
// timeout even with a large backlog — the admin UI calls this repeatedly,
// batch by batch, until there's no more forward progress to make.
const BATCH_SIZE = 20;

// Retroactively applies the same LOW/MEDIUM/HIGH auto-review rules used for
// newly extracted claims (see lib/videos/process-video-pipeline.ts) to
// claims created before that logic existed. LOW-risk claims get a
// search-grounded AI verdict applied automatically; MEDIUM-risk claims get
// it pre-filled but still require a human one-click confirm; HIGH-risk
// claims are never touched — left NOT_CHECKED for full manual review, same
// as always. A grounded-call failure (e.g. no GEMINI_API_KEY) counts toward
// `failed` rather than silently falling back to an ungrounded guess — this
// route is an explicit admin-triggered batch action, so surfacing the
// failure is more useful here than a silent fallback would be.
export async function POST(_request: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Ordering by riskLevel ascending relies on Postgres native enum ordering
  // matching declaration order (LOW, MEDIUM, HIGH in schema.prisma) — sorts
  // auto-reviewable claims to the front so HIGH-risk claims that can never
  // be resolved here don't get stuck re-fetched at the head of every batch.
  const claims = await db.claim.findMany({
    where: { evidenceStatus: "NOT_CHECKED" },
    orderBy: [{ riskLevel: "asc" }, { createdAt: "asc" }],
    take: BATCH_SIZE,
  });

  let autoReviewed = 0;
  let prefilled = 0;
  let skippedHighRisk = 0;
  let failed = 0;

  for (const claim of claims) {
    const deterministicRisk = classifyDeterministicRisk(
      claim.claimType,
      claim.riskLevel,
      claim.text,
    );
    if (deterministicRisk !== claim.riskLevel) {
      await db.claim.update({
        where: { id: claim.id },
        data: { riskLevel: deterministicRisk },
      });
    }

    if (deterministicRisk === "HIGH") {
      skippedHighRisk++;
      continue;
    }

    const factCheckResult = await groundedFactCheckClaim({
      text: claim.text,
      category: claim.claimType,
    });

    if (!factCheckResult.ok) {
      failed++;
      continue;
    }

    await db.claim.update({
      where: { id: claim.id },
      data: {
        evidenceStatus: factCheckResult.value.evidenceStatus,
        explanation: factCheckResult.value.rationale,
        // Only LOW-risk claims are marked auto-reviewed; MEDIUM claims get
        // the verdict pre-filled but still need a human confirm click.
        autoReviewed: deterministicRisk === "LOW",
      },
    });

    if (factCheckResult.value.sources.length > 0) {
      await db.evidenceItem.createMany({
        data: factCheckResult.value.sources.map((s) => ({ ...s, claimId: claim.id })),
      });
    }

    if (deterministicRisk === "LOW") {
      autoReviewed++;
    } else {
      prefilled++;
    }
  }

  const remaining = await db.claim.count({
    where: { evidenceStatus: "NOT_CHECKED" },
  });

  revalidateTag("videos", "max");

  return Response.json({
    ok: true,
    processed: claims.length,
    autoReviewed,
    prefilled,
    skippedHighRisk,
    failed,
    remaining,
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/hype-check && pnpm vitest run __tests__/backfill-auto-review.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Typecheck**

Run: `cd apps/hype-check && pnpm typecheck`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add apps/hype-check/app/api/admin/claims/backfill-auto-review/route.ts apps/hype-check/__tests__/backfill-auto-review.test.ts
git commit -m "feat(hype-check): ground the backfill-auto-review fact-check call"
```

---

## Final verification (after all 8 tasks)

- [ ] Run `pnpm typecheck` from the repo root — both apps and `packages/core-ai` clean.
- [ ] Run `pnpm test` from the repo root — full suite passes for both apps.
- [ ] Confirm no changes touched `packages/core-compliance/src/claim-risk.ts`, `auto-publish-gate.ts`, or either app's `CATEGORY_RISK_FLOOR`.
- [ ] Confirm neither app's `lib/ai/client.ts` changed (both already pass `geminiApiKey`).
