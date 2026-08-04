# Hype Check Video Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace off-brand colors and generic shared badges on the Hype Check public site with the app's own theme tokens, and restructure the video detail page to lead with the verdict/rationale that's already fetched but never rendered.

**Architecture:** Two new site-local presentational components (`EvidenceStamp`, `RiskStamp`) join the existing `VerdictStamp` as drop-in replacements for `@menhealth/ui`'s generic-colored `EvidenceBadge`/`RiskBadge`, swapped in across all public-facing pages. `VerdictStamp` gains an optional `size` prop for hero use. A new `VerdictHero` component wraps `VerdictStamp` + rationale text and is inserted into the video page. All work happens in `apps/hype-check`; `packages/ui` is untouched.

**Tech Stack:** Next.js App Router (Server Components), TypeScript, Tailwind CSS v4 theme tokens (`app/globals.css`), Vitest + Testing Library.

## Global Constraints

- Do not modify `packages/ui`'s `EvidenceBadge`/`RiskBadge` — they're shared with other sites in the monorepo.
- Do not touch admin pages/routes (`app/admin/**`) — admin keeps its existing utilitarian styling.
- No new CSS custom properties — reuse the 5 existing `--verdict-*` tokens plus `--ink-muted`, `--hairline`, `--surface`, `--paper` already defined in `app/globals.css`.
- No DB/schema changes.
- `EvidenceStamp`/`RiskStamp` must accept the same prop shapes as the components they replace (`status: string` / `level: string`, plus `showNotChecked?: boolean` on `EvidenceStamp`) so call sites need only an import-path change plus a rename of the JSX tag.
- All new components live in `apps/hype-check/components/ui/`, follow the existing `VerdictStamp.tsx` file pattern (no "use client" needed — pure presentational, no hooks).

---

### Task 1: Add a `size` prop to `VerdictStamp`

