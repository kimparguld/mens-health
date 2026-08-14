# Audit Fixes — Phase 1 (P0 Critical + P1 High) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the two critical correctness gaps and three high-severity gaps identified in the 2026-08-14 codebase audit: a vacuous auto-publish pass when AI claim extraction fails, duplicate-post risk in the X/TikTok social adapters and publish route, non-atomic video-processing job claiming, an incomplete admin audit trail, and an AI provider-fallback chain that doesn't catch its own documented failure mode.

**Architecture:** Each task is a narrowly-scoped, independently testable fix at the exact file/line the audit identified. No new abstractions beyond what's needed to make the fix testable (e.g. extracting a 3-line pure decision function so it doesn't need a full job-orchestration test). Tasks 1–2, 3, 5, 8 touch shared logic or run in parallel per-app; Tasks 4, 6, 7 have app-specific scope noted per task.

**Tech Stack:** Next.js 16 route handlers, Prisma (one DB per app), Vitest + Testing Library, pnpm/Turborepo workspace packages (`@menhealth/core-social`, `@menhealth/core-ai`).

**Spec:** This plan implements the P0/P1 rows of the "MenHealth Digest — codebase and admin-flow review" audit conducted 2026-08-14 (findings 01, 03a, 03b, and related items). No separate spec doc exists — the audit findings below, verified by direct file read, serve as the spec for each task.

## Global Constraints

- Never let AI output publish health/claim content automatically without a human decision when there's genuine uncertainty (AGENTS.md). A claim-extraction failure is uncertainty, not a clean bill of health — Tasks 1–2 enforce this.
- X and TikTok publishing are real and automated; retries must never be able to double-post to a live audience (AGENTS.md, Tasks 3–4).
- Small, single-concern PRs. No magic strings — named constants. Early returns over deep nesting (AGENTS.md).
- Add unit tests for scoring, parsing, and AI-output-validation functions (AGENTS.md) — every task below includes a real test, not a placeholder.
- **Task 7 requires a Prisma migration in both apps.** `prisma migrate dev` applies immediately to whatever `DATABASE_URL` each app's `.env` points at. **Stop before running the migrate commands in Task 7 and confirm with the user which database this will hit** — do not assume it's safe to apply non-interactively.

---

## Task 1: Hold auto-publish on claim-extraction failure — menhealth

**Files:**
- Create: `apps/menhealth/lib/videos/decide-auto-publish-status.ts`
- Test: `apps/menhealth/__tests__/decide-auto-publish-status.test.ts`
- Modify: `apps/menhealth/lib/videos/process-video-pipeline.ts`
- Test: `apps/menhealth/__tests__/process-video-pipeline.test.ts`
- Modify: `apps/menhealth/jobs/process-pending-videos.ts`

**Interfaces:**
- Produces: `decideAutoPublishStatus(claimExtractionFailed: boolean, eligibleForAutoPublish: boolean): "PUBLISHED" | "PROCESSED"` — a small pure function so the auto-publish decision is unit-testable without mocking the whole job pipeline.
- Produces: `GenerateSummaryAndClaimsResult` gains a `claimExtractionFailed: boolean` field.

- [ ] **Step 1: Write the failing test for the decision function**

```typescript
// apps/menhealth/__tests__/decide-auto-publish-status.test.ts
import { describe, it, expect } from "vitest";
import { decideAutoPublishStatus } from "@/lib/videos/decide-auto-publish-status";

describe("decideAutoPublishStatus", () => {
  it("holds for review when claim extraction failed, even if the gate says eligible", () => {
    expect(decideAutoPublishStatus(true, true)).toBe("PROCESSED");
  });

  it("publishes when claim extraction succeeded and the gate says eligible", () => {
    expect(decideAutoPublishStatus(false, true)).toBe("PUBLISHED");
  });

  it("holds for review when claim extraction succeeded but the gate says ineligible", () => {
    expect(decideAutoPublishStatus(false, false)).toBe("PROCESSED");
  });
});
```

- [ ] **Step 2: Run it, confirm it fails with a module-not-found error**

Run: `pnpm --filter menhealth exec vitest run __tests__/decide-auto-publish-status.test.ts`
Expected: FAIL — cannot find module `@/lib/videos/decide-auto-publish-status`

- [ ] **Step 3: Create the decision function**

```typescript
// apps/menhealth/lib/videos/decide-auto-publish-status.ts
export type AutoPublishStatus = "PUBLISHED" | "PROCESSED";

// A claim-extraction failure must never be treated as "this video has no
// risky claims" — it means we don't know. Before this fix,
// generateSummaryAndClaims returned an empty claims array on extraction
// failure, which made isEligibleForAutoPublish's `claims.every(...)`
// trivially true and let the video auto-publish with zero human review.
export function decideAutoPublishStatus(
  claimExtractionFailed: boolean,
  eligibleForAutoPublish: boolean,
): AutoPublishStatus {
  if (claimExtractionFailed) return "PROCESSED";
  return eligibleForAutoPublish ? "PUBLISHED" : "PROCESSED";
}
```

- [ ] **Step 4: Run the test again, confirm it passes**

Run: `pnpm --filter menhealth exec vitest run __tests__/decide-auto-publish-status.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing test for the pipeline's new flag**

```typescript
// apps/menhealth/__tests__/process-video-pipeline.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  summary: { create: vi.fn() },
  claim: { create: vi.fn(), update: vi.fn() },
  video: { update: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({ db: mockDb }));
vi.mock("@/lib/ai/summarize-video", () => ({ summarizeVideo: vi.fn() }));
vi.mock("@/lib/ai/extract-claims", () => ({ extractClaims: vi.fn() }));

import { generateSummaryAndClaims } from "@/lib/videos/process-video-pipeline";
import { summarizeVideo } from "@/lib/ai/summarize-video";
import { extractClaims } from "@/lib/ai/extract-claims";

const mockSummarizeVideo = vi.mocked(summarizeVideo);
const mockExtractClaims = vi.mocked(extractClaims);

const baseVideo = {
  id: "video-1",
  title: "Test video",
  description: "Test description",
  durationSeconds: 300,
  riskLevel: "LOW" as const,
};

describe("generateSummaryAndClaims claim-extraction failure handling", () => {
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
    mockDb.summary.create.mockResolvedValue({
      id: "summary-1",
      shortSummary: "short summary",
    });
  });

  it("returns claimExtractionFailed: true and an empty claims array when extraction fails", async () => {
    mockExtractClaims.mockResolvedValue({
      ok: false,
      error: new Error("AI provider unavailable"),
    });

    const result = await generateSummaryAndClaims(baseVideo, "Some Channel", {
      modelUsed: "test-model",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.value.claims).toEqual([]);
    expect(result.value.claimExtractionFailed).toBe(true);
  });

  it("returns claimExtractionFailed: false when extraction succeeds", async () => {
    mockExtractClaims.mockResolvedValue({ ok: true, value: [] });

    const result = await generateSummaryAndClaims(baseVideo, "Some Channel", {
      modelUsed: "test-model",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.value.claimExtractionFailed).toBe(false);
  });
});
```

- [ ] **Step 6: Run it, confirm it fails**

Run: `pnpm --filter menhealth exec vitest run __tests__/process-video-pipeline.test.ts`
Expected: FAIL — `result.value.claimExtractionFailed` is `undefined`, not `true`/`false`

- [ ] **Step 7: Add the flag to `process-video-pipeline.ts`**

In `apps/menhealth/lib/videos/process-video-pipeline.ts`, change the result type:

```typescript
export type GenerateSummaryAndClaimsResult = {
  summary: Summary;
  claims: Claim[];
  claimExtractionFailed: boolean;
};
```

Change the extraction-failure branch (currently lines 75–80):

```typescript
  if (!claimsResult.ok) {
    console.warn(
      `Claim extraction failed for video ${video.id}: ${claimsResult.error.message}`,
    );
    return { ok: true, value: { summary, claims: [], claimExtractionFailed: true } };
  }
```

Change the final return statement (currently line 134):

```typescript
  return { ok: true, value: { summary, claims, claimExtractionFailed: false } };
```

- [ ] **Step 8: Run both new test files, confirm they pass**

Run: `pnpm --filter menhealth exec vitest run __tests__/process-video-pipeline.test.ts __tests__/decide-auto-publish-status.test.ts`
Expected: PASS (5 tests total)

- [ ] **Step 9: Wire the flag into the job that decides PUBLISHED vs. PROCESSED**

In `apps/menhealth/jobs/process-pending-videos.ts`, add the import:

```typescript
import { decideAutoPublishStatus } from "@/lib/videos/decide-auto-publish-status";
```

Change `const { claims } = pipelineResult.value;` (line 83) to:

```typescript
      const { claims, claimExtractionFailed } = pipelineResult.value;
```

Change the `finalStatus` computation (currently lines 108–113):

```typescript
      const finalStatus = decideAutoPublishStatus(
        claimExtractionFailed,
        isEligibleForAutoPublish(
          { riskLevel: latestVideo?.riskLevel ?? video.riskLevel },
          claims,
        ),
      );
