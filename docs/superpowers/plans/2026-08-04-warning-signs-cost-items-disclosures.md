# Populate & surface WarningSign, CostItem, Disclosure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `WarningSign`, `CostItem`, and `Disclosure` a writer (AI extraction wired into the existing video pipeline) and a reader (admin review/edit UI, public video page sections), closing the gap flagged in `docs/superpowers/specs/2026-08-04-hype-check-video-page-redesign-design.md`.

**Architecture:** A new site-local AI extraction function runs alongside the existing claim extraction inside `generateSummaryAndClaims` (`apps/hype-check/lib/videos/process-video-pipeline.ts`), persisting all three record types and folding warning-sign severity into the existing risk-escalation/auto-publish gate. Admin CRUD routes + inline-editable admin UI let a human review/correct the AI output (and backfill already-published videos on demand). The public video page renders all three once populated.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, Zod, Vitest, the shared `aiClient` from `apps/hype-check/lib/ai/client.ts` (Anthropic → Groq → OpenRouter → OpenAI → Gemini fallback chain via `packages/core-ai`).

All file paths below are relative to `apps/hype-check/` unless stated otherwise.

## Global Constraints

- HIGH-risk content never auto-publishes without admin approval (`AGENTS.md` non-negotiable) — enforced here by escalating `subject.riskLevel` on a HIGH-severity warning sign exactly like a HIGH-risk claim already does, so the existing `isEligibleForAutoPublish` gate (`packages/core-compliance/src/auto-publish-gate.ts`) keeps such subjects in `REVIEW`.
- AI/domain functions return `Result<T, E>` rather than throwing (`AGENTS.md`) — the new extraction function follows the same `{ ok: true, value } | { ok: false, error }` shape used by `summarizeVideo`/`extractClaims`.
- Admin routes are session-gated via `lib/auth`, not a root `middleware.ts` (`AGENTS.md`) — every new admin API route repeats the `auth()` + `isAdmin` check used by existing admin routes.
- No raw `process.env` access — this work needs no new env vars; the existing `aiClient` (already Zod-validated via `env.ts`) is reused as-is.
- No new magic strings — the `"ai-extraction"` source constant, severity/risk enums, etc. are typed/enumerated, not scattered string literals.

---

### Task 1: AI extraction function for warning signs, cost items, disclosures

**Files:**
- Create: `lib/ai/extract-warnings-costs-disclosures.ts`
- Test: `__tests__/extract-warnings-costs-disclosures.test.ts`

**Interfaces:**
- Produces: `extractWarningsCostsDisclosures(input: WarningsCostsDisclosuresInput): Promise<Result<WarningsCostsDisclosuresOutput>>`, `validateExtractionResponse(raw: unknown): Result<WarningsCostsDisclosuresOutput>`, and the types `WarningSignOutput`, `CostItemOutput`, `DisclosureOutput`, `WarningsCostsDisclosuresOutput`, `WarningsCostsDisclosuresInput` — all consumed by Task 2.

- [ ] **Step 1: Write the failing test**

Create `__tests__/extract-warnings-costs-disclosures.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateExtractionResponse } from "@/lib/ai/extract-warnings-costs-disclosures";

describe("validateExtractionResponse", () => {
  it("accepts a well-formed response with all three arrays populated", () => {
    const result = validateExtractionResponse({
      warningSigns: [
        { text: "Pressures viewers to buy before a countdown ends", severity: "HIGH" },
      ],
      costItems: [
        {
          label: "Monthly subscription",
          amount: "$49/mo",
          isHidden: true,
          notes: "Only mentioned in fine print",
        },
      ],
      disclosures: [
        { text: "Sponsored by the product's own manufacturer", detected: true },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.warningSigns).toHaveLength(1);
      expect(result.value.costItems[0]?.isHidden).toBe(true);
    }
  });

  it("accepts empty arrays for all three categories", () => {
    const result = validateExtractionResponse({
      warningSigns: [],
      costItems: [],
      disclosures: [],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a response with an invalid severity value", () => {
    const result = validateExtractionResponse({
      warningSigns: [{ text: "Something", severity: "EXTREME" }],
      costItems: [],
      disclosures: [],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a response missing a required field", () => {
    const result = validateExtractionResponse({
      warningSigns: [],
      costItems: [{ label: "Course fee", isHidden: false }],
      disclosures: [],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a non-object response", () => {
    const result = validateExtractionResponse("not an object");
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter hype-check test -- extract-warnings-costs-disclosures`
Expected: FAIL — `lib/ai/extract-warnings-costs-disclosures.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

Create `lib/ai/extract-warnings-costs-disclosures.ts`:

```ts
import { z } from "zod";
import { aiClient } from "./client";
import { SITE_NAME } from "@/lib/site-brand";
import type { Result } from "@menhealth/core-ai";