**Files:**
- Modify: `apps/hype-check/components/ui/VerdictStamp.tsx`
- Test: `apps/hype-check/__tests__/VerdictStamp.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `VerdictStamp({ verdict, size? }: { verdict: VerdictType | null | undefined; size?: 'sm' | 'lg' })`. Default `size` is `'sm'` (unchanged visual output for all existing callers that don't pass it).

- [ ] **Step 1: Write the failing test**

Add to `apps/hype-check/__tests__/VerdictStamp.test.tsx`, inside the existing `describe("VerdictStamp", ...)` block:

```tsx
  it("applies larger text size when size='lg' is passed", () => {
    render(<VerdictStamp verdict="LEGIT" size="lg" />);
    expect(screen.getByText("LEGIT")).toHaveClass("text-base");
  });

  it("defaults to the small text size when size is omitted", () => {
    render(<VerdictStamp verdict="LEGIT" />);
    expect(screen.getByText("LEGIT")).toHaveClass("text-xs");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/hype-check && pnpm test -- VerdictStamp`
Expected: FAIL — `text-base` class not present (component doesn't support `size` yet).

- [ ] **Step 3: Write minimal implementation**

Replace the full contents of `apps/hype-check/components/ui/VerdictStamp.tsx` with:

```tsx
export type VerdictType =
  | 'LEGIT'
  | 'MISLEADING'
  | 'OVERPRICED'
  | 'RISKY'
  | 'SCAM';

const VERDICT_STYLES: Record<VerdictType, string> = {
  LEGIT: 'border-verdict-legit text-verdict-legit -rotate-2',
  MISLEADING: 'border-verdict-misleading text-verdict-misleading rotate-2',
  OVERPRICED: 'border-verdict-overpriced text-verdict-overpriced -rotate-3',
  RISKY: 'border-verdict-risky text-verdict-risky rotate-3',
  SCAM: 'border-verdict-scam text-verdict-scam -rotate-2',
};

const SIZE_STYLES: Record<'sm' | 'lg', string> = {
  sm: 'px-2.5 py-0.5 text-xs',
  lg: 'px-4 py-1.5 text-base',
};

interface VerdictStampProps {
  verdict: VerdictType | null | undefined;
  size?: 'sm' | 'lg';
}

export function VerdictStamp({ verdict, size = 'sm' }: VerdictStampProps) {
  if (!verdict) return null;

  return (
    <span
      className={`inline-block rounded-sm border-[2.5px] font-slab font-black tracking-widest uppercase ${SIZE_STYLES[size]} ${VERDICT_STYLES[verdict]}`}
    >
      {verdict}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/hype-check && pnpm test -- VerdictStamp`
Expected: PASS, all tests including the pre-existing ones.

- [ ] **Step 5: Commit**

```bash
git add apps/hype-check/components/ui/VerdictStamp.tsx apps/hype-check/__tests__/VerdictStamp.test.tsx
git commit -m "Add size prop to VerdictStamp for hero-sized display"
```

---

### Task 2: Create `EvidenceStamp` component

**Files:**
- Create: `apps/hype-check/components/ui/EvidenceStamp.tsx`
- Test: `apps/hype-check/__tests__/EvidenceStamp.test.tsx`

**Interfaces:**
- Consumes: nothing (pure presentational, no dependency on other new components).
- Produces: `EvidenceStamp({ status, showNotChecked?: boolean }: { status: string; showNotChecked?: boolean })`. Same prop shape as `@menhealth/ui`'s `EvidenceBadge` it replaces — callers change only the import path and tag name.

- [ ] **Step 1: Write the failing test**

Create `apps/hype-check/__tests__/EvidenceStamp.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EvidenceStamp } from "@/components/ui/EvidenceStamp";

describe("EvidenceStamp", () => {
  it("renders nothing for NOT_CHECKED by default", () => {
    const { container } = render(<EvidenceStamp status="NOT_CHECKED" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders NOT_CHECKED when showNotChecked is true", () => {
    render(<EvidenceStamp status="NOT_CHECKED" showNotChecked />);
    expect(
      screen.getByText("Claim extracted — not yet reviewed")
    ).toBeInTheDocument();
  });

  it("renders every known evidence status without throwing", () => {
    const statuses = [
      "SUPPORTED",
      "MODERATE",
      "MIXED",
      "WEAK",
      "UNSUPPORTED",
    ];
    for (const status of statuses) {
      const { unmount } = render(<EvidenceStamp status={status} />);
      unmount();
    }
  });

  it("falls back to NOT_CHECKED styling for an unknown status", () => {
    render(<EvidenceStamp status="something-unexpected" showNotChecked />);
    expect(
      screen.getByText("Claim extracted — not yet reviewed")
    ).toBeInTheDocument();
  });

  it("uses the verdict-legit token for SUPPORTED", () => {
    render(<EvidenceStamp status="SUPPORTED" />);
    expect(screen.getByText(/strong evidence/)).toHaveClass(
      "border-verdict-legit"
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/hype-check && pnpm test -- EvidenceStamp`
Expected: FAIL — `@/components/ui/EvidenceStamp` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `apps/hype-check/components/ui/EvidenceStamp.tsx`:

```tsx
const EVIDENCE_CONFIG: Record<string, { label: string; className: string }> = {
  SUPPORTED: {
    label: 'Claim checked — strong evidence',
    className: 'border-verdict-legit text-verdict-legit',
  },
  MODERATE: {
    label: 'Claim checked — moderate evidence',
    className: 'border-verdict-legit text-verdict-legit',
  },
  MIXED: {
    label: 'Claim checked — mixed / early',
    className: 'border-verdict-misleading text-verdict-misleading',
  },
  WEAK: {
    label: 'Claim checked — weak evidence',
    className: 'border-verdict-overpriced text-verdict-overpriced',
  },
  UNSUPPORTED: {
    label: 'Claim checked — not supported',
    className: 'border-verdict-scam text-verdict-scam',
  },
  NOT_CHECKED: {
    label: 'Claim extracted — not yet reviewed',
    className: 'border-ink-muted/40 text-ink-muted/60',
  },
};

export function EvidenceStamp({
  status,
  showNotChecked = false,
}: {
  status: string;
  showNotChecked?: boolean;
}) {
  if (status === 'NOT_CHECKED' && !showNotChecked) return null;
  const config = EVIDENCE_CONFIG[status] ?? EVIDENCE_CONFIG['NOT_CHECKED'];

  return (
    <span
      className={`inline-block rounded-sm border-[1.5px] px-2 py-0.5 font-slab text-[0.65rem] font-bold tracking-wide uppercase ${config?.className}`}
    >
      {config?.label}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/hype-check && pnpm test -- EvidenceStamp`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/hype-check/components/ui/EvidenceStamp.tsx apps/hype-check/__tests__/EvidenceStamp.test.tsx
git commit -m "Add EvidenceStamp: brand-toned replacement for shared EvidenceBadge"
```

---

### Task 3: Create `RiskStamp` component

**Files:**
- Create: `apps/hype-check/components/ui/RiskStamp.tsx`
- Test: `apps/hype-check/__tests__/RiskStamp.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `RiskStamp({ level }: { level: string })`. Same prop shape as `@menhealth/ui`'s `RiskBadge` it replaces.

- [ ] **Step 1: Write the failing test**

Create `apps/hype-check/__tests__/RiskStamp.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RiskStamp } from "@/components/ui/RiskStamp";

describe("RiskStamp", () => {
  it("renders every known risk level without throwing", () => {
    for (const level of ["LOW", "MEDIUM", "HIGH"]) {
      const { unmount } = render(<RiskStamp level={level} />);
      unmount();
    }
  });

  it("falls back to LOW styling for an unknown level", () => {
    render(<RiskStamp level="something-unexpected" />);
    expect(screen.getByText("Low risk")).toBeInTheDocument();
  });

  it("uses the verdict-risky token for HIGH", () => {
    render(<RiskStamp level="HIGH" />);
    expect(screen.getByText("High risk")).toHaveClass("border-verdict-risky");
  });

  it("uses the verdict-misleading token for MEDIUM", () => {
    render(<RiskStamp level="MEDIUM" />);
    expect(screen.getByText("Medium risk")).toHaveClass(
      "border-verdict-misleading"
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/hype-check && pnpm test -- RiskStamp`
Expected: FAIL — `@/components/ui/RiskStamp` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `apps/hype-check/components/ui/RiskStamp.tsx`:

```tsx
const RISK_CONFIG: Record<string, { label: string; className: string }> = {
  LOW: {
    label: 'Low risk',
    className: 'border-ink-muted/40 text-ink-muted/60',
  },
  MEDIUM: {
    label: 'Medium risk',
    className: 'border-verdict-misleading text-verdict-misleading',
  },
  HIGH: {
    label: 'High risk',
    className: 'border-verdict-risky text-verdict-risky',
  },
};

export function RiskStamp({ level }: { level: string }) {
  const config = RISK_CONFIG[level] ?? RISK_CONFIG['LOW'];

  return (
    <span
      className={`inline-block rounded-sm border-[1.5px] px-2 py-0.5 font-slab text-[0.65rem] font-bold tracking-wide uppercase ${config?.className}`}
    >
      {config?.label}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/hype-check && pnpm test -- RiskStamp`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/hype-check/components/ui/RiskStamp.tsx apps/hype-check/__tests__/RiskStamp.test.tsx
git commit -m "Add RiskStamp: brand-toned replacement for shared RiskBadge"
```

---

### Task 4: Create `VerdictHero` component

**Files:**
- Create: `apps/hype-check/components/ui/VerdictHero.tsx`
- Test: `apps/hype-check/__tests__/VerdictHero.test.tsx`

**Interfaces:**
- Consumes: `VerdictStamp` from `@/components/ui/VerdictStamp` (Task 1's `size` prop, used with `size="lg"`).
- Produces: `VerdictHero({ verdict, rationale }: { verdict: VerdictType | null | undefined; rationale?: string | null })`. Renders a bordered hero block: the verdict stamp + rationale text when a verdict exists, or a neutral "Not yet verdicted" message when it doesn't (never renders nothing/null — the block should always be visible on the video page).

- [ ] **Step 1: Write the failing test**

Create `apps/hype-check/__tests__/VerdictHero.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VerdictHero } from "@/components/ui/VerdictHero";

describe("VerdictHero", () => {
  it("shows a neutral message when there is no verdict", () => {
    render(<VerdictHero verdict={null} rationale={null} />);
    expect(screen.getByText("Not yet verdicted")).toBeInTheDocument();
  });

  it("renders the verdict stamp and rationale when both are present", () => {
    render(
      <VerdictHero
        verdict="MISLEADING"
        rationale="The claim overstates results seen in the video."
      />
    );
    expect(screen.getByText("MISLEADING")).toBeInTheDocument();
    expect(
      screen.getByText("The claim overstates results seen in the video.")
    ).toBeInTheDocument();
  });

  it("renders the verdict stamp without a rationale paragraph when rationale is missing", () => {
    render(<VerdictHero verdict="LEGIT" rationale={null} />);
    expect(screen.getByText("LEGIT")).toBeInTheDocument();
    expect(screen.queryByText("Not yet verdicted")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/hype-check && pnpm test -- VerdictHero`
Expected: FAIL — `@/components/ui/VerdictHero` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `apps/hype-check/components/ui/VerdictHero.tsx`:

```tsx
import { VerdictStamp, type VerdictType } from './VerdictStamp';

interface VerdictHeroProps {
  verdict: VerdictType | null | undefined;
  rationale?: string | null;
}

export function VerdictHero({ verdict, rationale }: VerdictHeroProps) {
  return (
    <div className="border-hairline bg-paper mb-8 rounded-lg border p-6">
      {verdict ? (
        <>
          <VerdictStamp verdict={verdict} size="lg" />
          {rationale && (
            <p className="text-ink-muted mt-3 text-sm leading-relaxed">
              {rationale}
            </p>
          )}
        </>
      ) : (
        <p className="text-ink-muted/60 text-sm font-semibold tracking-wide uppercase">
          Not yet verdicted
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/hype-check && pnpm test -- VerdictHero`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/hype-check/components/ui/VerdictHero.tsx apps/hype-check/__tests__/VerdictHero.test.tsx
git commit -m "Add VerdictHero component for the video page verdict block"
```

**Note on `bg-paper` vs `bg-surface`:** use `bg-paper`, not `bg-surface`, for this block's background. `app/globals.css`'s `@theme inline` block has a pre-existing bug — `--color-surface` and `--color-ink-muted` are both mapped to Tailwind's built-in `--color-gray-900` instead of this site's own `--surface`/`--ink-muted` root variables, so `bg-surface` currently renders near-black. `bg-paper` is correctly wired (`--color-paper: var(--paper)`) and renders the intended pale cream. Fixing the token bug itself is out of scope here — other pages (the frontpage's `FeaturedInsight` and newsletter sections) compensate for it with hardcoded `text-white`, so fixing it blind would break those.

---

### Task 5: Swap `EvidenceBadge`/`RiskBadge` for `EvidenceStamp`/`RiskStamp` across public pages

**Files:**
- Modify: `apps/hype-check/app/(public)/page.tsx`
- Modify: `apps/hype-check/app/(public)/videos/[slug]/PremiumSection.tsx`
- Modify: `apps/hype-check/app/(public)/videos/[slug]/page.tsx` (badge swap only — content restructure is Task 6)
- Modify: `apps/hype-check/app/(public)/creators/[slug]/page.tsx`
- Modify: `apps/hype-check/app/(public)/glossary/[slug]/page.tsx`
- Modify: `apps/hype-check/app/(public)/weekly/[slug]/page.tsx`
- Modify: `apps/hype-check/app/(public)/topics/page.tsx`
- Modify: `apps/hype-check/app/(public)/topics/[slug]/page.tsx`
- Modify: `apps/hype-check/app/(public)/claims/page.tsx`
- Modify: `apps/hype-check/app/(public)/claims/[slug]/page.tsx`
- Modify: `apps/hype-check/components/ui/HypeVideoCard.tsx`

**Interfaces:**
- Consumes: `EvidenceStamp` from `@/components/ui/EvidenceStamp` (Task 2), `RiskStamp` from `@/components/ui/RiskStamp` (Task 3).
- Produces: nothing new — this is a mechanical rename with no behavior change. `@menhealth/ui`'s `EvidenceBadge`/`RiskBadge` remain untouched and still exported for other apps/sites.

This is one deliverable (the site-wide badge swap) reviewed as a whole, so it's a single task even though it touches many files. In each file: remove `EvidenceBadge`/`RiskBadge` from the `@menhealth/ui` import (keep any other names imported from there), add the needed new import(s), and rename the JSX tags. No prop changes anywhere — `EvidenceStamp`/`RiskStamp` take identical props to what they replace.

- [ ] **Step 1: `app/(public)/page.tsx`**

Remove `EvidenceBadge,` and `RiskBadge,` from the `@menhealth/ui` import (lines 5-10). Add:

```tsx
import { EvidenceStamp } from '@/components/ui/EvidenceStamp';
import { RiskStamp } from '@/components/ui/RiskStamp';
```

Rename `<EvidenceBadge status={featuredClaim.evidenceStatus} />` → `<EvidenceStamp status={featuredClaim.evidenceStatus} />` (line 99) and `<RiskBadge level={featuredVideo.riskLevel} />` → `<RiskStamp level={featuredVideo.riskLevel} />` (line 101).

- [ ] **Step 2: `app/(public)/videos/[slug]/PremiumSection.tsx`**

Change line 3 from:

```tsx
import { PremiumGate, EvidenceBadge, RiskBadge } from "@menhealth/ui";
```

to:

```tsx
import { PremiumGate } from "@menhealth/ui";
import { EvidenceStamp } from "@/components/ui/EvidenceStamp";
import { RiskStamp } from "@/components/ui/RiskStamp";
```

Rename the `<RiskBadge` (line 23) and `<EvidenceBadge` (line 24) JSX tags to `<RiskStamp` / `<EvidenceStamp`.

- [ ] **Step 3: `app/(public)/videos/[slug]/page.tsx`**

Remove `EvidenceBadge,` and `RiskBadge,` from the `@menhealth/ui` import (lines 19-30). Add:

```tsx
import { EvidenceStamp } from '@/components/ui/EvidenceStamp';
import { RiskStamp } from '@/components/ui/RiskStamp';
```

Rename all four usages: line 208 (`<EvidenceBadge`), line 211 (`<RiskBadge`), line 363 (`<RiskBadge`), line 364 (`<EvidenceBadge`) to their `Stamp` equivalents. (Task 6 will further edit this file's surrounding markup/colors — this step only renames the badge tags and import.)

- [ ] **Step 4: `app/(public)/creators/[slug]/page.tsx`**

Remove `EvidenceBadge,` from the `@menhealth/ui` import (around line 7). Add:

```tsx
import { EvidenceStamp } from '@/components/ui/EvidenceStamp';
```

Rename the `<EvidenceBadge` usage (line 396) to `<EvidenceStamp`.

- [ ] **Step 5: `app/(public)/glossary/[slug]/page.tsx`**

Change line 8 from:

```tsx
import { Disclaimer, JsonLd, RiskBadge } from '@menhealth/ui';
```

to:

```tsx
import { Disclaimer, JsonLd } from '@menhealth/ui';
import { RiskStamp } from '@/components/ui/RiskStamp';
```

Rename `<RiskBadge level="HIGH" />` (line 95) to `<RiskStamp level="HIGH" />`.

- [ ] **Step 6: `app/(public)/weekly/[slug]/page.tsx`**

Remove `EvidenceBadge,` from the `@menhealth/ui` import (around line 10). Add:

```tsx
import { EvidenceStamp } from '@/components/ui/EvidenceStamp';
```

Rename both `<EvidenceBadge` usages (lines 206, 231) to `<EvidenceStamp`.

- [ ] **Step 7: `app/(public)/topics/page.tsx`**

Change line 4 from:

```tsx
import { JsonLd, RiskBadge } from '@menhealth/ui';
```

to:

```tsx
import { JsonLd } from '@menhealth/ui';
import { RiskStamp } from '@/components/ui/RiskStamp';
```

Rename `<RiskBadge level="HIGH" />` (line 45) to `<RiskStamp level="HIGH" />`.

- [ ] **Step 8: `app/(public)/topics/[slug]/page.tsx`**

Remove `EvidenceBadge,` and `RiskBadge,` from the `@menhealth/ui` import (around lines 22-28). Add:

```tsx
import { EvidenceStamp } from '@/components/ui/EvidenceStamp';
import { RiskStamp } from '@/components/ui/RiskStamp';
```

Rename `<RiskBadge` (line 223), `<EvidenceBadge` (line 313), `<EvidenceBadge` (line 335) to their `Stamp` equivalents.

- [ ] **Step 9: `app/(public)/claims/page.tsx`**

Change line 5 from:

```tsx
import { Disclaimer, EvidenceBadge, JsonLd } from '@menhealth/ui';
```

to:

```tsx
import { Disclaimer, JsonLd } from '@menhealth/ui';
import { EvidenceStamp } from '@/components/ui/EvidenceStamp';
```

Rename `<EvidenceBadge status={claim.evidenceStatus} />` (line 90) to `<EvidenceStamp status={claim.evidenceStatus} />`.

- [ ] **Step 10: `app/(public)/claims/[slug]/page.tsx`**

Remove `EvidenceBadge,` and `RiskBadge,` from the `@menhealth/ui` import (around lines 7-12). Add:

```tsx
import { EvidenceStamp } from '@/components/ui/EvidenceStamp';
import { RiskStamp } from '@/components/ui/RiskStamp';
```

Rename `<EvidenceBadge status={claim.evidenceStatus} showNotChecked />` and `<RiskBadge level={claim.riskLevel} />` (lines 150-151) to their `Stamp` equivalents (the `showNotChecked` prop is supported identically by `EvidenceStamp`).

- [ ] **Step 11: `components/ui/HypeVideoCard.tsx`**

Change line 1 from:

```tsx
import { EvidenceBadge, RiskBadge } from '@menhealth/ui';
```

to:

```tsx
import { EvidenceStamp } from '@/components/ui/EvidenceStamp';
import { RiskStamp } from '@/components/ui/RiskStamp';
```

Rename `<RiskBadge level={riskLevel} />` (line 68) and `<EvidenceBadge status={evidenceLabel} />` (line 74) to their `Stamp` equivalents.

- [ ] **Step 12: Verify no stray references remain**

Run: `cd apps/hype-check && grep -rn "EvidenceBadge\|RiskBadge" app/\(public\) components/ui/HypeVideoCard.tsx`
Expected: no output (empty). If anything prints, fix that file before continuing.

- [ ] **Step 13: Run the full test suite and typecheck**

Run: `cd apps/hype-check && pnpm test && pnpm exec tsc --noEmit`
Expected: all tests PASS, no type errors.

- [ ] **Step 14: Commit**

```bash
git add apps/hype-check/app apps/hype-check/components/ui/HypeVideoCard.tsx
git commit -m "Swap shared EvidenceBadge/RiskBadge for brand-toned EvidenceStamp/RiskStamp"
```

---

### Task 6: Restructure the video page — tokenize colors and add the verdict hero

**Files:**
- Modify: `apps/hype-check/app/(public)/videos/[slug]/page.tsx`

**Interfaces:**
- Consumes: `VerdictHero` from `@/components/ui/VerdictHero` (Task 4). `video.verdict` is already returned by `getVideoBySlug` (`lib/db/queries.ts:75`) as `{ verdict: VerdictType; rationale: string | null; ... } | null`.
- Produces: nothing new for other tasks to consume — this is the final content/visual change to the page.

No unit test for this task: `page.tsx` is a Server Component page with no existing test coverage (the app doesn't unit-test page-level components, per `AGENTS.md`'s "unit tests for scoring, parsing, and AI-output-validation functions" scope). Verification is the dev-server check in Step 6.

- [ ] **Step 1: Add the `VerdictHero` import**

In the import block near the top of the file (after the `@menhealth/ui` import block, which Task 5 already edited), add:

```tsx
import { VerdictHero } from '@/components/ui/VerdictHero';
```

- [ ] **Step 2: Tokenize the breadcrumb, title, and meta text colors**

Replace:

```tsx
      <nav className="mb-6 text-sm text-gray-500">
```

with:

```tsx
      <nav className="mb-6 text-sm text-ink-muted/60">
```

Replace:

```tsx
        <span className="text-gray-900">{displayTitle}</span>
```

with:

```tsx
        <span className="text-ink-muted">{displayTitle}</span>
```

Replace:

```tsx
      <h1 className="mb-2 text-3xl leading-tight font-bold text-gray-900">
```

with:

```tsx
      <h1 className="mb-2 text-3xl leading-tight font-bold text-ink-muted">
```

Replace:

```tsx
          <p className="mb-2 text-sm text-gray-400">
```

with:

```tsx
          <p className="mb-2 text-sm text-ink-muted/50">
```

Replace both occurrences of:

```tsx
      <p className="mb-1 text-sm text-gray-500">
```

with:

```tsx
      <p className="mb-1 text-sm text-ink-muted/60">
```

Replace:

```tsx
      <p className="mb-6 text-xs text-gray-400">
```

with:

```tsx
      <p className="mb-6 text-xs text-ink-muted/50">
```

- [ ] **Step 3: Insert the `VerdictHero` block before the YouTube embed**

Find:

```tsx
      {/* Official YouTube embed */}
      <div className="mb-8">
```

Replace with:

```tsx
      {/* Verdict */}
      <VerdictHero
        verdict={video.verdict?.verdict}
        rationale={video.verdict?.rationale}
      />

      {/* Official YouTube embed */}
      <div className="mb-8">
```

- [ ] **Step 4: Tokenize the target-audience and warnings teaser boxes**

Replace:

```tsx
            <div className="border-ink-muted/20 text-ink-muted/90 rounded-lg border bg-indigo-50 px-4 py-3 text-sm">
```

with:

```tsx
            <div className="border-hairline text-ink-muted/90 bg-paper rounded-lg border px-4 py-3 text-sm">
```

(`bg-paper`, not `bg-surface` — see the note under Task 4 on the `--color-surface` token bug.)

Replace:

```tsx
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
```

with:

```tsx
            <div className="border-verdict-risky/30 bg-verdict-risky/10 text-verdict-risky rounded-lg border px-4 py-3 text-sm">
```

- [ ] **Step 5: Tokenize the summary, takeaways, claims, topics, glossary, related, embed, and affiliate section colors**

Replace every remaining occurrence of these raw classes in the file with their token equivalents (same find/replace across the rest of the file — each maps 1:1, do a project-wide find-and-replace within this file only):

| Find | Replace |
|---|---|
| `text-gray-900` | `text-ink-muted` |
| `text-gray-700` | `text-ink-muted/90` |
| `text-gray-500` | `text-ink-muted/60` |
| `text-gray-400` | `text-ink-muted/50` |
| `border-gray-200` | `border-hairline` |
| `bg-gray-50` | `bg-paper` |
| `text-amber-500` | `text-verdict-risky` |

(`bg-paper`, not `bg-surface` — same `--color-surface` token bug noted under Task 4. The embeddable-badge `<textarea>` uses `bg-gray-50` with `text-gray-600` today; keep it on a token pairing that stays legible, e.g. `bg-paper` with `text-ink-muted/60` — not `text-ink-muted/70` on `bg-surface`, which resolves to identical colors and renders invisible text.)

This covers: the "Summary" / "Key Takeaways" / "What to Be Careful About" headings and body text, the claims card border/text, the "Topics" / "Key terms" / "Related reviews" headings, the embeddable-badge section, and the affiliate links section. The `⚠` warning icon (`text-amber-500` → `text-verdict-risky`) is the one non-heading, non-border replacement in this pass.

- [ ] **Step 6: Manual verification**

Run: `cd apps/hype-check && pnpm dev`

Open `http://localhost:3000/videos/<any-published-slug>` (use a slug from `pnpm exec prisma studio` or the trending list on `/`) and confirm:
- No `gray-*`/`amber-*`/`indigo-*` colors are visible anywhere on the page (everything reads in the paper/ink/verdict palette).
- The verdict block appears above the YouTube embed, showing the large verdict stamp and rationale (or "Not yet verdicted" if the video has none).
- Claims further down show the new bordered evidence/risk stamps, not pill-shaped colored badges.

- [ ] **Step 7: Commit**

```bash
git add "apps/hype-check/app/(public)/videos/[slug]/page.tsx"
git commit -m "Restructure video page: tokenize colors and lead with the verdict"
```

---

### Task 7: Note the unpopulated warning-signs/costs/disclosures data as a follow-up

**Files:**
- Modify: `apps/hype-check/lib/db/queries.ts:71-76`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing — comment-only change.

- [ ] **Step 1: Add the follow-up comment**

In `_getVideoBySlugCached` (around line 60-77), find:

```ts
        warningSigns: true,
        costItems: true,
        disclosures: true,
```

Replace with:

```ts
        // Fetched for future use — no admin UI or job writes to these tables yet,
        // so they're always empty. Don't build page sections around them until
        // there's a way to populate them.
        warningSigns: true,
        costItems: true,
        disclosures: true,
```

- [ ] **Step 2: Run typecheck to confirm nothing broke**

Run: `cd apps/hype-check && pnpm exec tsc --noEmit`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/hype-check/lib/db/queries.ts
git commit -m "Note that warningSigns/costItems/disclosures have no writer yet"
```