```

- [ ] **Step 10: Typecheck and run the full menhealth test suite**

Run: `pnpm --filter menhealth typecheck && pnpm --filter menhealth exec vitest run`
Expected: PASS, no type errors

- [ ] **Step 11: Commit**

```bash
git add apps/menhealth/lib/videos/decide-auto-publish-status.ts apps/menhealth/__tests__/decide-auto-publish-status.test.ts apps/menhealth/lib/videos/process-video-pipeline.ts apps/menhealth/__tests__/process-video-pipeline.test.ts apps/menhealth/jobs/process-pending-videos.ts
git commit -m "fix(menhealth): hold auto-publish when claim extraction fails instead of vacuously passing"
```

---

## Task 2: Hold auto-publish on claim-extraction failure — hype-check

**Files:**
- Create: `apps/hype-check/lib/videos/decide-auto-publish-status.ts`
- Test: `apps/hype-check/__tests__/decide-auto-publish-status.test.ts`
- Modify: `apps/hype-check/lib/videos/process-video-pipeline.ts`
- Test: `apps/hype-check/__tests__/process-video-pipeline-claim-extraction-failure.test.ts`
- Modify: `apps/hype-check/jobs/process-pending-videos.ts`

**Interfaces:**
- Produces: `decideAutoPublishStatus(claimExtractionFailed: boolean, eligibleForAutoPublish: boolean): "PUBLISHED" | "REVIEW"` — same shape as Task 1's menhealth version, but hype-check's non-published status is `"REVIEW"`, not `"PROCESSED"`.
- Note: hype-check's `generateSummaryAndClaims` already has a `claimsResult` variable in scope at its final return statement — this task only adds one field to the return, it does not restructure control flow (unlike Task 1, hype-check's pipeline never returned early on claim-extraction failure — it already runs the independent warning/cost/disclosure extraction regardless, by design, so risk escalation from warning signs already survives a claims failure. This task closes the remaining gap: the claims-specific vacuous pass).

- [ ] **Step 1: Write the failing test for the decision function**

```typescript
// apps/hype-check/__tests__/decide-auto-publish-status.test.ts
import { describe, it, expect } from "vitest";
import { decideAutoPublishStatus } from "@/lib/videos/decide-auto-publish-status";

describe("decideAutoPublishStatus", () => {
  it("holds for review when claim extraction failed, even if the gate says eligible", () => {
    expect(decideAutoPublishStatus(true, true)).toBe("REVIEW");
  });

  it("publishes when claim extraction succeeded and the gate says eligible", () => {
    expect(decideAutoPublishStatus(false, true)).toBe("PUBLISHED");
  });

  it("holds for review when claim extraction succeeded but the gate says ineligible", () => {
    expect(decideAutoPublishStatus(false, false)).toBe("REVIEW");
  });
});
```

- [ ] **Step 2: Run it, confirm it fails with a module-not-found error**

Run: `pnpm --filter hype-check exec vitest run __tests__/decide-auto-publish-status.test.ts`
Expected: FAIL — cannot find module `@/lib/videos/decide-auto-publish-status`

- [ ] **Step 3: Create the decision function**

```typescript
// apps/hype-check/lib/videos/decide-auto-publish-status.ts
export type AutoPublishStatus = "PUBLISHED" | "REVIEW";

// A claim-extraction failure must never be treated as "this subject has no
// risky claims" — it means we don't know. isEligibleForAutoPublish's
// `claims.every(...)` is trivially true on an empty array, so without this
// check a claims failure could silently auto-publish.
export function decideAutoPublishStatus(
  claimExtractionFailed: boolean,
  eligibleForAutoPublish: boolean,
): AutoPublishStatus {
  if (claimExtractionFailed) return "REVIEW";
  return eligibleForAutoPublish ? "PUBLISHED" : "REVIEW";
}
```

- [ ] **Step 4: Run the test again, confirm it passes**

Run: `pnpm --filter hype-check exec vitest run __tests__/decide-auto-publish-status.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing test for the pipeline's new flag**

```typescript
// apps/hype-check/__tests__/process-video-pipeline-claim-extraction-failure.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  summary: { create: vi.fn() },
  claim: { create: vi.fn(), update: vi.fn() },
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
  generateEditorialTitle: vi.fn(),
  generateTopicFaq: vi.fn(),
}));

vi.mock("@/lib/ai/extract-warnings-costs-disclosures", () => ({
  extractWarningsCostsDisclosures: vi.fn(),
}));

import { generateSummaryAndClaims } from "@/lib/videos/process-video-pipeline";
import { summarizeVideo, extractClaims } from "@/lib/ai/pipeline";
import { extractWarningsCostsDisclosures } from "@/lib/ai/extract-warnings-costs-disclosures";

const mockSummarizeVideo = vi.mocked(summarizeVideo);
const mockExtractClaims = vi.mocked(extractClaims);
const mockExtractWarningsCostsDisclosures = vi.mocked(
  extractWarningsCostsDisclosures,
);

const baseVideo = {
  subjectId: "subject-1",
  sourceVideoId: "source-video-1",
  title: "Test video",
  description: "Test description",
  durationSeconds: 300,
  riskLevel: "LOW" as const,
};

describe("generateSummaryAndClaims claimExtractionFailed flag", () => {
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
    mockDb.summary.create.mockResolvedValue({
      id: "summary-1",
      shortSummary: "short summary",
    });
    mockExtractWarningsCostsDisclosures.mockResolvedValue({
      ok: true,
      value: { warningSigns: [], costItems: [], disclosures: [] },
    });
  });

  it("sets claimExtractionFailed: true when extraction fails", async () => {
    mockExtractClaims.mockResolvedValue({
      ok: false,
      error: new Error("AI provider unavailable"),
    });

    const result = await generateSummaryAndClaims(baseVideo, "Some Channel", {
      modelUsed: "test-model",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.value.claims).toEqual([]);
    expect(result.value.claimExtractionFailed).toBe(true);
  });

  it("sets claimExtractionFailed: false when extraction succeeds", async () => {
    mockExtractClaims.mockResolvedValue({ ok: true, value: [] });

    const result = await generateSummaryAndClaims(baseVideo, "Some Channel", {
      modelUsed: "test-model",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.value.claimExtractionFailed).toBe(false);
  });
});
```

- [ ] **Step 6: Run it, confirm it fails**

Run: `pnpm --filter hype-check exec vitest run __tests__/process-video-pipeline-claim-extraction-failure.test.ts`
Expected: FAIL — `result.value.claimExtractionFailed` is `undefined`

- [ ] **Step 7: Add the flag to `process-video-pipeline.ts`**

In `apps/hype-check/lib/videos/process-video-pipeline.ts`, add `claimExtractionFailed: boolean;` to the `GenerateSummaryAndClaimsResult` type:

```typescript
export type GenerateSummaryAndClaimsResult = {
  summary: Summary;
  claims: Claim[];
  claimExtractionFailed: boolean;
  warningSigns: WarningSignOutput[];
  costItems: CostItemOutput[];
  disclosures: DisclosureOutput[];
};
```

Change the final return statement (currently lines 223–226):

```typescript
  return {
    ok: true,
    value: {
      summary,
      claims,
      claimExtractionFailed: !claimsResult.ok,
      warningSigns,
      costItems,
      disclosures,
    },
  };
```

- [ ] **Step 8: Run both new test files, confirm they pass**

Run: `pnpm --filter hype-check exec vitest run __tests__/process-video-pipeline-claim-extraction-failure.test.ts __tests__/decide-auto-publish-status.test.ts`
Expected: PASS (5 tests total)

- [ ] **Step 9: Also run the existing risk-escalation test to confirm no regression**