const WarningSignSchema = z.object({
  text: z.string().min(1).max(500),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

const CostItemSchema = z.object({
  label: z.string().min(1).max(200),
  amount: z.string().min(1).max(100),
  isHidden: z.boolean(),
  notes: z.string().max(1000).optional(),
});

const DisclosureSchema = z.object({
  text: z.string().min(1).max(500),
  detected: z.boolean(),
});

const WarningsCostsDisclosuresSchema = z.object({
  warningSigns: z.array(WarningSignSchema).max(10),
  costItems: z.array(CostItemSchema).max(10),
  disclosures: z.array(DisclosureSchema).max(5),
});

export type WarningSignOutput = z.infer<typeof WarningSignSchema>;
export type CostItemOutput = z.infer<typeof CostItemSchema>;
export type DisclosureOutput = z.infer<typeof DisclosureSchema>;
export type WarningsCostsDisclosuresOutput = z.infer<
  typeof WarningsCostsDisclosuresSchema
>;

export type WarningsCostsDisclosuresInput = {
  title: string;
  description: string;
  shortSummary: string;
};

// Pulled out from extractWarningsCostsDisclosures so the parsing/validation
// step can be unit tested without a live AI call.
export function validateExtractionResponse(
  raw: unknown,
): Result<WarningsCostsDisclosuresOutput> {
  const validated = WarningsCostsDisclosuresSchema.safeParse(raw);
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

export async function extractWarningsCostsDisclosures(
  input: WarningsCostsDisclosuresInput,
): Promise<Result<WarningsCostsDisclosuresOutput>> {
  const prompt = `You are a consumer-protection analyst for ${SITE_NAME}, a platform that reviews trending products, courses, side hustles, and investment apps for hype vs. reality.

Analyze the following video content and extract three things a viewer should know before spending money or time on this:

1. Warning signs — concerning patterns (e.g. pressure tactics, unverifiable claims, evasive answers about risk).
2. Cost items — any prices, fees, or subscription costs mentioned, flagging any that are hidden, easy to miss, or not stated up front.
3. Disclosures — sponsorships, affiliate relationships, or paid promotion the video discloses (or fails to disclose despite promoting a product).

Video content:
Title: ${input.title}
Description: ${input.description.slice(0, 1000)}
Summary: ${input.shortSummary}

Respond with a JSON object:
{
  "warningSigns": [{ "text": "string", "severity": "LOW|MEDIUM|HIGH" }],
  "costItems": [{ "label": "string", "amount": "string", "isHidden": boolean, "notes": "string (optional)" }],
  "disclosures": [{ "text": "string", "detected": boolean }]
}

Each array may be empty (0-10 items for warningSigns/costItems, 0-5 for disclosures) if there's nothing notable for that category.
Respond ONLY with the JSON object. No markdown, no explanation.`;

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

    return validateExtractionResponse(parsed);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter hype-check test -- extract-warnings-costs-disclosures`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add lib/ai/extract-warnings-costs-disclosures.ts __tests__/extract-warnings-costs-disclosures.test.ts
git commit -m "feat: add AI extraction for warning signs, cost items, disclosures"
```

---

### Task 2: Wire extraction into the video-processing pipeline with risk escalation

**Files:**
- Modify: `lib/videos/process-video-pipeline.ts`
- Test: `__tests__/warning-signs-risk-escalation.test.ts`

**Interfaces:**
- Consumes: `extractWarningsCostsDisclosures`, `WarningSignOutput`, `CostItemOutput`, `DisclosureOutput` from Task 1 (`@/lib/ai/extract-warnings-costs-disclosures`).
- Produces: exported `highestRiskLevel(levels: RiskLevel[]): RiskLevel` from `lib/videos/process-video-pipeline.ts`; `GenerateSummaryAndClaimsResult` gains `warningSigns: WarningSignOutput[]`, `costItems: CostItemOutput[]`, `disclosures: DisclosureOutput[]` alongside the existing `summary`/`claims` fields. Both existing callers (`jobs/process-pending-videos.ts` and `app/api/admin/videos/[id]/summarize/route.ts`) destructure only the fields they need, so this is additive and doesn't break them.

- [ ] **Step 1: Write the failing test**

Create `__tests__/warning-signs-risk-escalation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { highestRiskLevel } from "@/lib/videos/process-video-pipeline";

describe("highestRiskLevel", () => {
  it("returns HIGH when any level in the list is HIGH", () => {
    expect(highestRiskLevel(["LOW", "MEDIUM", "HIGH"])).toBe("HIGH");
  });

  it("returns MEDIUM when the highest level present is MEDIUM", () => {
    expect(highestRiskLevel(["LOW", "MEDIUM"])).toBe("MEDIUM");
  });

  it("returns LOW when every level is LOW", () => {
    expect(highestRiskLevel(["LOW", "LOW"])).toBe("LOW");
  });

  it("defaults to LOW for an empty list", () => {
    expect(highestRiskLevel([])).toBe("LOW");
  });

  it("never lets a later lower value override an earlier higher one", () => {
    expect(highestRiskLevel(["HIGH", "LOW"])).toBe("HIGH");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter hype-check test -- warning-signs-risk-escalation`
Expected: FAIL — `highestRiskLevel` is not exported from `process-video-pipeline.ts` yet.

- [ ] **Step 3: Write the implementation**

In `lib/videos/process-video-pipeline.ts`, add to the import block at the top (alongside the existing `summarizeVideo`/`extractClaims` imports):

```ts
import { extractWarningsCostsDisclosures } from "@/lib/ai/extract-warnings-costs-disclosures";
import type {
  WarningSignOutput,
  CostItemOutput,
  DisclosureOutput,
} from "@/lib/ai/extract-warnings-costs-disclosures";
```

Replace the existing `GenerateSummaryAndClaimsResult` type:

```ts
export type GenerateSummaryAndClaimsResult = {
  summary: Summary;
  claims: Claim[];
};
```

with:

```ts
export type GenerateSummaryAndClaimsResult = {
  summary: Summary;
  claims: Claim[];
  warningSigns: WarningSignOutput[];
  costItems: CostItemOutput[];
  disclosures: DisclosureOutput[];
};
```

Immediately after the existing `const RISK_RANK: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };` line, add:

```ts
export function highestRiskLevel(levels: RiskLevel[]): RiskLevel {
  return levels.reduce<RiskLevel>(
    (max, level) => (RISK_RANK[level] > RISK_RANK[max] ? level : max),
    "LOW",
  );
}
```

Inside `generateSummaryAndClaims`, the function currently ends with this block (after the `for (const extracted of claimsResult.value) { ... }` loop):

```ts
  if (RISK_RANK[highestClaimRisk] > RISK_RANK[video.riskLevel]) {
    await db.subject.update({
      where: { id: video.subjectId },
      data: { riskLevel: highestClaimRisk },
    });
  }

  return { ok: true, value: { summary, claims } };
}
```

Replace that whole block with:

```ts
  // Warning signs, cost items, and disclosures — same AI-extraction +
  // human-review pattern as claims above. A HIGH-severity warning sign
  // escalates the subject's risk level exactly like a HIGH claim does,
  // which keeps it behind the same admin-approval gate
  // (isEligibleForAutoPublish) rather than needing separate gating logic.
  let warningSigns: WarningSignOutput[] = [];
  let costItems: CostItemOutput[] = [];
  let disclosures: DisclosureOutput[] = [];

  const extractionResult = await extractWarningsCostsDisclosures({
    title: video.title,
    description: video.description ?? "",
    shortSummary: summary.shortSummary,
  });

  if (extractionResult.ok) {
    ({ warningSigns, costItems, disclosures } = extractionResult.value);

    if (warningSigns.length > 0) {
      await db.warningSign.createMany({
        data: warningSigns.map((w) => ({
          subjectId: video.subjectId,
          text: w.text,
          severity: w.severity,
          source: "ai-extraction",
        })),
      });
    }
    if (costItems.length > 0) {
      await db.costItem.createMany({
        data: costItems.map((c) => ({
          subjectId: video.subjectId,
          label: c.label,
          amount: c.amount,
          isHidden: c.isHidden,
          notes: c.notes ?? null,
        })),
      });
    }
    if (disclosures.length > 0) {
      await db.disclosure.createMany({
        data: disclosures.map((d) => ({
          subjectId: video.subjectId,
          text: d.text,
          detected: d.detected,
          source: "ai-extraction",
        })),
      });
    }
  } else {
    console.warn(
      `Warning/cost/disclosure extraction failed for video ${video.sourceVideoId}: ${extractionResult.error.message}`,
    );
  }

  const highestWarningSeverity = highestRiskLevel(
    warningSigns.map((w) => w.severity),
  );
  const highestOverallRisk = highestRiskLevel([
    highestClaimRisk,
    highestWarningSeverity,
  ]);

  if (RISK_RANK[highestOverallRisk] > RISK_RANK[video.riskLevel]) {
    await db.subject.update({
      where: { id: video.subjectId },
      data: { riskLevel: highestOverallRisk },
    });
  }

  return {
    ok: true,
    value: { summary, claims, warningSigns, costItems, disclosures },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter hype-check test -- warning-signs-risk-escalation`
Expected: PASS (5/5).

Also run the full suite to confirm nothing else broke: `pnpm --filter hype-check test`
Expected: all existing tests still pass (this task only adds to `process-video-pipeline.ts`, it doesn't change existing claim behavior).

- [ ] **Step 5: Commit**

```bash
git add lib/videos/process-video-pipeline.ts __tests__/warning-signs-risk-escalation.test.ts
git commit -m "feat: persist warning signs, cost items, disclosures in the video pipeline"
```

---

### Task 3: Admin CRUD API routes

**Files:**
- Create: `app/api/admin/warning-signs/route.ts`
- Create: `app/api/admin/warning-signs/[id]/route.ts`
- Create: `app/api/admin/cost-items/route.ts`
- Create: `app/api/admin/cost-items/[id]/route.ts`
- Create: `app/api/admin/disclosures/route.ts`
- Create: `app/api/admin/disclosures/[id]/route.ts`

**Interfaces:**
- Produces: `POST /api/admin/warning-signs` (body `{ subjectId, text, severity, source? }` → `{ ok, warningSign }`), `PATCH /api/admin/warning-signs/:id` (body `{ text, severity, source? }`), `DELETE /api/admin/warning-signs/:id`; the analogous three verbs for `cost-items` (fields `label, amount, isHidden, notes?`) and `disclosures` (fields `text, detected, source?`). Consumed by Task 5's editor components.

No dedicated tests for these routes: the existing `/api/admin/claims/[id]/route.ts` this pattern mirrors has no test coverage either, and this codebase has no `next/server`/`auth()` mocking infrastructure in `__tests__/__mocks__` to build on — route behavior here is verified manually in Task 5's manual check instead, consistent with how the claims routes are verified today.

- [ ] **Step 1: Create the warning-signs routes**

Create `app/api/admin/warning-signs/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";
import type { NextRequest } from "next/server";

const WarningSignCreateSchema = z.object({
  subjectId: z.string().min(1),
  text: z.string().min(1).max(500),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  source: z.string().max(200).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = WarningSignCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { subjectId, text, severity, source } = parsed.data;

  const subject = await db.subject.findUnique({ where: { id: subjectId } });
  if (!subject) {
    return Response.json({ error: "Subject not found" }, { status: 404 });
  }

  const warningSign = await db.warningSign.create({
    data: { subjectId, text, severity, source: source ?? null },
  });

  return Response.json({ ok: true, warningSign });
}
```

Create `app/api/admin/warning-signs/[id]/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";
import type { NextRequest } from "next/server";

const WarningSignUpdateSchema = z.object({
  text: z.string().min(1).max(500),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  source: z.string().max(200).nullable().optional(),
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
  const parsed = WarningSignUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const existing = await db.warningSign.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Warning sign not found" }, { status: 404 });
  }

  const { text, severity, source } = parsed.data;
  const warningSign = await db.warningSign.update({
    where: { id },
    data: { text, severity, source: source ?? null },
  });

  return Response.json({ ok: true, warningSign });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await db.warningSign.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Warning sign not found" }, { status: 404 });
  }

  await db.warningSign.delete({ where: { id } });

  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Create the cost-items routes**

Create `app/api/admin/cost-items/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";
import type { NextRequest } from "next/server";

const CostItemCreateSchema = z.object({
  subjectId: z.string().min(1),
  label: z.string().min(1).max(200),
  amount: z.string().min(1).max(100),
  isHidden: z.boolean(),
  notes: z.string().max(1000).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = CostItemCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { subjectId, label, amount, isHidden, notes } = parsed.data;

  const subject = await db.subject.findUnique({ where: { id: subjectId } });
  if (!subject) {
    return Response.json({ error: "Subject not found" }, { status: 404 });
  }

  const costItem = await db.costItem.create({
    data: { subjectId, label, amount, isHidden, notes: notes ?? null },
  });

  return Response.json({ ok: true, costItem });
}
```

Create `app/api/admin/cost-items/[id]/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";
import type { NextRequest } from "next/server";

const CostItemUpdateSchema = z.object({
  label: z.string().min(1).max(200),
  amount: z.string().min(1).max(100),
  isHidden: z.boolean(),
  notes: z.string().max(1000).nullable().optional(),
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
  const parsed = CostItemUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const existing = await db.costItem.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Cost item not found" }, { status: 404 });
  }

  const { label, amount, isHidden, notes } = parsed.data;
  const costItem = await db.costItem.update({
    where: { id },
    data: { label, amount, isHidden, notes: notes ?? null },
  });

  return Response.json({ ok: true, costItem });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await db.costItem.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Cost item not found" }, { status: 404 });
  }

  await db.costItem.delete({ where: { id } });

  return Response.json({ ok: true });
}
```

- [ ] **Step 3: Create the disclosures routes**

Create `app/api/admin/disclosures/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";
import type { NextRequest } from "next/server";

const DisclosureCreateSchema = z.object({
  subjectId: z.string().min(1),
  text: z.string().min(1).max(500),
  detected: z.boolean(),
  source: z.string().max(200).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = DisclosureCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { subjectId, text, detected, source } = parsed.data;

  const subject = await db.subject.findUnique({ where: { id: subjectId } });
  if (!subject) {
    return Response.json({ error: "Subject not found" }, { status: 404 });
  }

  const disclosure = await db.disclosure.create({
    data: { subjectId, text, detected, source: source ?? null },
  });

  return Response.json({ ok: true, disclosure });
}
```

Create `app/api/admin/disclosures/[id]/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";
import type { NextRequest } from "next/server";

const DisclosureUpdateSchema = z.object({
  text: z.string().min(1).max(500),
  detected: z.boolean(),
  source: z.string().max(200).nullable().optional(),
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
  const parsed = DisclosureUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const existing = await db.disclosure.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Disclosure not found" }, { status: 404 });
  }

  const { text, detected, source } = parsed.data;
  const disclosure = await db.disclosure.update({
    where: { id },
    data: { text, detected, source: source ?? null },
  });

  return Response.json({ ok: true, disclosure });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await db.disclosure.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Disclosure not found" }, { status: 404 });
  }

  await db.disclosure.delete({ where: { id } });

  return Response.json({ ok: true });
}
```

- [ ] **Step 4: Type-check**

Run: `pnpm --filter hype-check exec tsc --noEmit`
Expected: no new type errors from these 6 files.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/warning-signs app/api/admin/cost-items app/api/admin/disclosures
git commit -m "feat: add admin CRUD routes for warning signs, cost items, disclosures"
```

---

### Task 4: Admin video page — generate button and summary view

**Files:**
- Create: `app/admin/(protected)/videos/[id]/GenerateWarningsButton.tsx`
- Create: `app/api/admin/videos/[id]/extract-warnings/route.ts`
- Modify: `app/admin/(protected)/videos/[id]/page.tsx`

**Interfaces:**
- Consumes: `extractWarningsCostsDisclosures` from Task 1.
- Produces: `POST /api/admin/videos/:id/extract-warnings` (backfill trigger for already-published videos); `<GenerateWarningsButton videoId={string} />` client component. Task 5 replaces the summary-count rendering this task adds with full editor components, reusing the button and route unchanged.

- [ ] **Step 1: Create the backfill route**

Create `app/api/admin/videos/[id]/extract-warnings/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { extractWarningsCostsDisclosures } from "@/lib/ai/extract-warnings-costs-disclosures";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const subject = await db.subject.findUnique({
    where: { id },
    include: {
      sourceVideos: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { summaries: { take: 1, orderBy: { createdAt: "desc" } } },
      },
    },
  });

  if (!subject) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const sourceVideo = subject.sourceVideos[0];
  const summary = sourceVideo?.summaries[0];
  if (!sourceVideo || !summary) {
    return NextResponse.json(
      { error: "Generate a summary for this video first" },
      { status: 400 },
    );
  }

  const result = await extractWarningsCostsDisclosures({
    title: sourceVideo.title,
    description: sourceVideo.description ?? "",
    shortSummary: summary.shortSummary,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  const { warningSigns, costItems, disclosures } = result.value;

  if (warningSigns.length > 0) {
    await db.warningSign.createMany({
      data: warningSigns.map((w) => ({
        subjectId: subject.id,
        text: w.text,
        severity: w.severity,
        source: "ai-extraction",
      })),
    });
  }
  if (costItems.length > 0) {
    await db.costItem.createMany({
      data: costItems.map((c) => ({
        subjectId: subject.id,
        label: c.label,
        amount: c.amount,
        isHidden: c.isHidden,
        notes: c.notes ?? null,
      })),
    });
  }
  if (disclosures.length > 0) {
    await db.disclosure.createMany({
      data: disclosures.map((d) => ({
        subjectId: subject.id,
        text: d.text,
        detected: d.detected,
        source: "ai-extraction",
      })),
    });
  }

  revalidateTag("videos", "max");
  revalidateTag(`video:${subject.slug}`, "max");

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Create the button component**

Create `app/admin/(protected)/videos/[id]/GenerateWarningsButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateWarningsButton({
  videoId,
}: {
  videoId: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function generate() {
    setState("loading");
    setErrorMsg("");
    const res = await fetch(`/api/admin/videos/${videoId}/extract-warnings`, {
      method: "POST",
    });
    if (res.ok) {
      setState("done");
      router.refresh();
    } else {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setErrorMsg(data?.error ?? "Failed to generate");
      setState("error");
    }
  }

  if (state === "done") return null;

  return (
    <div className="space-y-1">
      <button
        onClick={generate}
        disabled={state === "loading"}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {state === "loading"
          ? "Generating…"
          : "Generate warning signs, costs & disclosures"}
      </button>
      {state === "error" && <p className="text-xs text-red-600">{errorMsg}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Wire into the admin video page**

In `app/admin/(protected)/videos/[id]/page.tsx`, add the import alongside the other component imports:

```ts
import GenerateWarningsButton from './GenerateWarningsButton';
```

Add `warningSigns: true, costItems: true, disclosures: true,` to the `db.subject.findUnique` `include` block (alongside the existing `claims: { orderBy: { riskLevel: 'desc' } },` line).

Add a new section right after the closing `)}` of the existing "Claims" section (which ends with `</section>\n          )}` before the `</div>` that closes `{/* Main content — left 2 cols */}`):

```tsx
          {/* Warning signs, costs & disclosures */}
          <section className="rounded-lg border bg-white p-5">
            <h2 className="mb-4 font-semibold text-gray-900">
              Warning signs, costs &amp; disclosures
            </h2>
            {subject.warningSigns.length === 0 &&
            subject.costItems.length === 0 &&
            subject.disclosures.length === 0 ? (
              <div>
                <p className="mb-3 text-sm text-gray-500">
                  Nothing generated yet for this video.
                </p>
                <GenerateWarningsButton videoId={subject.id} />
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                {subject.warningSigns.length} warning sign
                {subject.warningSigns.length === 1 ? '' : 's'},{' '}
                {subject.costItems.length} cost item
                {subject.costItems.length === 1 ? '' : 's'},{' '}
                {subject.disclosures.length} disclosure
                {subject.disclosures.length === 1 ? '' : 's'} generated.
              </p>
            )}
          </section>
```

- [ ] **Step 4: Type-check**

Run: `pnpm --filter hype-check exec tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 5: Manual check**

Run: `pnpm --filter hype-check dev`. Open an admin video detail page for a published video with no warning signs yet (`/admin/videos/<id>`). Confirm the "Nothing generated yet" message and button appear. Click the button, confirm it shows "Generating…", then the page refreshes and the count sentence appears instead.

- [ ] **Step 6: Commit**

```bash
git add app/admin/\(protected\)/videos/\[id\]/GenerateWarningsButton.tsx app/api/admin/videos/\[id\]/extract-warnings app/admin/\(protected\)/videos/\[id\]/page.tsx
git commit -m "feat: admin backfill button for warning signs, costs, disclosures"
```

---

### Task 5: Admin inline editors (add/edit/delete)

**Files:**
- Create: `app/admin/(protected)/videos/[id]/WarningSignsEditor.tsx`
- Create: `app/admin/(protected)/videos/[id]/CostItemsEditor.tsx`
- Create: `app/admin/(protected)/videos/[id]/DisclosuresEditor.tsx`
- Modify: `app/admin/(protected)/videos/[id]/page.tsx`

**Interfaces:**
- Consumes: the 6 CRUD routes from Task 3; `subject.warningSigns`, `subject.costItems`, `subject.disclosures` from the query Task 4 already added to `page.tsx`.

- [ ] **Step 1: Create the warning signs editor**

Create `app/admin/(protected)/videos/[id]/WarningSignsEditor.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Severity = 'LOW' | 'MEDIUM' | 'HIGH';

type WarningSign = {
  id: string;
  text: string;
  severity: Severity;
  source: string | null;
};

const SEVERITY_OPTIONS: Severity[] = ['LOW', 'MEDIUM', 'HIGH'];

function emptyDraft(): { text: string; severity: Severity } {
  return { text: '', severity: 'LOW' };
}

export function WarningSignsEditor({
  subjectId,
  initialItems,
}: {
  subjectId: string;
  initialItems: WarningSign[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [draft, setDraft] = useState(emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!draft.text.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/warning-signs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          text: draft.text.trim(),
          severity: draft.severity,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        warningSign?: WarningSign;
        error?: string;
      } | null;
      if (!res.ok || !data?.warningSign) {
        setError(data?.error ?? 'Failed to add warning sign');
        return;
      }
      setItems((prev) => [...prev, data.warningSign as WarningSign]);
      setDraft(emptyDraft());
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, patch: Partial<WarningSign>) {
    setError(null);
    const current = items.find((i) => i.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
    try {
      const res = await fetch(`/api/admin/warning-signs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: next.text,
          severity: next.severity,
          source: next.source,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? 'Failed to save');
        return;
      }
      setItems((prev) => prev.map((i) => (i.id === id ? next : i)));
      router.refresh();
    } catch {
      setError('Network error');
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/warning-signs/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? 'Failed to delete');
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
      router.refresh();
    } catch {
      setError('Network error');
    }
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">
        Warning signs
      </h3>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-2 text-sm">
            <select
              value={item.severity}
              onChange={(e) =>
                handleUpdate(item.id, { severity: e.target.value as Severity })
              }
              className="rounded border border-gray-300 px-1.5 py-1 text-xs"
            >
              {SEVERITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={item.text}
              onChange={(e) =>
                setItems((prev) =>
                  prev.map((i) =>
                    i.id === item.id ? { ...i, text: e.target.value } : i,
                  ),
                )
              }
              onBlur={(e) => handleUpdate(item.id, { text: e.target.value })}
              className="flex-1 rounded border border-gray-300 px-2 py-1"
            />
            <button
              onClick={() => handleDelete(item.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <select
          value={draft.severity}
          onChange={(e) =>
            setDraft((d) => ({ ...d, severity: e.target.value as Severity }))
          }
          className="rounded border border-gray-300 px-1.5 py-1 text-xs"
        >
          {SEVERITY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Add a warning sign…"
          value={draft.text}
          onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <button
          onClick={handleAdd}
          disabled={saving || !draft.text.trim()}
          className="rounded border px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the cost items editor**

Create `app/admin/(protected)/videos/[id]/CostItemsEditor.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type CostItem = {
  id: string;
  label: string;
  amount: string;
  isHidden: boolean;
  notes: string | null;
};

function emptyDraft(): { label: string; amount: string; isHidden: boolean } {
  return { label: '', amount: '', isHidden: false };
}

export function CostItemsEditor({
  subjectId,
  initialItems,
}: {
  subjectId: string;
  initialItems: CostItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [draft, setDraft] = useState(emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!draft.label.trim() || !draft.amount.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/cost-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          label: draft.label.trim(),
          amount: draft.amount.trim(),
          isHidden: draft.isHidden,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        costItem?: CostItem;
        error?: string;
      } | null;
      if (!res.ok || !data?.costItem) {
        setError(data?.error ?? 'Failed to add cost item');
        return;
      }
      setItems((prev) => [...prev, data.costItem as CostItem]);
      setDraft(emptyDraft());
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, patch: Partial<CostItem>) {
    setError(null);
    const current = items.find((i) => i.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
    try {
      const res = await fetch(`/api/admin/cost-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: next.label,
          amount: next.amount,
          isHidden: next.isHidden,
          notes: next.notes,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? 'Failed to save');
        return;
      }
      setItems((prev) => prev.map((i) => (i.id === id ? next : i)));
      router.refresh();
    } catch {
      setError('Network error');
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/cost-items/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? 'Failed to delete');
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
      router.refresh();
    } catch {
      setError('Network error');
    }
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">Cost items</h3>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-2 text-sm">
            <input
              type="text"
              value={item.label}
              onChange={(e) =>
                setItems((prev) =>
                  prev.map((i) =>
                    i.id === item.id ? { ...i, label: e.target.value } : i,
                  ),
                )
              }
              onBlur={(e) => handleUpdate(item.id, { label: e.target.value })}
              className="flex-1 rounded border border-gray-300 px-2 py-1"
              placeholder="Label"
            />
            <input
              type="text"
              value={item.amount}
              onChange={(e) =>
                setItems((prev) =>
                  prev.map((i) =>
                    i.id === item.id ? { ...i, amount: e.target.value } : i,
                  ),
                )
              }
              onBlur={(e) => handleUpdate(item.id, { amount: e.target.value })}
              className="w-28 rounded border border-gray-300 px-2 py-1"
              placeholder="Amount"
            />
            <label className="flex items-center gap-1 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={item.isHidden}
                onChange={(e) =>
                  handleUpdate(item.id, { isHidden: e.target.checked })
                }
              />
              Hidden
            </label>
            <button
              onClick={() => handleDelete(item.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          placeholder="Label…"
          value={draft.label}
          onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <input
          type="text"
          placeholder="Amount…"
          value={draft.amount}
          onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
          className="w-28 rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <label className="flex items-center gap-1 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={draft.isHidden}
            onChange={(e) =>
              setDraft((d) => ({ ...d, isHidden: e.target.checked }))
            }
          />
          Hidden
        </label>
        <button
          onClick={handleAdd}
          disabled={saving || !draft.label.trim() || !draft.amount.trim()}
          className="rounded border px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the disclosures editor**

Create `app/admin/(protected)/videos/[id]/DisclosuresEditor.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Disclosure = {
  id: string;
  text: string;
  detected: boolean;
  source: string | null;
};

function emptyDraft(): { text: string; detected: boolean } {
  return { text: '', detected: true };
}

export function DisclosuresEditor({
  subjectId,
  initialItems,
}: {
  subjectId: string;
  initialItems: Disclosure[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [draft, setDraft] = useState(emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!draft.text.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/disclosures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          text: draft.text.trim(),
          detected: draft.detected,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        disclosure?: Disclosure;
        error?: string;
      } | null;
      if (!res.ok || !data?.disclosure) {
        setError(data?.error ?? 'Failed to add disclosure');
        return;
      }
      setItems((prev) => [...prev, data.disclosure as Disclosure]);
      setDraft(emptyDraft());
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, patch: Partial<Disclosure>) {
    setError(null);
    const current = items.find((i) => i.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
    try {
      const res = await fetch(`/api/admin/disclosures/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: next.text,
          detected: next.detected,
          source: next.source,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? 'Failed to save');
        return;
      }
      setItems((prev) => prev.map((i) => (i.id === id ? next : i)));
      router.refresh();
    } catch {
      setError('Network error');
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/disclosures/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? 'Failed to delete');
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
      router.refresh();
    } catch {
      setError('Network error');
    }
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">Disclosures</h3>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-2 text-sm">
            <input
              type="text"
              value={item.text}
              onChange={(e) =>
                setItems((prev) =>
                  prev.map((i) =>
                    i.id === item.id ? { ...i, text: e.target.value } : i,
                  ),
                )
              }
              onBlur={(e) => handleUpdate(item.id, { text: e.target.value })}
              className="flex-1 rounded border border-gray-300 px-2 py-1"
            />
            <label className="flex items-center gap-1 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={item.detected}
                onChange={(e) =>
                  handleUpdate(item.id, { detected: e.target.checked })
                }
              />
              Detected
            </label>
            <button
              onClick={() => handleDelete(item.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          placeholder="Add a disclosure…"
          value={draft.text}
          onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <label className="flex items-center gap-1 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={draft.detected}
            onChange={(e) =>
              setDraft((d) => ({ ...d, detected: e.target.checked }))
            }
          />
          Detected
        </label>
        <button
          onClick={handleAdd}
          disabled={saving || !draft.text.trim()}
          className="rounded border px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire the editors into the admin video page**

In `app/admin/(protected)/videos/[id]/page.tsx`, add the imports:

```ts
import { WarningSignsEditor } from './WarningSignsEditor';
import { CostItemsEditor } from './CostItemsEditor';
import { DisclosuresEditor } from './DisclosuresEditor';
```

Replace the section Task 4 added:

```tsx
            {subject.warningSigns.length === 0 &&
            subject.costItems.length === 0 &&
            subject.disclosures.length === 0 ? (
              <div>
                <p className="mb-3 text-sm text-gray-500">
                  Nothing generated yet for this video.
                </p>
                <GenerateWarningsButton videoId={subject.id} />
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                {subject.warningSigns.length} warning sign
                {subject.warningSigns.length === 1 ? '' : 's'},{' '}
                {subject.costItems.length} cost item
                {subject.costItems.length === 1 ? '' : 's'},{' '}
                {subject.disclosures.length} disclosure
                {subject.disclosures.length === 1 ? '' : 's'} generated.
              </p>
            )}
```

with:

```tsx
            {subject.warningSigns.length === 0 &&
              subject.costItems.length === 0 &&
              subject.disclosures.length === 0 && (
                <div className="mb-4">
                  <p className="mb-3 text-sm text-gray-500">
                    Nothing generated yet for this video.
                  </p>
                  <GenerateWarningsButton videoId={subject.id} />
                </div>
              )}
            <div className="space-y-6">
              <WarningSignsEditor
                subjectId={subject.id}
                initialItems={subject.warningSigns}
              />
              <CostItemsEditor
                subjectId={subject.id}
                initialItems={subject.costItems}
              />
              <DisclosuresEditor
                subjectId={subject.id}
                initialItems={subject.disclosures}
              />
            </div>
```

- [ ] **Step 5: Type-check**

Run: `pnpm --filter hype-check exec tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 6: Manual check**

Run: `pnpm --filter hype-check dev`. On a video's admin page with existing warning signs/cost items/disclosures (generate some first via the Task 4 button if needed), edit a field inline, add a new row, delete a row — confirm each persists after a page refresh.

- [ ] **Step 7: Commit**

```bash
git add app/admin/\(protected\)/videos/\[id\]/WarningSignsEditor.tsx app/admin/\(protected\)/videos/\[id\]/CostItemsEditor.tsx app/admin/\(protected\)/videos/\[id\]/DisclosuresEditor.tsx app/admin/\(protected\)/videos/\[id\]/page.tsx
git commit -m "feat: inline admin editors for warning signs, costs, disclosures"
```

---

### Task 6: Public video page rendering + gap-comment cleanup

**Files:**
- Modify: `app/(public)/videos/[slug]/page.tsx`
- Modify: `lib/db/queries.ts`

**Interfaces:**
- Consumes: `video.warningSigns`, `video.costItems`, `video.disclosures` (already fetched by `getVideoBySlug`); `RiskStamp` from `@/components/ui/RiskStamp` (already imported in this file).

- [ ] **Step 1: Remove the gap comment in the query**

In `lib/db/queries.ts`, inside the `getVideoBySlug` query's `include` block, replace:

```ts
        // Fetched for future use — no admin UI or job writes to these tables yet,
        // so they're always empty. Don't build page sections around them until
        // there's a way to populate them.
        warningSigns: true,
        costItems: true,
        disclosures: true,
```

with:

```ts
        warningSigns: true,
        costItems: true,
        disclosures: true,
```

- [ ] **Step 2: Add the Warning Signs and Costs sections**

In `app/(public)/videos/[slug]/page.tsx`, the existing block:

```tsx
          {warnings.length > 0 && (
            <section className="mb-8">
              <h2 className="text-ink-muted mb-3 text-xl font-semibold">
                What to Be Careful About
              </h2>
              <ul className="space-y-2">
                {warnings.map((item, index) => (
                  <li key={index} className="text-ink-muted/90 flex gap-2">
                    <span className="text-verdict-risky">⚠</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <AdSlot slot="between-content" className="mb-8" config={adsConfig} />
```

becomes:

```tsx
          {warnings.length > 0 && (
            <section className="mb-8">
              <h2 className="text-ink-muted mb-3 text-xl font-semibold">
                What to Be Careful About
              </h2>
              <ul className="space-y-2">
                {warnings.map((item, index) => (
                  <li key={index} className="text-ink-muted/90 flex gap-2">
                    <span className="text-verdict-risky">⚠</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {video.warningSigns.length > 0 && (
        <section className="mb-8">
          <h2 className="text-ink-muted mb-3 text-xl font-semibold">
            Warning Signs
          </h2>
          <ul className="space-y-2">
            {video.warningSigns.map((w: (typeof video.warningSigns)[number]) => (
              <li key={w.id} className="flex items-start gap-2">
                <RiskStamp level={w.severity} />
                <span className="text-ink-muted/90 text-sm">{w.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {video.costItems.length > 0 && (
        <section className="mb-8">
          <h2 className="text-ink-muted mb-3 text-xl font-semibold">
            Costs to Know About
          </h2>
          <ul className="space-y-2">
            {video.costItems.map((c: (typeof video.costItems)[number]) => (
              <li
                key={c.id}
                className={`flex items-center justify-between rounded-lg border px-4 py-2 text-sm ${
                  c.isHidden
                    ? 'border-verdict-risky/30 bg-verdict-risky/10'
                    : 'border-hairline bg-paper'
                }`}
              >
                <span className="text-ink-muted/90">
                  {c.label}
                  {c.isHidden && (
                    <span className="text-verdict-risky ml-2 text-xs font-semibold uppercase">
                      Hidden fee
                    </span>
                  )}
                </span>
                <span className="text-ink-muted font-medium">{c.amount}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AdSlot slot="between-content" className="mb-8" config={adsConfig} />
```

- [ ] **Step 3: Add the Disclosures section**

The existing block:

```tsx
      {/* Affiliate links */}
      {affiliateLinks.length > 0 && (
```

becomes:

```tsx
      {/* Disclosures */}
      {video.disclosures.length > 0 && (
        <section className="mb-8">
          <h2 className="text-ink-muted mb-3 text-lg font-semibold">
            Disclosures
          </h2>
          <ul className="space-y-1">
            {video.disclosures.map((d: (typeof video.disclosures)[number]) => (
              <li key={d.id} className="text-ink-muted/80 text-sm">
                {d.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Affiliate links */}
      {affiliateLinks.length > 0 && (
```

- [ ] **Step 4: Type-check**

Run: `pnpm --filter hype-check exec tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 5: Manual check**

Run: `pnpm --filter hype-check dev`. Using the admin "Generate" button from Task 4 on a published video, populate its warning signs/cost items/disclosures, then visit that video's public page (`/videos/<slug>`) and confirm all three new sections render with the tokenized styling (no raw Tailwind grays/ambers), and that a video with none of these populated shows no empty section boxes.

- [ ] **Step 6: Commit**

```bash
git add app/\(public\)/videos/\[slug\]/page.tsx lib/db/queries.ts
git commit -m "feat: render warning signs, costs, disclosures on the public video page"
```