Run: `pnpm --filter hype-check exec vitest run __tests__/process-video-pipeline-risk-escalation.test.ts`
Expected: PASS (3 tests, unchanged — this task only adds a field, doesn't change escalation logic)

- [ ] **Step 10: Wire the flag into the job that decides PUBLISHED vs. REVIEW**

In `apps/hype-check/jobs/process-pending-videos.ts`, add the import:

```typescript
import { decideAutoPublishStatus } from "@/lib/videos/decide-auto-publish-status";
```

Change `const { claims } = pipelineResult.value;` (line 95) to:

```typescript
      const { claims, claimExtractionFailed } = pipelineResult.value;
```

Change the `finalStatus` computation (currently lines 120–125):

```typescript
      const finalStatus = decideAutoPublishStatus(
        claimExtractionFailed,
        isEligibleForAutoPublish(
          { riskLevel: latestSubject?.riskLevel ?? subject.riskLevel },
          claims,
        ),
      );
```

- [ ] **Step 11: Typecheck and run the full hype-check test suite**

Run: `pnpm --filter hype-check typecheck && pnpm --filter hype-check exec vitest run`
Expected: PASS, no type errors

- [ ] **Step 12: Commit**

```bash
git add apps/hype-check/lib/videos/decide-auto-publish-status.ts apps/hype-check/__tests__/decide-auto-publish-status.test.ts apps/hype-check/lib/videos/process-video-pipeline.ts apps/hype-check/__tests__/process-video-pipeline-claim-extraction-failure.test.ts apps/hype-check/jobs/process-pending-videos.ts
git commit -m "fix(hype-check): hold auto-publish when claim extraction fails instead of vacuously passing"
```

---

## Task 3: Stop reporting a successful X/TikTok post as a failure

**Files:**
- Modify: `packages/core-social/src/adapters/x.ts:186-199`
- Modify: `packages/core-social/src/adapters/tiktok.ts:236-277`
- Test: `apps/menhealth/__tests__/social-adapters.test.ts`

**Interfaces:**
- Consumes: existing `XAdapter`/`TikTokAdapter` classes and their `publish()` method signature — unchanged externally (`Promise<PublishResult>`).
- No new exports — this is a bug fix within existing methods.

- [ ] **Step 1: Write the failing test for XAdapter**

Add to `apps/menhealth/__tests__/social-adapters.test.ts`, after the existing `XAdapter createDraft()` describe block:

```typescript
// ---------------------------------------------------------------------------
// X adapter — publish()
// ---------------------------------------------------------------------------

describe("XAdapter.publish()", () => {
  const db = { socialAccount: { findUnique: vi.fn() } };
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    db.socialAccount.findUnique.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports the tweet as published even when the account handle lookup fails afterward", async () => {
    db.socialAccount.findUnique
      .mockResolvedValueOnce({
        accessToken: "token",
        refreshToken: null,
        tokenExpiry: new Date(Date.now() + 3600_000),
        handle: "menhealthdigest",
      })
      .mockRejectedValueOnce(new Error("db unavailable"));

    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ data: { id: "tweet_1", text: "hi" } }),
    });

    const adapter = new XAdapter({ clientId: "id", clientSecret: "secret", db });
    const result = await adapter.publish(
      makePost({ platform: "X", caption: "Short.", hashtags: [] }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.platformPostId).toBe("tweet_1");
      expect(result.platformUrl).toBe("https://x.com/i/status/tweet_1");
    }
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `pnpm --filter menhealth exec vitest run __tests__/social-adapters.test.ts -t "reports the tweet as published"`
Expected: FAIL — `result.ok` is `false` (the account-lookup rejection currently propagates to the outer catch)

- [ ] **Step 3: Fix `x.ts`**

In `packages/core-social/src/adapters/x.ts`, replace lines 186–195:

```typescript
      const tweetId = parsed.data.data.id;

      // Fetch the author's username from the stored handle to build the URL
      const account = await this.config.db.socialAccount.findUnique({
        where: { platform: 'X' },
      });
      const username = account?.handle?.replace('@', '') ?? 'i';
      const platformUrl = `https://x.com/${username}/status/${tweetId}`;

      return { ok: true, platformPostId: tweetId, platformUrl };
```

with:

```typescript
      const tweetId = parsed.data.data.id;

      // The tweet has already been posted successfully at this point — a
      // failure below (fetching the stored handle to build a pretty URL)
      // must never turn into a reported publish failure, or a retry would
      // post a genuine duplicate tweet. Fall back to a generic profile URL
      // instead of letting the lookup error reach the outer catch.
      let platformUrl = `https://x.com/i/status/${tweetId}`;
      try {
        const account = await this.config.db.socialAccount.findUnique({
          where: { platform: 'X' },
        });
        const username = account?.handle?.replace('@', '') ?? 'i';
        platformUrl = `https://x.com/${username}/status/${tweetId}`;
      } catch (lookupErr) {
        console.warn(
          `[XAdapter] Tweet ${tweetId} posted successfully, but looking up the account handle failed: ${
            lookupErr instanceof Error ? lookupErr.message : String(lookupErr)
          }`,
        );
      }

      return { ok: true, platformPostId: tweetId, platformUrl };
```

- [ ] **Step 4: Run the test again, confirm it passes**

Run: `pnpm --filter menhealth exec vitest run __tests__/social-adapters.test.ts -t "reports the tweet as published"`
Expected: PASS

- [ ] **Step 5: Write the failing test for TikTokAdapter**

Add to the existing `describe("TikTokAdapter.publish()", ...)` block in `apps/menhealth/__tests__/social-adapters.test.ts`, after the `"returns an error when the init call fails"` test:

```typescript
  it("reports the video as published even when the account handle lookup fails after upload", async () => {
    db.socialAccount.findUnique
      .mockResolvedValueOnce({
        accessToken: "token",
        refreshToken: null,
        tokenExpiry: new Date(Date.now() + 3600_000),
        handle: "menhealthdigest",
      })
      .mockRejectedValueOnce(new Error("db unavailable"));

    fetchMock
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            data: { publish_id: "pub_1", upload_url: "https://upload.example.com" },
          }),
      })
      .mockResolvedValueOnce({ ok: true, text: async () => "" });

    const adapter = new TikTokAdapter({ clientId: "id", clientSecret: "secret", db });
    const result = await adapter.publish(makeTikTokPost());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.platformPostId).toBe("pub_1");
      expect(result.platformUrl).toBe("https://www.tiktok.com/");
    }
  }, 15000);
```

- [ ] **Step 6: Run it, confirm it fails**

Run: `pnpm --filter menhealth exec vitest run __tests__/social-adapters.test.ts -t "reports the video as published"`
Expected: FAIL — the account-lookup rejection (or the subsequent unmocked status-poll fetch call) currently propagates to the outer catch, `result.ok` is `false`

- [ ] **Step 7: Fix `tiktok.ts`**

In `packages/core-social/src/adapters/tiktok.ts`, replace lines 236–277 (from `const account = await this.config.db...` through the final `return { ok: true, platformPostId: publish_id, platformUrl: profileUrl };`):

```typescript
      // The video is already uploaded and TikTok's async publish is already
      // initiated at this point — irreversible. Nothing below this line may
      // turn an unexpected error into a reported publish failure, or a
      // retry would upload a genuine duplicate video. Everything from here
      // down degrades to the profile-URL fallback on any lookup/poll error
      // instead of throwing into the outer catch.
      let account: { handle?: string | null } | null = null;
      try {
        account = await this.config.db.socialAccount.findUnique({
          where: { platform: 'TIKTOK' },
        });
      } catch (lookupErr) {
        console.warn(
          `[TikTokAdapter] Video uploaded successfully (publish_id: ${publish_id}), but looking up the account handle failed: ${
            lookupErr instanceof Error ? lookupErr.message : String(lookupErr)
          }`,
        );
      }
      const profileUrl = account?.handle ? `https://www.tiktok.com/@${account.handle}` : 'https://www.tiktok.com/';

      // TikTok processes the upload asynchronously — poll briefly for the
      // final public video ID, but don't block indefinitely on it. If it's
      // still processing when we give up, or a poll request itself throws
      // (network blip, transient 5xx), the post is still live/queued on
      // TikTok's side; we just fall back to the profile URL.
      try {
        for (let attempt = 0; attempt < STATUS_POLL_ATTEMPTS; attempt++) {
          await sleep(STATUS_POLL_INTERVAL_MS);

          const statusRes = await fetch(STATUS_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify({ publish_id }),
          });
          if (!statusRes.ok) continue;

          const statusParsed = StatusResponse.safeParse(await statusRes.json());
          if (!statusParsed.success) continue;

          const { status, publicly_available_post_id } = statusParsed.data.data;
          if (status === 'PUBLISH_COMPLETE') {
            const videoId = publicly_available_post_id?.[0];
            const platformUrl =
              videoId && account?.handle ? `https://www.tiktok.com/@${account.handle}/video/${videoId}` : profileUrl;
            return { ok: true, platformPostId: publish_id, platformUrl };
          }
          if (status === 'FAILED') {
            return {
              ok: false,
              errorCode: 'TIKTOK_PUBLISH_FAILED',
              errorMsg: `TikTok reported the publish as failed (publish_id: ${publish_id})`,
            };
          }
        }
      } catch (pollErr) {
        console.warn(
          `[TikTokAdapter] Video uploaded successfully (publish_id: ${publish_id}), but status polling threw: ${
            pollErr instanceof Error ? pollErr.message : String(pollErr)
          }`,
        );
      }

      return { ok: true, platformPostId: publish_id, platformUrl: profileUrl };
```

- [ ] **Step 8: Run the test again, confirm it passes**

Run: `pnpm --filter menhealth exec vitest run __tests__/social-adapters.test.ts -t "reports the video as published"`
Expected: PASS

- [ ] **Step 9: Run the full adapter test file and core-social typecheck**

Run: `pnpm --filter menhealth exec vitest run __tests__/social-adapters.test.ts && pnpm --filter @menhealth/core-social typecheck`
Expected: PASS, no type errors (all prior tests in the file still pass — the `"publishes and returns the public video URL..."` test still works since account lookup there resolves successfully both times it's implicitly called)

- [ ] **Step 10: Commit**

```bash
git add packages/core-social/src/adapters/x.ts packages/core-social/src/adapters/tiktok.ts apps/menhealth/__tests__/social-adapters.test.ts
git commit -m "fix(core-social): never report a successful X/TikTok post as failed due to a post-publish lookup error"
```

---

## Task 4: Atomic claim on the social publish route (menhealth)

**Files:**
- Modify: `apps/menhealth/prisma/schema.prisma`
- Modify: `apps/menhealth/app/api/social/drafts/[id]/publish/route.ts`
- Test: `apps/menhealth/__tests__/social-publish-route.test.ts`

**Interfaces:**
- Consumes: `PostStatus` enum in `apps/menhealth/prisma/schema.prisma` (gains one new value: `PUBLISHING`).
- No exported function signatures change — this is internal route-handler logic plus a schema addition.

> **Note:** hype-check has no `publish/route.ts` (it has no TikTok/immediate-publish flow yet — only the scheduled X cron), so this task is menhealth-only.

- [ ] **Step 1: Add the `PUBLISHING` transitional status to the schema**

In `apps/menhealth/prisma/schema.prisma`, find the `enum PostStatus` block and add `PUBLISHING` as a new value (placed logically between `APPROVED`/`SCHEDULED` and `PUBLISHED` in the enum body — match the existing enum's formatting style).

- [ ] **Step 2: Create the migration**

Run: `pnpm --filter menhealth exec prisma migrate dev --name add_post_status_publishing`
Expected: Prisma generates a new migration file under `apps/menhealth/prisma/migrations/` and applies it to the database configured in `apps/menhealth/.env`'s `DATABASE_URL`.

**Before running this: confirm with the user which database `DATABASE_URL` points at.** This is a real schema migration, not a dry run.

- [ ] **Step 3: Write the failing test**

```typescript
// apps/menhealth/__tests__/social-publish-route.test.ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockFindUnique, mockUpdateMany, mockTransaction } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdateMany: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

vi.mock("@/lib/db/prisma", () => ({
  db: {
    socialPost: {
      findUnique: mockFindUnique,
      updateMany: mockUpdateMany,
      update: vi.fn(),
    },
    socialPublishAttempt: { create: vi.fn() },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/social/adapters/tiktok", () => ({
  TikTokAdapter: class {
    validate = vi.fn().mockResolvedValue({ ok: true });
    publish = vi.fn().mockResolvedValue({
      ok: true,
      platformPostId: "pub_1",
      platformUrl: "https://www.tiktok.com/@x/video/1",
    });
  },
}));

function makeRequest(id: string) {
  return new NextRequest(`http://localhost/api/social/drafts/${id}/publish`, {
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { isAdmin: true, email: "admin@example.com" } });
  mockTransaction.mockResolvedValue([]);
});

describe("POST /api/social/drafts/[id]/publish — atomic claim", () => {
  it("rejects a second concurrent publish attempt once the first has claimed the post", async () => {
    const { POST } = await import("@/app/api/social/drafts/[id]/publish/route");

    mockFindUnique.mockResolvedValue({
      id: "post_1",
      platform: "TIKTOK",
      status: "APPROVED",
    });
    // First call claims the row (count 1); second call finds it already
    // claimed (count 0) — exactly what Postgres returns for two concurrent
    // UPDATE ... WHERE status = 'APPROVED' statements racing the same row.
    mockUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    const first = await POST(makeRequest("post_1"), {
      params: Promise.resolve({ id: "post_1" }),
    });
    const second = await POST(makeRequest("post_1"), {
      params: Promise.resolve({ id: "post_1" }),
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    const secondBody = (await second.json()) as { error: string };
    expect(secondBody.error).toMatch(/not in a publishable state/i);
  });
});
```

- [ ] **Step 4: Run it, confirm it fails**

Run: `pnpm --filter menhealth exec vitest run __tests__/social-publish-route.test.ts`
Expected: FAIL — the route doesn't call `updateMany` at all yet, so both requests return 200

- [ ] **Step 5: Add the atomic claim to the route**

In `apps/menhealth/app/api/social/drafts/[id]/publish/route.ts`, insert this block immediately after the existing `if (!post) { ... }` check (before the `const adapter = ADAPTERS[post.platform];` line):

```typescript
  // Atomically claim the post before doing any real publish work. Two
  // concurrent requests (a double-click, or a retried fetch) would
  // otherwise both read the same APPROVED/SCHEDULED status and both
  // proceed to publish — this is the fix for that race. Postgres
  // serializes the two UPDATE statements on the same row; the second one's
  // WHERE clause re-evaluates against the first's committed result and
  // matches zero rows.
  const claim = await db.socialPost.updateMany({
    where: { id: post.id, status: { in: ["APPROVED", "SCHEDULED"] } },
    data: { status: "PUBLISHING" },
  });
  if (claim.count === 0) {
    return NextResponse.json(
      {
        error:
          "Post is not in a publishable state (already publishing, published, or not approved).",
      },
      { status: 409 },
    );
  }
```

- [ ] **Step 6: Run the test again, confirm it passes**

Run: `pnpm --filter menhealth exec vitest run __tests__/social-publish-route.test.ts`
Expected: PASS

- [ ] **Step 7: Typecheck and run the full menhealth test suite**

Run: `pnpm --filter menhealth typecheck && pnpm --filter menhealth exec vitest run`
Expected: PASS, no type errors

- [ ] **Step 8: Commit**

```bash
git add apps/menhealth/prisma/schema.prisma apps/menhealth/prisma/migrations apps/menhealth/app/api/social/drafts/\[id\]/publish/route.ts apps/menhealth/__tests__/social-publish-route.test.ts
git commit -m "fix(menhealth): atomically claim a social post before publishing to prevent duplicate posts from concurrent requests"
```

---

## Task 5: Atomic job claiming in video processing (both apps)

**Files:**
- Modify: `apps/menhealth/jobs/process-pending-videos.ts`
- Test: `apps/menhealth/__tests__/process-pending-videos.test.ts`
- Modify: `apps/hype-check/jobs/process-pending-videos.ts`
- Test: `apps/hype-check/__tests__/process-pending-videos.test.ts`

**Interfaces:**
- No exported signatures change — `processPendingVideos()` keeps its existing `{ processed, failed }` return shape in both apps.

- [ ] **Step 1: Write the failing test — menhealth**

```typescript
// apps/menhealth/__tests__/process-pending-videos.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  processingJob: { updateMany: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  channel: { findUnique: vi.fn() },
  video: { findUnique: vi.fn(), update: vi.fn() },
  adminReview: { create: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({ db: mockDb }));
vi.mock("@/lib/videos/process-video-pipeline", () => ({
  generateSummaryAndClaims: vi.fn(),
}));
vi.mock("@/lib/ai/generate-editorial-title", () => ({
  generateEditorialTitle: vi.fn(),
}));
vi.mock("@/lib/publishing/auto-publish-gate", () => ({
  isEligibleForAutoPublish: vi.fn(),
}));
vi.mock("@menhealth/core-seo", () => ({ submitUrlsToIndexNow: vi.fn() }));
vi.mock("@/lib/creators/notify", () => ({ notifyCreatorIfApplicable: vi.fn() }));

import { processPendingVideos } from "@/jobs/process-pending-videos";
import { generateSummaryAndClaims } from "@/lib/videos/process-video-pipeline";

const mockGenerateSummaryAndClaims = vi.mocked(generateSummaryAndClaims);

describe("processPendingVideos — atomic job claiming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.processingJob.updateMany.mockResolvedValue({ count: 0 });
  });

  it("skips a job that a concurrent run already claimed, without calling the AI pipeline", async () => {
    mockDb.processingJob.findMany.mockResolvedValue([
      {
        id: "job_1",
        video: { id: "video_1", channelId: "channel_1", riskLevel: "LOW" },
      },
    ]);

    const result = await processPendingVideos();

    expect(mockDb.processingJob.updateMany).toHaveBeenCalledWith({
      where: { id: "job_1", status: "QUEUED" },
      data: { status: "RUNNING", startedAt: expect.any(Date) },
    });
    expect(mockGenerateSummaryAndClaims).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 0, failed: 0 });
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `pnpm --filter menhealth exec vitest run __tests__/process-pending-videos.test.ts`
Expected: FAIL — `updateMany` is never called with a per-job claim (the current code calls `db.processingJob.update`, singular, unconditionally)

- [ ] **Step 3: Fix `apps/menhealth/jobs/process-pending-videos.ts`**

Replace the loop's opening (currently lines 60–66):

```typescript
  for (const job of jobs) {
    try {
      await db.processingJob.update({
        where: { id: job.id },
        data: { status: "RUNNING", startedAt: new Date() },
      });

      const { video } = job;
```

with:

```typescript
  for (const job of jobs) {
    const claim = await db.processingJob.updateMany({
      where: { id: job.id, status: "QUEUED" },
      data: { status: "RUNNING", startedAt: new Date() },
    });
    if (claim.count === 0) {
      // The daily cron and the admin's manual "process now" trigger both
      // call this function — if a concurrent run already claimed this job,
      // skip it instead of double-processing (duplicate AI spend, duplicate
      // AdminReview rows, duplicate creator notifications).
      continue;
    }

    try {
      const { video } = job;
```

- [ ] **Step 4: Run the test again, confirm it passes**

Run: `pnpm --filter menhealth exec vitest run __tests__/process-pending-videos.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck and run the full menhealth test suite**

Run: `pnpm --filter menhealth typecheck && pnpm --filter menhealth exec vitest run`
Expected: PASS, no type errors (existing behavior for the happy path — a job that successfully claims — is unchanged, since `claim.count` is 1 in that case and execution proceeds exactly as before)

- [ ] **Step 6: Commit menhealth**

```bash
git add apps/menhealth/jobs/process-pending-videos.ts apps/menhealth/__tests__/process-pending-videos.test.ts
git commit -m "fix(menhealth): atomically claim processing jobs to prevent double-processing by concurrent runs"
```

- [ ] **Step 7: Write the failing test — hype-check**

```typescript
// apps/hype-check/__tests__/process-pending-videos.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  processingJob: { updateMany: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  channel: { findUnique: vi.fn() },
  subject: { findUnique: vi.fn(), update: vi.fn() },
  adminReview: { create: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({ db: mockDb }));
vi.mock("@/lib/videos/process-video-pipeline", () => ({
  generateSummaryAndClaims: vi.fn(),
}));
vi.mock("@/lib/ai/generate-editorial-title", () => ({
  generateEditorialTitle: vi.fn(),
}));
vi.mock("@/lib/publishing/auto-publish-gate", () => ({
  isEligibleForAutoPublish: vi.fn(),
}));
vi.mock("@menhealth/core-seo", () => ({ submitUrlsToIndexNow: vi.fn() }));
vi.mock("@/lib/creators/notify", () => ({ notifyCreatorIfApplicable: vi.fn() }));

import { processPendingVideos } from "@/jobs/process-pending-videos";
import { generateSummaryAndClaims } from "@/lib/videos/process-video-pipeline";

const mockGenerateSummaryAndClaims = vi.mocked(generateSummaryAndClaims);

describe("processPendingVideos — atomic job claiming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.processingJob.updateMany.mockResolvedValue({ count: 0 });
  });

  it("skips a job that a concurrent run already claimed, without calling the AI pipeline", async () => {
    mockDb.processingJob.findMany.mockResolvedValue([
      {
        id: "job_1",
        sourceVideo: {
          id: "source-video-1",
          channelId: "channel_1",
          subject: { id: "subject-1", riskLevel: "LOW" },
        },
      },
    ]);

    const result = await processPendingVideos();

    expect(mockDb.processingJob.updateMany).toHaveBeenCalledWith({
      where: { id: "job_1", status: "QUEUED" },
      data: { status: "RUNNING", startedAt: expect.any(Date) },
    });
    expect(mockGenerateSummaryAndClaims).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 0, failed: 0 });
  });
});
```

- [ ] **Step 8: Run it, confirm it fails**

Run: `pnpm --filter hype-check exec vitest run __tests__/process-pending-videos.test.ts`
Expected: FAIL — same reason as menhealth

- [ ] **Step 9: Fix `apps/hype-check/jobs/process-pending-videos.ts`**

Replace the loop's opening (currently lines 64–71):

```typescript
  for (const job of jobs) {
    try {
      await db.processingJob.update({
        where: { id: job.id },
        data: { status: "RUNNING", startedAt: new Date() },
      });

      const { sourceVideo } = job;
      const { subject } = sourceVideo;
```

with:

```typescript
  for (const job of jobs) {
    const claim = await db.processingJob.updateMany({
      where: { id: job.id, status: "QUEUED" },
      data: { status: "RUNNING", startedAt: new Date() },
    });
    if (claim.count === 0) {
      // The daily cron and the admin's manual "process now" trigger both
      // call this function — if a concurrent run already claimed this job,
      // skip it instead of double-processing (duplicate AI spend, duplicate
      // AdminReview rows, duplicate creator notifications).
      continue;
    }

    try {
      const { sourceVideo } = job;
      const { subject } = sourceVideo;
```

- [ ] **Step 10: Run the test again, confirm it passes**

Run: `pnpm --filter hype-check exec vitest run __tests__/process-pending-videos.test.ts`
Expected: PASS

- [ ] **Step 11: Typecheck and run the full hype-check test suite**

Run: `pnpm --filter hype-check typecheck && pnpm --filter hype-check exec vitest run`
Expected: PASS, no type errors

- [ ] **Step 12: Commit hype-check**

```bash
git add apps/hype-check/jobs/process-pending-videos.ts apps/hype-check/__tests__/process-pending-videos.test.ts
git commit -m "fix(hype-check): atomically claim processing jobs to prevent double-processing by concurrent runs"
```

---

## Task 6: TikTok scheduling parity and FAILED-post recovery

**Files:**
- Modify: `apps/menhealth/jobs/publish-scheduled-social.ts`
- Modify: `apps/menhealth/app/admin/(protected)/social/drafts/[id]/DraftActions.tsx`
- Modify: `apps/menhealth/app/api/social/drafts/[id]/approve/route.ts`
- Test: `apps/menhealth/__tests__/draft-actions.test.tsx`
- Test: `apps/menhealth/__tests__/social-approve-route.test.ts`
- Modify: `apps/hype-check/app/admin/(protected)/social/drafts/[id]/DraftActions.tsx`
- Modify: `apps/hype-check/app/api/social/drafts/[id]/approve/route.ts`
- Test: `apps/hype-check/__tests__/draft-actions.test.tsx`

> **Note:** hype-check has no TikTok adapter wired into its own `publish-scheduled-social.ts` (it has no video-generation pipeline yet, per AGENTS.md), so Part A below is menhealth-only. Part B (FAILED-post recovery) is platform-agnostic and applies to both apps.

### Part A — wire TikTok into the scheduled-publish cron (menhealth)

- [ ] **Step 1: Update `apps/menhealth/jobs/publish-scheduled-social.ts`**

Add the import:

```typescript
import { TikTokAdapter } from "@/lib/social/adapters/tiktok";
```

Replace the `ADAPTERS` map (currently lines 24–30):

```typescript
const ADAPTERS: Partial<Record<Platform, SocialPublisher>> = {
  X: new XAdapter({
    clientId: env.X_CLIENT_ID,
    clientSecret: env.X_CLIENT_SECRET,
    db,
  }),
  TIKTOK: new TikTokAdapter({
    clientId: env.TIKTOK_CLIENT_ID,
    clientSecret: env.TIKTOK_CLIENT_SECRET,
    db,
  }),
};
```

Update the file's top doc comment (currently lines 7–15) to remove the stale "TIKTOK — adapter not yet implemented; marked FAILED" line and replace it with:

```typescript
/**
 * Processes all SCHEDULED social posts whose scheduledAt time has passed.
 *
 * Platform behaviour:
 * - X, TIKTOK — auto-publish via their respective adapters. (In practice
 *   the admin UI only exposes scheduling for X — TikTok publishes
 *   immediately via the "Publish to TikTok" button — but a TikTok post
 *   that does reach SCHEDULED status, e.g. via direct API use, now
 *   publishes correctly instead of dead-ending with a misleading
 *   "not yet available" error.)
 * - YOUTUBE_COMMUNITY, REDDIT — manual-only (no public API / policy);
 *   reverts to APPROVED with an attempt record explaining the manual workflow.
 */
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter menhealth typecheck`
Expected: PASS — no test needed for this step in isolation; Task 3's adapter tests already cover `TikTokAdapter.publish()` behavior, and this change only adds a second `ADAPTERS` map entry pointing at the already-tested class.

- [ ] **Step 3: Commit Part A**

```bash
git add apps/menhealth/jobs/publish-scheduled-social.ts
git commit -m "fix(menhealth): wire TikTok into the scheduled-publish cron instead of dead-ending scheduled TikTok posts"
```

### Part B — FAILED-post recovery (both apps)

- [ ] **Step 4: Write the failing test — menhealth DraftActions**

```typescript
// apps/menhealth/__tests__/draft-actions.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import DraftActions from "@/app/admin/(protected)/social/drafts/[id]/DraftActions";

describe("DraftActions — FAILED status recovery", () => {
  it("shows an Approve button for a FAILED post so a failed publish attempt isn't a dead end", () => {
    render(
      <DraftActions
        postId="post_1"
        platform="TIKTOK"
        status="FAILED"
        riskLevel="LOW"
        requiresReview={false}
        caption="Test caption"
      />,
    );

    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run it, confirm it fails**

Run: `pnpm --filter menhealth exec vitest run __tests__/draft-actions.test.tsx`
Expected: FAIL — no Approve button renders for `status: "FAILED"`

- [ ] **Step 6: Fix `apps/menhealth/app/admin/(protected)/social/drafts/[id]/DraftActions.tsx`**

Change line 53:

```typescript
  const isApprovable = status === 'PENDING_REVIEW' || status === 'DRAFT' || status === 'FAILED';
```

- [ ] **Step 7: Run the test again, confirm it passes**

Run: `pnpm --filter menhealth exec vitest run __tests__/draft-actions.test.tsx`
Expected: PASS

- [ ] **Step 8: Write the failing test for the approve route allowing FAILED → APPROVED**

```typescript
// apps/menhealth/__tests__/social-approve-route.test.ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockFindUnique, mockUpdate } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db/prisma", () => ({
  db: { socialPost: { findUnique: mockFindUnique, update: mockUpdate } },
}));

function makeRequest(id: string) {
  return new NextRequest(`http://localhost/api/social/drafts/${id}/approve`, {
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { isAdmin: true, email: "admin@example.com" } });
});

describe("POST /api/social/drafts/[id]/approve — FAILED recovery", () => {
  it("allows re-approving a FAILED, non-high-risk post", async () => {
    const { POST } = await import("@/app/api/social/drafts/[id]/approve/route");

    mockFindUnique.mockResolvedValue({
      id: "post_1",
      status: "FAILED",
      requiresReview: false,
    });
    mockUpdate.mockResolvedValue({ id: "post_1", status: "APPROVED" });

    const response = await POST(makeRequest("post_1"), {
      params: Promise.resolve({ id: "post_1" }),
    });

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "post_1" },
      data: { status: "APPROVED" },
    });
  });
});
```

- [ ] **Step 9: Run it — this one already passes**

Run: `pnpm --filter menhealth exec vitest run __tests__/social-approve-route.test.ts`
Expected: PASS — `requiresReview: false` means the route's existing guard (`if (post.requiresReview && post.status !== "PENDING_REVIEW")`) never triggers, so FAILED → APPROVED already works for non-high-risk posts. This test documents and locks in that existing behavior; the route change in Step 10 only extends it to `requiresReview: true` posts.

- [ ] **Step 10: Extend the approve route's guard for high-risk posts**

In `apps/menhealth/app/api/social/drafts/[id]/approve/route.ts`, change line 28:

```typescript
  if (post.requiresReview && post.status !== "PENDING_REVIEW" && post.status !== "FAILED") {
```

- [ ] **Step 11: Add a test for the high-risk FAILED case and confirm it passes**

Add to `apps/menhealth/__tests__/social-approve-route.test.ts`:

```typescript
  it("allows re-approving a FAILED, high-risk post without re-requiring PENDING_REVIEW", async () => {
    const { POST } = await import("@/app/api/social/drafts/[id]/approve/route");

    mockFindUnique.mockResolvedValue({
      id: "post_2",
      status: "FAILED",
      requiresReview: true,
    });
    mockUpdate.mockResolvedValue({ id: "post_2", status: "APPROVED" });

    const response = await POST(makeRequest("post_2"), {
      params: Promise.resolve({ id: "post_2" }),
    });

    expect(response.status).toBe(200);
  });
```

Run: `pnpm --filter menhealth exec vitest run __tests__/social-approve-route.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 12: Typecheck and run the full menhealth test suite**

Run: `pnpm --filter menhealth typecheck && pnpm --filter menhealth exec vitest run`
Expected: PASS, no type errors

- [ ] **Step 13: Commit menhealth Part B**

```bash
git add "apps/menhealth/app/admin/(protected)/social/drafts/[id]/DraftActions.tsx" apps/menhealth/app/api/social/drafts/\[id\]/approve/route.ts apps/menhealth/__tests__/draft-actions.test.tsx apps/menhealth/__tests__/social-approve-route.test.ts
git commit -m "fix(menhealth): allow re-approving a FAILED social post instead of leaving it a dead end"
```

- [ ] **Step 14: Write the failing test — hype-check DraftActions**

```typescript
// apps/hype-check/__tests__/draft-actions.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import DraftActions from "@/app/admin/(protected)/social/drafts/[id]/DraftActions";

describe("DraftActions — FAILED status recovery", () => {
  it("shows an Approve button for a FAILED post so a failed publish attempt isn't a dead end", () => {
    render(
      <DraftActions
        postId="post_1"
        platform="X"
        status="FAILED"
        riskLevel="LOW"
        requiresReview={false}
        caption="Test caption"
      />,
    );

    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 15: Run it, confirm it fails**

Run: `pnpm --filter hype-check exec vitest run __tests__/draft-actions.test.tsx`
Expected: FAIL — no Approve button renders for `status: "FAILED"`

- [ ] **Step 16: Fix `apps/hype-check/app/admin/(protected)/social/drafts/[id]/DraftActions.tsx`**

Change line 47 (same fix as menhealth):

```typescript
  const isApprovable = status === 'PENDING_REVIEW' || status === 'DRAFT' || status === 'FAILED';
```

- [ ] **Step 17: Run the test again, confirm it passes**

Run: `pnpm --filter hype-check exec vitest run __tests__/draft-actions.test.tsx`
Expected: PASS

- [ ] **Step 18: Apply the identical approve-route fix (file is byte-identical to menhealth's)**

In `apps/hype-check/app/api/social/drafts/[id]/approve/route.ts`, change line 28 exactly as in Step 10:

```typescript
  if (post.requiresReview && post.status !== "PENDING_REVIEW" && post.status !== "FAILED") {
```

- [ ] **Step 19: Typecheck and run the full hype-check test suite**

Run: `pnpm --filter hype-check typecheck && pnpm --filter hype-check exec vitest run`
Expected: PASS, no type errors

- [ ] **Step 20: Commit hype-check Part B**

```bash
git add "apps/hype-check/app/admin/(protected)/social/drafts/[id]/DraftActions.tsx" apps/hype-check/app/api/social/drafts/\[id\]/approve/route.ts apps/hype-check/__tests__/draft-actions.test.tsx
git commit -m "fix(hype-check): allow re-approving a FAILED social post instead of leaving it a dead end"
```

---

## Task 7: Complete the admin-review audit trail (both apps)

**Files:**
- Modify: `apps/menhealth/prisma/schema.prisma`
- Modify: `apps/menhealth/app/api/admin/videos/[id]/review/route.ts`
- Modify: `apps/menhealth/app/api/admin/videos/bulk-review/route.ts`
- Test: `apps/menhealth/__tests__/admin-review-route.test.ts`
- Modify: `apps/hype-check/prisma/schema.prisma`
- Modify: `apps/hype-check/app/api/admin/videos/[id]/review/route.ts`
- Modify: `apps/hype-check/app/api/admin/videos/bulk-review/route.ts`
- Test: `apps/hype-check/__tests__/admin-review-route.test.ts`

**Interfaces:**
- `AdminReview` model gains `reviewerEmail String?`, set on every create — distinct from `acknowledgedBy`, which stays reserved for the specific HIGH-risk-acknowledgment case it was designed for.

> **This task requires a Prisma migration in both apps' live databases. Confirm with the user before running the `prisma migrate dev` commands in Steps 1 and 9 — do not run them non-interactively without that confirmation.**

- [ ] **Step 1: Add the column and create the menhealth migration**

In `apps/menhealth/prisma/schema.prisma`, find `model AdminReview` and add `reviewerEmail String?` after `acknowledgedBy`:

```prisma
model AdminReview {
  id                   String       @id @default(cuid())
  videoId              String
  action               ReviewAction
  note                 String?
  acknowledgedHighRisk Boolean      @default(false)
  acknowledgedBy       String?
  reviewerEmail        String?
  createdAt            DateTime     @default(now())

  video Video @relation(fields: [videoId], references: [id], onDelete: Cascade)
}
```

**Confirm with the user which database this will hit, then run:**
`pnpm --filter menhealth exec prisma migrate dev --name add_admin_review_reviewer_email`

- [ ] **Step 2: Write the failing test**

```typescript
// apps/menhealth/__tests__/admin-review-route.test.ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockVideoFindUnique, mockAdminReviewCreate, mockTransaction } =
  vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockVideoFindUnique: vi.fn(),
    mockAdminReviewCreate: vi.fn(),
    mockTransaction: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db/prisma", () => ({
  db: {
    video: { findUnique: mockVideoFindUnique, update: vi.fn() },
    adminReview: { create: mockAdminReviewCreate },
    claim: { updateMany: vi.fn() },
    $transaction: mockTransaction,
  },
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@menhealth/core-seo", () => ({ submitUrlsToIndexNow: vi.fn() }));
vi.mock("@/lib/creators/notify", () => ({ notifyCreatorIfApplicable: vi.fn() }));

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/admin/videos/video_1/review", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { isAdmin: true, email: "admin@example.com" } });
  mockTransaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));
});

describe("POST /api/admin/videos/[id]/review — reviewer audit trail", () => {
  it("records the acting admin's email on a REJECTED action, not just HIGH-risk publish acknowledgment", async () => {
    const { POST } = await import("@/app/api/admin/videos/[id]/review/route");

    mockVideoFindUnique.mockResolvedValue({
      id: "video_1",
      slug: "video-1",
      riskLevel: "LOW",
      _count: { summaries: 1 },
    });

    await POST(makeRequest({ action: "REJECTED" }), {
      params: Promise.resolve({ id: "video_1" }),
    });

    expect(mockAdminReviewCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        videoId: "video_1",
        action: "REJECTED",
        reviewerEmail: "admin@example.com",
      }),
    });
  });
});
```

- [ ] **Step 3: Run it, confirm it fails**

Run: `pnpm --filter menhealth exec vitest run __tests__/admin-review-route.test.ts`
Expected: FAIL — `reviewerEmail` is not in the `create()` call's `data` object yet

- [ ] **Step 4: Update `review/route.ts`**

In `apps/menhealth/app/api/admin/videos/[id]/review/route.ts`, change the `db.adminReview.create` call inside `ops` (currently lines 98–106):

```typescript
    db.adminReview.create({
      data: {
        videoId: id,
        action,
        note,
        acknowledgedHighRisk: isHighRiskAck,
        acknowledgedBy: isHighRiskAck ? session?.user?.email : null,
        reviewerEmail: session?.user?.email,
      },
    }),
```

- [ ] **Step 5: Run the test again, confirm it passes**

Run: `pnpm --filter menhealth exec vitest run __tests__/admin-review-route.test.ts`
Expected: PASS

- [ ] **Step 6: Update `bulk-review/route.ts`**

In `apps/menhealth/app/api/admin/videos/bulk-review/route.ts`, change the `db.adminReview.create` call inside the `.map()` (currently lines 84–94):

```typescript
    ...ids.map((videoId) =>
      db.adminReview.create({
        data: {
          videoId,
          action,
          note,
          acknowledgedHighRisk: highRiskIds.has(videoId),
          acknowledgedBy: highRiskIds.has(videoId) ? session?.user?.email : null,
          reviewerEmail: session?.user?.email,
        },
      }),
    ),
```

- [ ] **Step 7: Typecheck and run the full menhealth test suite**

Run: `pnpm --filter menhealth typecheck && pnpm --filter menhealth exec vitest run`
Expected: PASS, no type errors

- [ ] **Step 8: Commit menhealth**

```bash
git add apps/menhealth/prisma/schema.prisma apps/menhealth/prisma/migrations apps/menhealth/app/api/admin/videos/\[id\]/review/route.ts apps/menhealth/app/api/admin/videos/bulk-review/route.ts apps/menhealth/__tests__/admin-review-route.test.ts
git commit -m "fix(menhealth): record the acting admin's email on every review action, not just HIGH-risk publish acknowledgment"
```

- [ ] **Step 9: Add the column and create the hype-check migration**

In `apps/hype-check/prisma/schema.prisma`, find `model AdminReview` and add `reviewerEmail String?` after `acknowledgedBy` (same shape as menhealth, `subjectId` instead of `videoId`):

```prisma
model AdminReview {
  id                   String       @id @default(cuid())
  subjectId            String
  action               ReviewAction
  note                 String?
  acknowledgedHighRisk Boolean      @default(false)
  acknowledgedBy       String?
  reviewerEmail        String?
  createdAt            DateTime     @default(now())

  subject Subject @relation(fields: [subjectId], references: [id], onDelete: Cascade)
}
```

**Confirm with the user which database this will hit, then run:**
`pnpm --filter hype-check exec prisma migrate dev --name add_admin_review_reviewer_email`

- [ ] **Step 10: Write the failing test**

```typescript
// apps/hype-check/__tests__/admin-review-route.test.ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockSubjectFindUnique, mockAdminReviewCreate, mockTransaction } =
  vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockSubjectFindUnique: vi.fn(),
    mockAdminReviewCreate: vi.fn(),
    mockTransaction: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db/prisma", () => ({
  db: {
    subject: { findUnique: mockSubjectFindUnique, update: vi.fn() },
    adminReview: { create: mockAdminReviewCreate },
    claim: { updateMany: vi.fn() },
    $transaction: mockTransaction,
  },
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@menhealth/core-seo", () => ({ submitUrlsToIndexNow: vi.fn() }));
vi.mock("@/lib/creators/notify", () => ({ notifyCreatorIfApplicable: vi.fn() }));

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/admin/videos/subject_1/review", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { isAdmin: true, email: "admin@example.com" } });
  mockTransaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));
});

describe("POST /api/admin/videos/[id]/review — reviewer audit trail", () => {
  it("records the acting admin's email on a REJECTED action, not just HIGH-risk publish acknowledgment", async () => {
    const { POST } = await import("@/app/api/admin/videos/[id]/review/route");

    mockSubjectFindUnique.mockResolvedValue({
      id: "subject_1",
      slug: "subject-1",
      riskLevel: "LOW",
      sourceVideos: [{ summaries: [{ id: "summary_1" }] }],
    });

    await POST(makeRequest({ action: "REJECTED" }), {
      params: Promise.resolve({ id: "subject_1" }),
    });

    expect(mockAdminReviewCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subjectId: "subject_1",
        action: "REJECTED",
        reviewerEmail: "admin@example.com",
      }),
    });
  });
});
```

- [ ] **Step 11: Run it, confirm it fails**

Run: `pnpm --filter hype-check exec vitest run __tests__/admin-review-route.test.ts`
Expected: FAIL — `reviewerEmail` is not in the `create()` call's `data` object yet

- [ ] **Step 12: Update `review/route.ts`**

In `apps/hype-check/app/api/admin/videos/[id]/review/route.ts`, change the `db.adminReview.create` call inside `ops` (mirrors menhealth's Step 4, using `subjectId: id` instead of `videoId: id` — match the existing surrounding code's field name):

```typescript
    db.adminReview.create({
      data: {
        subjectId: id,
        action,
        note,
        acknowledgedHighRisk: isHighRiskAck,
        acknowledgedBy: isHighRiskAck ? session?.user?.email : null,
        reviewerEmail: session?.user?.email,
      },
    }),
```

- [ ] **Step 13: Run the test again, confirm it passes**

Run: `pnpm --filter hype-check exec vitest run __tests__/admin-review-route.test.ts`
Expected: PASS

- [ ] **Step 14: Update `bulk-review/route.ts`**

In `apps/hype-check/app/api/admin/videos/bulk-review/route.ts`, change the `db.adminReview.create` call inside the `.map()` (currently lines 83–95):

```typescript
    ...ids.map((subjectId) =>
      db.adminReview.create({
        data: {
          subjectId,
          action,
          note,
          acknowledgedHighRisk: highRiskIds.has(subjectId),
          acknowledgedBy: highRiskIds.has(subjectId) ? session?.user?.email : null,
          reviewerEmail: session?.user?.email,
        },
      }),
    ),
```

- [ ] **Step 15: Typecheck and run the full hype-check test suite**

Run: `pnpm --filter hype-check typecheck && pnpm --filter hype-check exec vitest run`
Expected: PASS, no type errors

- [ ] **Step 16: Commit hype-check**

```bash
git add apps/hype-check/prisma/schema.prisma apps/hype-check/prisma/migrations apps/hype-check/app/api/admin/videos/\[id\]/review/route.ts apps/hype-check/app/api/admin/videos/bulk-review/route.ts apps/hype-check/__tests__/admin-review-route.test.ts
git commit -m "fix(hype-check): record the acting admin's email on every review action, not just HIGH-risk publish acknowledgment"
```

---

## Task 8: Fix the AI fallback chain's empty-response blind spot

**Files:**
- Modify: `packages/core-ai/src/client.ts:168-186`
- Test: `apps/menhealth/__tests__/ai-client-fallback.test.ts`

**Interfaces:**
- No exported signature changes — `createAiClient(config).anthropic.messages.create(...)` keeps its existing shape.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/menhealth/__tests__/ai-client-fallback.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGroqCreate = vi.hoisted(() => vi.fn());

vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create: mockGroqCreate } };
  },
}));

import { createAiClient } from "@menhealth/core-ai";

describe("createAiClient Groq empty-response fallback", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    mockGroqCreate.mockReset();
  });

  it("falls through to OpenRouter when Groq returns a 200 with empty content", async () => {
    mockGroqCreate.mockResolvedValue({
      choices: [{ message: { content: "" }, finish_reason: "length" }],
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "openrouter answer" } }],
      }),
    });

    const client = createAiClient({ groqApiKey: "groq-key", openRouterApiKey: "or-key" });

    const result = await client.anthropic.messages.create({
      model: "unused",
      max_tokens: 100,
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.content[0].text).toBe("openrouter answer");
    expect(fetchMock).toHaveBeenCalled();
  });

  it("returns Groq's content directly when it's non-empty", async () => {
    mockGroqCreate.mockResolvedValue({
      choices: [{ message: { content: "a real answer" }, finish_reason: "stop" }],
    });

    const client = createAiClient({ groqApiKey: "groq-key" });

    const result = await client.anthropic.messages.create({
      model: "unused",
      max_tokens: 100,
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.content[0].text).toBe("a real answer");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it, confirm the first test fails**

Run: `pnpm --filter menhealth exec vitest run __tests__/ai-client-fallback.test.ts`
Expected: FAIL on the first test — Groq's empty string is currently returned as-is, `fetchMock` is never called

- [ ] **Step 3: Fix `packages/core-ai/src/client.ts`**

Replace the Groq branch (currently lines 168–186):

```typescript
          if (config.groqApiKey) {
            try {
              const completion = await groq.chat.completions.create({
                model: groqModel,
                max_tokens,
                reasoning_effort: 'low',
                messages: messages as Groq.Chat.ChatCompletionMessageParam[],
              });
              const text = completion.choices[0]?.message?.content ?? '';
              if (text.trim().length === 0) {
                // gpt-oss models can exhaust the whole max_tokens budget on
                // hidden reasoning and return finish_reason "length" with no
                // visible content — that's a 200 OK, so it must be treated
                // as a failure here or the fallback chain never reaches a
                // provider that can actually answer.
                throw new Error(
                  `Groq returned an empty response (finish_reason: ${completion.choices[0]?.finish_reason ?? 'unknown'})`,
                );
              }
              return { content: [{ type: 'text' as const, text }] };
            } catch (err) {
              console.warn(`[AI] Groq ${describeFailure(err)} — falling back to OpenRouter`);
            }
          }
```

- [ ] **Step 4: Run the tests again, confirm both pass**

Run: `pnpm --filter menhealth exec vitest run __tests__/ai-client-fallback.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Typecheck and run core-ai's and menhealth's full test suites**

Run: `pnpm --filter @menhealth/core-ai typecheck && pnpm --filter menhealth exec vitest run`
Expected: PASS, no type errors

- [ ] **Step 6: Commit**

```bash
git add packages/core-ai/src/client.ts apps/menhealth/__tests__/ai-client-fallback.test.ts
git commit -m "fix(core-ai): treat Groq's empty-content 200 response as a failure so the fallback chain actually falls through"
```

---

## Task 9: Close the vacuous-pass gap in the "auto-publish low-risk" sweep (both apps)

> **Added mid-execution.** Task 1's task reviewer surfaced a real gap the original audit didn't cover: `apps/menhealth/app/api/admin/videos/auto-publish-low-risk/route.ts` and its hype-check counterpart are a separate, admin-triggered sweep that re-run `isEligibleForAutoPublish` directly against DB-persisted claims for every `PROCESSED`/`REVIEW` video with a summary. Task 1/2 correctly park a video as PROCESSED/REVIEW (not PUBLISHED) when claim extraction failed, but `claimExtractionFailed` was never persisted anywhere — it only existed as an in-memory pipeline result. A video with zero persisted claims (whether because extraction genuinely found none, or because extraction failed) passes `claims.every(...)` vacuously in this sweep too, so clicking "Auto-publish low-risk" would immediately re-expose Finding 01 for exactly the videos Task 1/2 were built to protect. This task closes that by persisting the flag and excluding it from the sweep query.
>
> **Ruling recorded in the ledger:** this is real and load-bearing — it defeats Tasks 1 and 2 for any video reachable via this route — so it's added as a new task rather than parked as a deferred minor.

**Files:**
- Modify: `apps/menhealth/prisma/schema.prisma`
- Modify: `apps/menhealth/jobs/process-pending-videos.ts`
- Modify: `apps/menhealth/app/api/admin/videos/auto-publish-low-risk/route.ts`
- Test: `apps/menhealth/__tests__/process-pending-videos.test.ts` (extend — created by Task 5)
- Test: `apps/menhealth/__tests__/auto-publish-low-risk-route.test.ts`
- Modify: `apps/hype-check/prisma/schema.prisma`
- Modify: `apps/hype-check/jobs/process-pending-videos.ts`
- Modify: `apps/hype-check/app/api/admin/videos/auto-publish-low-risk/route.ts`
- Test: `apps/hype-check/__tests__/process-pending-videos.test.ts` (extend — created by Task 5)
- Test: `apps/hype-check/__tests__/auto-publish-low-risk-route.test.ts`

**Interfaces:**
- Consumes: `claimExtractionFailed` as computed by Task 1/2's `generateSummaryAndClaims` — already in scope in `process-pending-videos.ts` from Task 1/2's work.
- Produces: `Video.claimExtractionFailed` / `Subject.claimExtractionFailed` — a new persisted `Boolean @default(false)` column in each app's schema.

> **This task requires a Prisma migration in both apps' live databases, same as Task 7 — confirm with the user before running the `prisma migrate dev` commands in Steps 1 and 8.**

### menhealth

- [ ] **Step 1: Add the column and create the migration**

In `apps/menhealth/prisma/schema.prisma`, find `model Video` and add `claimExtractionFailed Boolean @default(false)` (placed logically near the other status/risk fields — match the model's existing formatting).

**Confirm with the user which database this will hit, then run:**
`pnpm --filter menhealth exec prisma migrate dev --name add_video_claim_extraction_failed`

- [ ] **Step 2: Write the failing test for persisting the flag**

Add to `apps/menhealth/__tests__/process-pending-videos.test.ts` (created by Task 5 — add this as a second test in the same `describe` block, alongside its existing mocks):

```typescript
  it("persists claimExtractionFailed on the video when the pipeline reports it", async () => {
    mockDb.processingJob.updateMany.mockResolvedValueOnce({ count: 1 });
    mockDb.processingJob.findMany.mockResolvedValue([
      {
        id: "job_1",
        video: { id: "video_1", channelId: "channel_1", riskLevel: "LOW" },
      },
    ]);
    mockDb.channel.findUnique.mockResolvedValue({ title: "Some Channel" });
    mockGenerateSummaryAndClaims.mockResolvedValue({
      ok: true,
      value: {
        summary: { shortSummary: "short" },
        claims: [],
        claimExtractionFailed: true,
      },
    });
    mockDb.video.findUnique.mockResolvedValue({ riskLevel: "LOW" });

    await processPendingVideos();

    expect(mockDb.video.update).toHaveBeenCalledWith({
      where: { id: "video_1" },
      data: expect.objectContaining({ claimExtractionFailed: true }),
    });
  });
```

Note: this test needs `generateEditorialTitle` and `isEligibleForAutoPublish` mocked too (already imported and mocked at the top of this file by Task 5) — give `mockGenerateEditorialTitle` (import it the same way as `mockGenerateSummaryAndClaims`) a resolved value of `{ ok: true, value: "Editorial Title" }` and `mockIsEligibleForAutoPublish` (same pattern) a resolved value of `false`, so the function runs to completion without throwing.

- [ ] **Step 3: Run it, confirm it fails**

Run: `pnpm --filter menhealth exec vitest run __tests__/process-pending-videos.test.ts`
Expected: FAIL — `claimExtractionFailed` is not yet in the `db.video.update` call's `data`

- [ ] **Step 4: Persist the flag in `process-pending-videos.ts`**

Change the `db.video.update` call (currently lines 119–122):

```typescript
      await db.video.update({
        where: { id: video.id },
        data: { status: finalStatus, evidenceScore, claimExtractionFailed },
      });
```

- [ ] **Step 5: Run the test again, confirm it passes**

Run: `pnpm --filter menhealth exec vitest run __tests__/process-pending-videos.test.ts`
Expected: PASS (2 tests: Task 5's original + this one)

- [ ] **Step 6: Write the failing test for the sweep route's exclusion**

```typescript
// apps/menhealth/__tests__/auto-publish-low-risk-route.test.ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockFindMany, mockCount, mockTransaction } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db/prisma", () => ({
  db: {
    video: { findMany: mockFindMany, count: mockCount, updateMany: vi.fn() },
    adminReview: { create: vi.fn() },
    $transaction: mockTransaction,
  },
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

function makeRequest() {
  return new NextRequest(
    "http://localhost/api/admin/videos/auto-publish-low-risk",
    { method: "POST" },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { isAdmin: true, email: "admin@example.com" } });
  mockCount.mockResolvedValue(0);
  mockTransaction.mockResolvedValue([]);
});

describe("POST /api/admin/videos/auto-publish-low-risk — claimExtractionFailed exclusion", () => {
  it("excludes videos whose claim extraction failed from the sweep query", async () => {
    const { POST } = await import(
      "@/app/api/admin/videos/auto-publish-low-risk/route"
    );

    mockFindMany.mockResolvedValue([]);

    await POST(makeRequest());

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        status: "PROCESSED",
        summaries: { some: {} },
        claimExtractionFailed: false,
      },
      select: {
        id: true,
        riskLevel: true,
        claims: {
          select: { evidenceStatus: true, autoReviewed: true, humanConfirmedAt: true },
        },
      },
    });
  });
});
```

- [ ] **Step 7: Run it, confirm it fails**

Run: `pnpm --filter menhealth exec vitest run __tests__/auto-publish-low-risk-route.test.ts`
Expected: FAIL — the route's `where` clause doesn't include `claimExtractionFailed: false` yet

- [ ] **Step 8: Exclude failed-extraction videos from the sweep**

In `apps/menhealth/app/api/admin/videos/auto-publish-low-risk/route.ts`, change the `db.video.findMany` call's `where` (currently line 19):

```typescript
      where: { status: "PROCESSED", summaries: { some: {} }, claimExtractionFailed: false },
```

- [ ] **Step 9: Run the test again, confirm it passes**

Run: `pnpm --filter menhealth exec vitest run __tests__/auto-publish-low-risk-route.test.ts`
Expected: PASS

- [ ] **Step 10: Typecheck and run the full menhealth test suite**

Run: `pnpm --filter menhealth typecheck && pnpm --filter menhealth exec vitest run`
Expected: PASS, no type errors

- [ ] **Step 11: Commit menhealth**

```bash
git add apps/menhealth/prisma/schema.prisma apps/menhealth/prisma/migrations apps/menhealth/jobs/process-pending-videos.ts apps/menhealth/app/api/admin/videos/auto-publish-low-risk/route.ts apps/menhealth/__tests__/process-pending-videos.test.ts apps/menhealth/__tests__/auto-publish-low-risk-route.test.ts
git commit -m "fix(menhealth): persist claimExtractionFailed and exclude it from the auto-publish-low-risk sweep"
```

### hype-check

- [ ] **Step 12: Add the column and create the migration**

In `apps/hype-check/prisma/schema.prisma`, find `model Subject` and add `claimExtractionFailed Boolean @default(false)`.

**Confirm with the user which database this will hit, then run:**
`pnpm --filter hype-check exec prisma migrate dev --name add_subject_claim_extraction_failed`

- [ ] **Step 13: Write the failing test for persisting the flag**

Add to `apps/hype-check/__tests__/process-pending-videos.test.ts` (created by Task 5), mirroring menhealth's Step 2 exactly but with hype-check's shapes:

```typescript
  it("persists claimExtractionFailed on the subject when the pipeline reports it", async () => {
    mockDb.processingJob.updateMany.mockResolvedValueOnce({ count: 1 });
    mockDb.processingJob.findMany.mockResolvedValue([
      {
        id: "job_1",
        sourceVideo: {
          id: "source-video-1",
          channelId: "channel_1",
          subject: { id: "subject-1", riskLevel: "LOW" },
        },
      },
    ]);
    mockDb.channel.findUnique.mockResolvedValue({ title: "Some Channel" });
    mockGenerateSummaryAndClaims.mockResolvedValue({
      ok: true,
      value: {
        summary: { shortSummary: "short" },
        claims: [],
        claimExtractionFailed: true,
        warningSigns: [],
        costItems: [],
        disclosures: [],
      },
    });
    mockDb.subject.findUnique.mockResolvedValue({ riskLevel: "LOW" });

    await processPendingVideos();

    expect(mockDb.subject.update).toHaveBeenCalledWith({
      where: { id: "subject-1" },
      data: expect.objectContaining({ claimExtractionFailed: true }),
    });
  });
```

Mock `generateEditorialTitle` and `isEligibleForAutoPublish` the same way noted in menhealth's Step 2, adjusted to hype-check's already-mocked imports from Task 5.

- [ ] **Step 14: Run it, confirm it fails**

Run: `pnpm --filter hype-check exec vitest run __tests__/process-pending-videos.test.ts`
Expected: FAIL

- [ ] **Step 15: Persist the flag in `apps/hype-check/jobs/process-pending-videos.ts`**

Change the `db.subject.update` call that sets `{ status: finalStatus, evidenceScore }`:

```typescript
      await db.subject.update({
        where: { id: subject.id },
        data: { status: finalStatus, evidenceScore, claimExtractionFailed },
      });
```

- [ ] **Step 16: Run the test again, confirm it passes**

Run: `pnpm --filter hype-check exec vitest run __tests__/process-pending-videos.test.ts`
Expected: PASS

- [ ] **Step 17: Write the failing test for the sweep route's exclusion**

```typescript
// apps/hype-check/__tests__/auto-publish-low-risk-route.test.ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockFindMany, mockCount, mockTransaction } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db/prisma", () => ({
  db: {
    subject: { findMany: mockFindMany, count: mockCount, updateMany: vi.fn() },
    adminReview: { create: vi.fn() },
    $transaction: mockTransaction,
  },
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

function makeRequest() {
  return new NextRequest(
    "http://localhost/api/admin/videos/auto-publish-low-risk",
    { method: "POST" },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { isAdmin: true, email: "admin@example.com" } });
  mockCount.mockResolvedValue(0);
  mockTransaction.mockResolvedValue([]);
});

describe("POST /api/admin/videos/auto-publish-low-risk — claimExtractionFailed exclusion", () => {
  it("excludes subjects whose claim extraction failed from the sweep query", async () => {
    const { POST } = await import(
      "@/app/api/admin/videos/auto-publish-low-risk/route"
    );

    mockFindMany.mockResolvedValue([]);

    await POST(makeRequest());

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        status: "REVIEW",
        sourceVideos: { some: { summaries: { some: {} } } },
        claimExtractionFailed: false,
      },
      select: {
        id: true,
        riskLevel: true,
        claims: {
          select: { evidenceStatus: true, autoReviewed: true, humanConfirmedAt: true },
        },
      },
    });
  });
});
```

- [ ] **Step 18: Run it, confirm it fails**

Run: `pnpm --filter hype-check exec vitest run __tests__/auto-publish-low-risk-route.test.ts`
Expected: FAIL

- [ ] **Step 19: Exclude failed-extraction subjects from the sweep**

In `apps/hype-check/app/api/admin/videos/auto-publish-low-risk/route.ts`, change the `db.subject.findMany` call's `where` (currently line 19):

```typescript
      where: {
        status: "REVIEW",
        sourceVideos: { some: { summaries: { some: {} } } },
        claimExtractionFailed: false,
      },
```

- [ ] **Step 20: Run the test again, confirm it passes**

Run: `pnpm --filter hype-check exec vitest run __tests__/auto-publish-low-risk-route.test.ts`
Expected: PASS

- [ ] **Step 21: Typecheck and run the full hype-check test suite**

Run: `pnpm --filter hype-check typecheck && pnpm --filter hype-check exec vitest run`
Expected: PASS, no type errors

- [ ] **Step 22: Commit hype-check**

```bash
git add apps/hype-check/prisma/schema.prisma apps/hype-check/prisma/migrations apps/hype-check/jobs/process-pending-videos.ts apps/hype-check/app/api/admin/videos/auto-publish-low-risk/route.ts apps/hype-check/__tests__/process-pending-videos.test.ts apps/hype-check/__tests__/auto-publish-low-risk-route.test.ts
git commit -m "fix(hype-check): persist claimExtractionFailed and exclude it from the auto-publish-low-risk sweep"
```

---

## Final Verification

- [ ] **Run the full monorepo test suite and typecheck**

Run: `pnpm typecheck && pnpm test`
Expected: PASS across both apps and all packages

- [ ] **Run lint**

Run: `pnpm lint`
Expected: PASS
