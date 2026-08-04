# Hype Check Public Site Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Hype Check's generic indigo/white SaaS look with the approved "Verdict Stamp Editorial" identity (cream/ink palette, burst-badge logotype, real verdict stamps on the home page) across the public site shell only.

**Architecture:** New CSS custom-property tokens (light + dark) drive Tailwind v4 utility classes site-wide. A rebuilt `BrandLogotype` and a new `VerdictStamp` component carry the visual identity. A hype-check-local `HypeVideoCard` replaces the shared `packages/ui` `VideoCard` on this app's home page only, so menhealth's use of the same shared component is untouched.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4 (`@theme inline` CSS-first config), `next/font/google`, Prisma 7, Vitest + Testing Library.

## Global Constraints

- Full design spec: `docs/superpowers/specs/2026-08-04-hype-check-redesign-design.md` — read it before starting if anything below is ambiguous.
- Out of scope: `app/admin/**`, `packages/ui/**` (shared with menhealth — never restyle `VideoCard`, `EvidenceBadge`, `RiskBadge`, `HowWeRateClaims`, `NewsletterSignupForm`), any other app in the monorepo, the `scam-or-legit.net` rename, Prisma schema changes.
- Brand name stays "Hype Check"; domain stays `hype-check.net`.
- Red (`--brand-red` / `--verdict-scam`) is reserved for verdict stamps only — never used for buttons, links, or decorative accents.
- All commands below run from the repo root using pnpm workspace filters: `pnpm --filter hype-check <script>`.

---

### Task 1: Color tokens, dark mode, and the slab-serif font

**Files:**
- Modify: `apps/hype-check/app/globals.css` (full file replacement)
- Modify: `apps/hype-check/app/layout.tsx:1-2,19-25,85` (font import/loader/className)

**Interfaces:**
- Produces: Tailwind utility classes `bg-paper`, `bg-surface`, `text-ink`, `text-ink-muted`, `border-hairline`, `bg-brand-red`/`text-brand-red`/`border-brand-red`, `bg-verdict-legit`/`text-verdict-legit`/`border-verdict-legit` (and the same `-misleading`/`-overpriced`/`-risky`/`-scam` variants), and `font-slab`. Every later task consumes these class names — spelling must match exactly.
- Produces: CSS variable `--font-slab` (set by the `Zilla_Slab` font loader in `layout.tsx`), consumed by the `.mh-logotype-wordmark` rule in this same file and by the `font-slab` Tailwind utility.

- [ ] **Step 1: Replace `apps/hype-check/app/globals.css` with the following**

```css
@import "tailwindcss";

:root {
  --paper: #f5f1e8;
  --surface: #fbf9f4;
  --ink: #14110f;
  --ink-muted: #6b6459;
  --hairline: #d9d2c3;
  --brand-red: #c1272d;
  --verdict-legit: #1e7a46;
  --verdict-misleading: #a6791f;
  --verdict-overpriced: #c1652b;
  --verdict-risky: #b8452b;
  --verdict-scam: #c1272d;
}

@theme inline {
  --color-paper: var(--paper);
  --color-surface: var(--surface);
  --color-ink: var(--ink);
  --color-ink-muted: var(--ink-muted);
  --color-hairline: var(--hairline);
  --color-brand-red: var(--brand-red);
  --color-verdict-legit: var(--verdict-legit);
  --color-verdict-misleading: var(--verdict-misleading);
  --color-verdict-overpriced: var(--verdict-overpriced);
  --color-verdict-risky: var(--verdict-risky);
  --color-verdict-scam: var(--verdict-scam);
  --font-sans: var(--font-inter);
  --font-slab: var(--font-slab);
}

@media (prefers-color-scheme: dark) {
  :root {
    --paper: #14110f;
    --surface: #1c1815;
    --ink: #f5f1e8;
    --ink-muted: #b5aea0;
    --hairline: #3a342c;
    --brand-red: #e2555a;
    --verdict-legit: #34a868;
    --verdict-misleading: #d9a83b;
    --verdict-overpriced: #e08a4c;
    --verdict-risky: #e0684c;
    --verdict-scam: #e2555a;
  }
}

body {
  background: var(--paper);
  color: var(--ink);
  font-family:
    var(--font-sans),
    system-ui,
    -apple-system,
    sans-serif;
}

input,
textarea {
  color: var(--color-gray-600);
}

button,
a {
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.mh-logotype {
  --mh-logo-mark-size: 2.35rem;
  --mh-logo-wordmark-size: 1.35rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ink);
}

.mh-logotype-mark {
  width: var(--mh-logo-mark-size);
  height: var(--mh-logo-mark-size);
  display: inline-flex;
  transform: rotate(-4deg);
}

.mh-logotype-mark svg {
  width: 100%;
  height: 100%;
}

.mh-logotype-mark-burst {
  fill: var(--ink);
}

.mh-logotype-mark-check {
  stroke: var(--paper);
  stroke-width: 3.4;
}

.mh-logotype-wordmark {
  font-family: var(--font-slab), Georgia, "Times New Roman", serif;
  font-weight: 700;
  font-size: var(--mh-logo-wordmark-size);
  letter-spacing: -0.01em;
  color: var(--ink);
  white-space: nowrap;
}

.mh-logotype:hover .mh-logotype-mark,
.mh-logotype:focus-visible .mh-logotype-mark {
  animation: mh-logo-pulse 600ms ease-out;
}

@keyframes mh-logo-pulse {
  0% {
    transform: rotate(-4deg) scale(1);
  }

  50% {
    transform: rotate(-4deg) scale(1.08);
  }

  100% {
    transform: rotate(-4deg) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mh-logotype:hover .mh-logotype-mark,
  .mh-logotype:focus-visible .mh-logotype-mark {
    animation: none;
  }
}
```

- [ ] **Step 2: Swap the logotype font in `apps/hype-check/app/layout.tsx`**

Change the import on line 2 from:

```ts
import { Inter, EB_Garamond } from "next/font/google";
```

to:

```ts
import { Inter, Zilla_Slab } from "next/font/google";
```

Change the `ebGaramond` loader (lines 19-25) from:

```ts
const ebGaramond = EB_Garamond({
  variable: "--font-logotype",
  subsets: ["latin"],
  weight: "600",
  style: "italic",
  display: "swap",
});
```

to:

```ts
const zillaSlab = Zilla_Slab({
  variable: "--font-slab",
  subsets: ["latin"],
  weight: "700",
  display: "swap",
});
```

Change the `<html>` className on line 85 from:

```tsx
className={`${inter.variable} ${ebGaramond.variable} h-full antialiased`}
```

to:

```tsx
className={`${inter.variable} ${zillaSlab.variable} h-full antialiased`}
```

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm --filter hype-check typecheck && pnpm --filter hype-check lint`
Expected: both pass with no errors (the `--font-logotype` variable is no longer referenced anywhere after this step — confirm with `grep -rn "font-logotype" apps/hype-check` returning nothing).

- [ ] **Step 4: Commit**

```bash
git add apps/hype-check/app/globals.css apps/hype-check/app/layout.tsx
git commit -m "Add Verdict Stamp Editorial color tokens and slab-serif font"
```

---

### Task 2: Rebuild the BrandLogotype component

**Files:**
- Modify: `apps/hype-check/components/ui/BrandLogotype.tsx` (full file replacement)

**Interfaces:**
- Consumes: CSS classes/tokens from Task 1 (`.mh-logotype`, `.mh-logotype-mark`, `.mh-logotype-mark-burst`, `.mh-logotype-mark-check`, `.mh-logotype-wordmark`, `--font-slab`).
- Produces: `BrandLogotype({ className?: string; size?: 'sm' | 'md' })` — same public API as before, so `SiteHeader.tsx` and `(public)/layout.tsx` need no prop-shape changes (only className tweaks around their usages, done in Tasks 7-8).

- [ ] **Step 1: Replace `apps/hype-check/components/ui/BrandLogotype.tsx` with the following**

```tsx
import type { CSSProperties } from 'react';

type BrandLogotypeSize = 'sm' | 'md';

interface BrandLogotypeProps {
  className?: string;
  size?: BrandLogotypeSize;
}

const SIZE_STYLES: Record<BrandLogotypeSize, CSSProperties> = {
  sm: {
    '--mh-logo-mark-size': '1.85rem',
    '--mh-logo-wordmark-size': '1.05rem',
  } as CSSProperties,
  md: {
    '--mh-logo-mark-size': '2.35rem',
    '--mh-logo-wordmark-size': '1.35rem',
  } as CSSProperties,
};

export function BrandLogotype({ className = '', size = 'md' }: BrandLogotypeProps) {
  return (
    <span
      className={`mh-logotype ${className}`.trim()}
      style={SIZE_STYLES[size]}
      aria-label="Hype Check"
    >
      <span className="mh-logotype-mark" aria-hidden="true">
        <svg viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M21 2l3.2 6.6 6.7-3.3-1.6 7.2 7.4 1-5.2 5.4 5.2 5.4-7.4 1 1.6 7.2-6.7-3.3L21 36l-3.2-6.8-6.7 3.3 1.6-7.2-7.4-1 5.2-5.4-5.2-5.4 7.4-1-1.6-7.2 6.7 3.3z"
            className="mh-logotype-mark-burst"
          />
          <path
            d="M14 21l5 5.5L29 14"
            className="mh-logotype-mark-check"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <span className="mh-logotype-wordmark" aria-hidden="true">
        Hype Check
      </span>
    </span>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm --filter hype-check typecheck && pnpm --filter hype-check lint`
Expected: both pass. (`useId` is no longer imported/used — if either command flags an unused import, double-check the file above doesn't still reference it.)

- [ ] **Step 3: Commit**

```bash
git add apps/hype-check/components/ui/BrandLogotype.tsx
git commit -m "Rebuild Hype Check logotype as a burst-badge stamp mark"
```

---

### Task 3: VerdictStamp component

**Files:**
- Create: `apps/hype-check/components/ui/VerdictStamp.tsx`
- Test: `apps/hype-check/__tests__/VerdictStamp.test.tsx`

**Interfaces:**
- Consumes: CSS tokens from Task 1 (`border-verdict-*`, `text-verdict-*`, `font-slab`).
- Produces: `export type VerdictType = 'LEGIT' | 'MISLEADING' | 'OVERPRICED' | 'RISKY' | 'SCAM'` and `VerdictStamp({ verdict: VerdictType | null | undefined })` — a component that renders `null` when `verdict` is falsy. Task 5 (`HypeVideoCard`) imports both the component and the type from this file.

- [ ] **Step 1: Write the failing test**

Create `apps/hype-check/__tests__/VerdictStamp.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VerdictStamp } from "@/components/ui/VerdictStamp";

describe("VerdictStamp", () => {
  it("renders nothing when there is no verdict", () => {
    const { container } = render(<VerdictStamp verdict={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when verdict is undefined", () => {
    const { container } = render(<VerdictStamp verdict={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the verdict label when a verdict is present", () => {
    render(<VerdictStamp verdict="LEGIT" />);
    expect(screen.getByText("LEGIT")).toBeInTheDocument();
  });

  it("renders every verdict type without throwing", () => {
    const verdicts = [
      "LEGIT",
      "MISLEADING",
      "OVERPRICED",
      "RISKY",
      "SCAM",
    ] as const;
    for (const verdict of verdicts) {
      const { unmount } = render(<VerdictStamp verdict={verdict} />);
      expect(screen.getByText(verdict)).toBeInTheDocument();
      unmount();
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter hype-check test -- VerdictStamp`
Expected: FAIL — `apps/hype-check/components/ui/VerdictStamp.tsx` doesn't exist yet.

- [ ] **Step 3: Create `apps/hype-check/components/ui/VerdictStamp.tsx`**

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

interface VerdictStampProps {
  verdict: VerdictType | null | undefined;
}

export function VerdictStamp({ verdict }: VerdictStampProps) {
  if (!verdict) return null;

  return (
    <span
      className={`inline-block rounded-sm border-[2.5px] px-2.5 py-0.5 font-slab text-xs font-black tracking-widest uppercase ${VERDICT_STYLES[verdict]}`}
    >
      {verdict}
    </span>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter hype-check test -- VerdictStamp`
Expected: PASS, 4 tests.

- [ ] **Step 5: Typecheck and lint**

Run: `pnpm --filter hype-check typecheck && pnpm --filter hype-check lint`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add apps/hype-check/components/ui/VerdictStamp.tsx apps/hype-check/__tests__/VerdictStamp.test.tsx
git commit -m "Add VerdictStamp component with fallback-to-null behavior"
```

---

### Task 4: Include the real verdict in the home page queries

**Files:**
- Modify: `apps/hype-check/lib/db/queries.ts:8-25` (`getFeaturedVideo`), `apps/hype-check/lib/db/queries.ts:29-50` (`_getTrendingVideosCached`)

**Interfaces:**
- Produces: `getFeaturedVideo()` and `getTrendingVideos()` results now include `verdict: Verdict | null` (Prisma's generated type, where `Verdict.verdict` is the 5-value `VerdictType`). Task 6 reads `result.verdict?.verdict` and passes it to `HypeVideoCard`/`VerdictStamp`.

- [ ] **Step 1: Add `verdict: true` to `getFeaturedVideo`'s include**

In `apps/hype-check/lib/db/queries.ts`, change:

```ts
      include: {
        sourceVideos: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: { summaries: { take: 1, orderBy: { createdAt: "desc" } } },
        },
        claims: { take: 1, orderBy: { riskLevel: "desc" } },
        topics: { include: { topic: true } },
      },
```

(inside `getFeaturedVideo`, first occurrence in the file) to:

```ts
      include: {
        sourceVideos: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: { summaries: { take: 1, orderBy: { createdAt: "desc" } } },
        },
        claims: { take: 1, orderBy: { riskLevel: "desc" } },
        topics: { include: { topic: true } },
        verdict: true,
      },
```

- [ ] **Step 2: Add `verdict: true` to `_getTrendingVideosCached`'s include**

Change:

```ts
      include: {
        channel: true,
        sourceVideos: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: { summaries: { take: 1, orderBy: { createdAt: "desc" } } },
        },
        topics: { include: { topic: true } },
      },
```

to:

```ts
      include: {
        channel: true,
        sourceVideos: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: { summaries: { take: 1, orderBy: { createdAt: "desc" } } },
        },
        topics: { include: { topic: true } },
        verdict: true,
      },
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: passes. (This step alone won't touch any consumer, so no type errors should surface yet — consumers are updated in Task 6.)

- [ ] **Step 4: Commit**

```bash
git add apps/hype-check/lib/db/queries.ts
git commit -m "Include verdict in featured/trending video queries"
```

---

### Task 5: HypeVideoCard component

**Files:**
- Create: `apps/hype-check/components/ui/HypeVideoCard.tsx`

**Interfaces:**
- Consumes: `VerdictStamp` and `VerdictType` from `./VerdictStamp` (Task 3), `EvidenceBadge`/`RiskBadge` from `@menhealth/ui` (unchanged, shared).
- Produces: `HypeVideoCard(props)` with the same prop shape as the shared `VideoCard` plus an added `verdict?: VerdictType | null`. Task 6 imports this to replace `VideoCard` on the home page.

- [ ] **Step 1: Create `apps/hype-check/components/ui/HypeVideoCard.tsx`**

```tsx
import Image from 'next/image';
import Link from 'next/link';
import { EvidenceBadge, RiskBadge } from '@menhealth/ui';
import { VerdictStamp, type VerdictType } from './VerdictStamp';

type HypeVideoCardProps = {
  slug: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  shortSummary: string | null;
  trendScore: number;
  topicNames: string[];
  riskLevel?: string;
  evidenceLabel?: string;
  verdict?: VerdictType | null;
  durationSeconds?: number;
  customSizes?: string;
  priority?: boolean;
};

export function HypeVideoCard({
  slug,
  title,
  channelTitle,
  thumbnailUrl,
  shortSummary,
  topicNames,
  riskLevel,
  evidenceLabel,
  verdict,
  durationSeconds,
  customSizes,
  priority,
}: HypeVideoCardProps) {
  const watchTimeMin = durationSeconds ? Math.ceil(durationSeconds / 60) : null;

  const sizes =
    customSizes ?? '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';

  return (
    <Link
      href={`/videos/${slug}`}
      className="group flex flex-col overflow-hidden rounded-md border border-hairline bg-surface transition-colors hover:border-ink"
    >
      {thumbnailUrl && (
        <div className="relative aspect-video w-full bg-hairline/40">
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover"
            sizes={sizes}
            priority={priority}
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {topicNames.slice(0, 2).map((name) => (
            <span
              key={name}
              className="rounded-full border border-hairline px-2 py-0.5 text-xs font-medium text-ink-muted"
            >
              {name}
            </span>
          ))}
          {riskLevel && riskLevel !== 'LOW' && <RiskBadge level={riskLevel} />}
        </div>
        {(verdict || evidenceLabel || watchTimeMin) && (
          <div className="flex flex-wrap items-center gap-1.5">
            <VerdictStamp verdict={verdict} />
            {!verdict && evidenceLabel && (
              <EvidenceBadge status={evidenceLabel} />
            )}
            {watchTimeMin && (
              <span className="text-xs text-ink-muted">
                {watchTimeMin} min watch
              </span>
            )}
          </div>
        )}
        <h3 className="line-clamp-2 font-slab text-base font-bold text-ink">
          {title}
        </h3>
        {shortSummary && (
          <p className="line-clamp-2 text-xs text-ink-muted">{shortSummary}</p>
        )}
        <p className="mt-auto text-xs text-ink-muted">{channelTitle}</p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm --filter hype-check typecheck && pnpm --filter hype-check lint`
Expected: both pass. This component isn't imported anywhere yet, so no other errors should surface.

- [ ] **Step 3: Commit**

```bash
git add apps/hype-check/components/ui/HypeVideoCard.tsx
git commit -m "Add hype-check-local HypeVideoCard (shared VideoCard stays untouched)"
```

---

### Task 6: Restyle the home page and wire in verdict stamps

**Files:**
- Modify: `apps/hype-check/app/(public)/page.tsx` (full file replacement)

**Interfaces:**
- Consumes: `HypeVideoCard` (Task 5), tokens/`font-slab` (Task 1), `verdict` field on query results (Task 4).

- [ ] **Step 1: Replace `apps/hype-check/app/(public)/page.tsx` with the following**

```tsx
import { EvidenceBadge, HowWeRateClaims, NewsletterSignupForm, RiskBadge } from "@menhealth/ui";
import { HypeVideoCard } from '@/components/ui/HypeVideoCard';
import { VerdictStamp } from '@/components/ui/VerdictStamp';
import { getFeaturedVideo, getTrendingVideos } from '@/lib/db/queries';
import { TOPIC_SEEDS } from '@/lib/youtube/topics';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: {
    absolute: "Hype Check — Legit, or Just Hype?",
  },
  description:
    "Evidence-based verdicts on trending products, courses, side hustles, and investment apps — legit, misleading, overpriced, risky, or scam.",
  openGraph: {
    title: "Hype Check — Legit, or Just Hype?",
    description:
      "Evidence-based verdicts on trending products, courses, side hustles, and investment apps.",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hype Check',
    description:
      "Evidence-based verdicts on trending products, courses, and side hustles — without the hype.",
  },
};

function deriveEvidenceLabel(
  score: number | null | undefined
): string | undefined {
  if (score == null) return undefined;
  if (score < 0.35) return 'WEAK';
  if (score < 0.6) return 'MIXED';
  if (score < 0.8) return 'MODERATE';
  return 'SUPPORTED';
}

const FEATURED_TOPIC_SLUGS = [
  'ai-tools',
  'side-hustles',
  'online-courses',
  'viral-products',
  'marketplaces',
  'investment-apps',
  'giveaways',
  'travel-hacks',
];

async function FeaturedInsight() {
  const featuredVideo = await getFeaturedVideo();
  if (!featuredVideo) return null;

  const featuredSummary = featuredVideo.sourceVideos[0]?.summaries[0] ?? null;
  const featuredClaim = featuredVideo.claims[0] ?? null;
  const featuredWatchMin = featuredVideo.durationSeconds
    ? Math.ceil(featuredVideo.durationSeconds / 60)
    : null;

  if (!featuredSummary) return null;

  return (
    <section className="bg-surface py-12">
      <div className="mx-auto max-w-[1120px] px-4">
        <p className="mb-5 text-sm font-semibold tracking-widest text-ink-muted uppercase">
          Today&apos;s top insight
        </p>
        <div className="rounded-md border border-hairline bg-paper p-6 sm:p-8">
          {featuredClaim && (
            <div className="mb-4">
              <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                The claim
              </p>
              <p className="mt-1 text-lg font-semibold text-ink">
                &ldquo;{featuredClaim.text}&rdquo;
              </p>
            </div>
          )}
          <div className="mb-5">
            <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
              Our take
            </p>
            <p className="mt-1 leading-relaxed text-ink">
              {featuredSummary.shortSummary}
            </p>
          </div>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {featuredVideo.verdict?.verdict ? (
              <VerdictStamp verdict={featuredVideo.verdict.verdict} />
            ) : (
              <>
                {featuredClaim && (
                  <EvidenceBadge status={featuredClaim.evidenceStatus} />
                )}
                <RiskBadge level={featuredVideo.riskLevel} />
              </>
            )}
            {featuredWatchMin && (
              <span className="text-xs text-ink-muted">
                {featuredWatchMin} min watch
              </span>
            )}
            <span className="text-xs text-ink-muted">~ 2 min read</span>
          </div>
          <Link
            href={`/videos/${featuredVideo.slug}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-ink underline decoration-hairline underline-offset-4 hover:decoration-ink"
          >
            Read the breakdown &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}

async function TrendingVideos() {
  const [featuredVideo, allVideos] = await Promise.all([
    getFeaturedVideo(),
    getTrendingVideos(),
  ]);
  const videos = allVideos.filter((v) => v.id !== featuredVideo?.id);

  return (
    <section id="trending" className="py-14">
      <div className="mx-auto max-w-[1120px] px-4">
        <h2 className="mb-6 font-slab text-2xl font-bold text-ink">
          Trending summaries
        </h2>
        {videos.length === 0 ? (
          <p className="text-ink-muted">
            No published summaries yet. Check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video, index) => (
              <HypeVideoCard
                key={video.id}
                slug={video.slug}
                title={video.editorialTitle ?? video.sourceVideos[0]?.title ?? video.name}
                channelTitle={video.channel?.title ?? ''}
                thumbnailUrl={video.thumbnailUrl}
                shortSummary={video.sourceVideos[0]?.summaries[0]?.shortSummary ?? null}
                trendScore={video.trendScore}
                topicNames={video.topics.map((vt) => vt.topic.name)}
                riskLevel={video.riskLevel}
                evidenceLabel={deriveEvidenceLabel(video.evidenceScore)}
                verdict={video.verdict?.verdict}
                durationSeconds={video.durationSeconds ?? undefined}
                priority={index === 0}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const featuredTopics = TOPIC_SEEDS.filter((t) =>
    FEATURED_TOPIC_SLUGS.includes(t.slug)
  );
  const remainingTopics = TOPIC_SEEDS.filter(
    (t) => !FEATURED_TOPIC_SLUGS.includes(t.slug)
  );

  return (
    <main>
      {/* Hero */}
      <section className="border-b border-hairline bg-paper py-16">
        <div className="mx-auto max-w-[1120px] px-4">
          <h1 className="max-w-2xl font-slab text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Trending products and side hustles,{' '}
            <span className="underline decoration-ink decoration-4 underline-offset-4">
              explained without the hype.
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-muted">
            We scan trending YouTube videos about products, courses, side
            hustles, and investment apps — then summarise the key claims and
            check them against available evidence.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/digest"
              className="rounded-sm bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-ink-muted"
            >
              Get the free digest
            </Link>
            <Link
              href="#trending"
              className="rounded-sm border border-hairline px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
            >
              Explore trending videos
            </Link>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-muted">
            <li>✓ Official YouTube embeds</li>
            <li>✓ AI-assisted summaries</li>
            <li>✓ Evidence-aware claim checks</li>
          </ul>
        </div>
      </section>

      <Suspense
        fallback={
          <div
            className="min-h-[420px] bg-surface py-12 lg:min-h-[358px]"
            aria-hidden
          />
        }
      >
        <FeaturedInsight />
      </Suspense>

      {/* Topic cards */}
      <section id="topics" className="py-14">
        <div className="mx-auto min-h-[652px] max-w-[1120px] px-4 lg:min-h-[354px]">
          <h2 className="mb-6 font-slab text-2xl font-bold text-ink">
            Browse by topic
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {featuredTopics.map((topic) => (
              <Link
                key={topic.slug}
                href={`/topics/${topic.slug}`}
                className="group rounded-md border border-hairline bg-surface p-4 transition-colors hover:border-ink"
              >
                <p className="font-semibold text-ink">
                  {topic.name}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-snug text-ink-muted">
                  {topic.description}
                </p>
                <p className="mt-3 text-xs font-medium text-ink underline decoration-hairline underline-offset-2 group-hover:decoration-ink">
                  Explore →
                </p>
              </Link>
            ))}
          </div>
          {remainingTopics.length > 0 && (
            <p className="mt-4 text-sm text-ink-muted">
              More topics:{' '}
              {remainingTopics.map((t, i) => (
                <span key={t.slug}>
                  <Link
                    href={`/topics/${t.slug}`}
                    className="text-ink underline decoration-hairline hover:decoration-ink"
                  >
                    {t.name}
                  </Link>
                  {i < remainingTopics.length - 1 && ', '}
                </span>
              ))}
            </p>
          )}
        </div>
      </section>

      <Suspense
        fallback={
          <div className="py-14">
            <div className="mx-auto max-w-[1120px] px-4">
              <div className="mb-6 h-8 w-48 animate-pulse rounded bg-hairline/40" />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-64 animate-pulse rounded-md bg-hairline/20"
                  />
                ))}
              </div>
            </div>
          </div>
        }
      >
        <TrendingVideos />
      </Suspense>

      {/* Newsletter */}
      <section className="bg-surface py-16">
        <div className="mx-auto max-w-lg px-4 text-center">
          <h2 className="font-slab text-2xl font-bold text-ink">
            Get the 5-minute Hype Check Digest
          </h2>
          <p className="mt-2 text-sm text-ink-muted">Every week:</p>
          <ul className="mt-2 space-y-0.5 text-sm text-ink-muted">
            <li>5 trending videos summarised</li>
            <li>3 claims checked</li>
            <li>1 practical takeaway</li>
            <li>No get-rich-quick nonsense</li>
          </ul>
          <div className="mt-6">
            <NewsletterSignupForm />
          </div>
        </div>
      </section>

      {/* How we rate claims */}
      <HowWeRateClaims />
    </main>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm --filter hype-check typecheck && pnpm --filter hype-check lint`
Expected: both pass. Pay attention to `video.verdict?.verdict` and
`featuredVideo.verdict?.verdict` — if Prisma's generated `VerdictType` and
this app's local `VerdictType` (from `VerdictStamp.tsx`) don't line up,
typecheck will fail here first.

- [ ] **Step 3: Run the full test suite**

Run: `pnpm --filter hype-check test`
Expected: all existing tests plus `VerdictStamp.test.tsx` pass.

- [ ] **Step 4: Manually verify in the browser**

Run: `pnpm --filter hype-check dev`
Visit `http://localhost:3000` and confirm:
- Hero, featured insight, topic cards, trending grid, and newsletter section all use the cream/ink palette (no leftover indigo/gray-50/slate-50 classes visible)
- Cards in the trending grid show either a colored verdict stamp or the existing evidence/risk badges (verdict stamps require a subject that's been through admin review — check `/admin/videos` to confirm at least one subject has a verdict to see this rendered)
- Dark mode: toggle your OS to dark mode (or use browser devtools' "prefers-color-scheme: dark" emulation) and confirm the page switches to the dark ink/cream-text variant, not left inverted oddly

- [ ] **Step 5: Commit**

```bash
git add "apps/hype-check/app/(public)/page.tsx"
git commit -m "Restyle home page to Verdict Stamp Editorial and surface real verdicts"
```

---

### Task 7: Restyle SiteHeader

**Files:**
- Modify: `apps/hype-check/components/ui/SiteHeader.tsx` (full file replacement)

**Interfaces:**
- Consumes: tokens from Task 1, rebuilt `BrandLogotype` from Task 2 (no prop changes needed — same `size="sm" | "md"` API).

- [ ] **Step 1: Replace `apps/hype-check/components/ui/SiteHeader.tsx` with the following**

```tsx
'use client';

import { BrandLogotype } from '@/components/ui/BrandLogotype';
import { premium } from '@/lib/flags/feature-flags';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type SessionUser = {
  name?: string | null;
  email?: string | null;
  isPremium?: boolean;
};

interface SiteHeaderProps {
  user?: SessionUser;
}

const navLinks = [
  {
    href: '/topics',
    label: 'Topics',
    className:
      'font-semibold text-ink underline decoration-transparent decoration-2 underline-offset-4 hover:decoration-hairline',
  },
  {
    href: '/rankings',
    label: 'Rankings',
    className:
      'font-semibold text-ink underline decoration-transparent decoration-2 underline-offset-4 hover:decoration-hairline',
  },
  {
    href: '/creators',
    label: 'Creators',
    className:
      'font-semibold text-ink underline decoration-transparent decoration-2 underline-offset-4 hover:decoration-hairline',
  },
  {
    href: '/weekly',
    label: 'Weekly',
    className:
      'font-semibold text-ink underline decoration-transparent decoration-2 underline-offset-4 hover:decoration-hairline',
  },
  {
    href: '/how-we-rate-evidence',
    label: 'How It Works',
    className:
      'font-semibold text-ink underline decoration-transparent decoration-2 underline-offset-4 hover:decoration-hairline',
  },
  {
    href: '/newsletter',
    label: 'Newsletter',
    className: 'rounded-sm bg-ink px-3 py-1.5 font-semibold text-paper hover:bg-ink-muted',
  },
];

function HamburgerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

const TRANSITION_MS = 300;

function useDrawer() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const open = () => setMounted(true);
  const close = () => {
    setVisible(false);
    setTimeout(() => setMounted(false), TRANSITION_MS);
  };

  useEffect(() => {
    if (!mounted) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [mounted]);

  return { mounted, visible, open, close };
}

export function SiteHeader({ user }: SiteHeaderProps) {
  const nav = useDrawer();

  // Convenience aliases kept for readability
  const mounted = nav.mounted;
  const visible = nav.visible;
  const openDrawer = nav.open;
  const closeDrawer = nav.close;

  // Lock body scroll while either drawer is open
  useEffect(() => {
    document.body.style.overflow = nav.mounted ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [nav.mounted]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-hairline bg-paper/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-280 items-center justify-between px-4 py-2 lg:py-4">
          <Link
            href="/"
            className="rounded-md focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:outline-none"
          >
            <BrandLogotype size="md" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-5 text-sm md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={link.className}>
                {link.label}
              </Link>
            ))}
            {user ? (
              <Link
                href="/account"
                className="rounded-sm border border-hairline px-3 py-1.5 text-ink hover:bg-surface"
              >
                {user.name ?? user.email ?? 'Account'}
              </Link>
            ) : (
              <Link
                href="/signin"
                className="text-ink-muted hover:text-ink"
              >
                Sign in
              </Link>
            )}
            {!user?.isPremium && premium?.isEnabled() && (
              <Link
                href="/upgrade"
                className="rounded-sm bg-ink px-3 py-1.5 font-semibold text-paper hover:bg-ink-muted"
              >
                Go premium
              </Link>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={openDrawer}
            className="flex items-center justify-center rounded-md p-2 text-ink-muted hover:bg-surface hover:text-ink md:hidden"
            aria-label="Open menu"
          >
            <HamburgerIcon />
          </button>
        </div>
      </header>

      {/* ── Drawer ── stays mounted during exit transition ── */}
      {mounted && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeDrawer}
            aria-hidden="true"
            className={[
              'fixed inset-0 z-40 bg-black/60 transition-opacity md:hidden',
              `duration-[${TRANSITION_MS}ms]`,
              visible ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          />

          {/* Drawer panel — full height, 85 vw up to 360 px */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className={[
              'fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-90 flex-col border-l border-hairline bg-paper md:hidden',
              `transition-transform duration-[${TRANSITION_MS}ms] ease-in-out`,
              visible ? 'translate-x-0' : 'translate-x-full',
            ].join(' ')}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-5">
              <Link
                href="/"
                onClick={closeDrawer}
                className="rounded-md focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:outline-none"
              >
                <BrandLogotype size="sm" />
              </Link>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-sm p-2 text-ink-muted hover:bg-surface hover:text-ink"
                aria-label="Close menu"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mx-6 border-t border-hairline" />

            {/* Nav links */}
            <nav className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeDrawer}
                  className="group flex items-center justify-between rounded-md px-4 py-4 text-lg font-medium text-ink transition-colors hover:bg-surface active:bg-hairline/40"
                >
                  {link.label}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-hairline transition-transform group-hover:translate-x-0.5 group-hover:text-ink-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              ))}

              <div className="mx-2 my-3 border-t border-hairline" />

              {user ? (
                <Link
                  href="/account"
                  onClick={closeDrawer}
                  className="group flex items-center justify-between rounded-md px-4 py-4 text-lg font-medium text-ink transition-colors hover:bg-surface active:bg-hairline/40"
                >
                  {user.name ?? user.email ?? 'Account'}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-hairline transition-transform group-hover:translate-x-0.5 group-hover:text-ink-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              ) : (
                <Link
                  href="/signin"
                  onClick={closeDrawer}
                  className="group flex items-center justify-between rounded-md px-4 py-4 text-lg font-medium text-ink transition-colors hover:bg-surface active:bg-hairline/40"
                >
                  Sign in
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-hairline transition-transform group-hover:translate-x-0.5 group-hover:text-ink-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              )}
            </nav>

            {/* CTA pinned to bottom */}
            {!user?.isPremium && premium?.isEnabled() && (
              <div className="px-5 pt-3 pb-8">
                <Link
                  href="/upgrade"
                  onClick={closeDrawer}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-ink px-5 py-4 text-base font-semibold text-paper transition-colors hover:bg-ink-muted active:bg-ink-muted"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 3l14 9-14 9V3z"
                    />
                  </svg>
                  Go premium
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm --filter hype-check typecheck && pnpm --filter hype-check lint`
Expected: both pass.

- [ ] **Step 3: Manually verify in the browser**

With `pnpm --filter hype-check dev` running, confirm: the header background, borders, nav link underline-on-hover, and the mobile drawer all use the cream/ink palette; the hamburger/close icons and chevrons are visible in both light and dark OS modes.

- [ ] **Step 4: Commit**

```bash
git add apps/hype-check/components/ui/SiteHeader.tsx
git commit -m "Restyle SiteHeader to Verdict Stamp Editorial palette"
```

---

### Task 8: Restyle the public footer

**Files:**
- Modify: `apps/hype-check/app/(public)/layout.tsx` (full file replacement)

**Interfaces:**
- Consumes: tokens from Task 1, rebuilt `BrandLogotype` from Task 2, restyled `SiteHeader` from Task 7.

- [ ] **Step 1: Replace `apps/hype-check/app/(public)/layout.tsx` with the following**

```tsx
import { BrandLogotype } from '@/components/ui/BrandLogotype';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import { Suspense } from 'react';

type SessionUser = {
  name?: string | null;
  email?: string | null;
  isPremium?: boolean;
};

const FOOTER_TOPICS = [
  { slug: 'ai-tools', name: 'AI Tools' },
  { slug: 'side-hustles', name: 'Side Hustles' },
  { slug: 'online-courses', name: 'Online Courses' },
  { slug: 'viral-products', name: 'Viral Products' },
  { slug: 'investment-apps', name: 'Investment Apps' },
  { slug: 'giveaways', name: 'Giveaways' },
];

async function AuthedHeader() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  return <SiteHeader user={user} />;
}

function HeaderShell() {
  return <SiteHeader user={undefined} />;
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Suspense fallback={<HeaderShell />}>
        <AuthedHeader />
      </Suspense>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-hairline bg-surface">
        <div className="mx-auto max-w-280 px-4 py-12">
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <Link
                href="/"
                className="inline-flex rounded-md focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:outline-none"
              >
                <BrandLogotype size="md" />
              </Link>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Evidence-based verdicts on trending products, courses, and
                side hustles — without the hype.
              </p>
              <ul className="mt-4 space-y-1 text-xs text-ink-muted">
                <li>✓ Educational content only. Not financial advice.</li>
                <li>✓ We do not host or restream YouTube videos.</li>
                <li>✓ Affiliate links are clearly disclosed.</li>
              </ul>
            </div>

            {/* About links */}
            <div>
              <h3 className="text-sm font-semibold text-ink">About</h3>
              <ul className="mt-3 space-y-2 text-sm text-ink-muted">
                <li>
                  <Link href="/about" className="hover:text-ink">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/how-we-rate-evidence"
                    className="hover:text-ink"
                  >
                    How We Rate Evidence
                  </Link>
                </li>
                <li>
                  <Link href="/glossary" className="hover:text-ink">
                    Glossary
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-ink">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link
                    href="/editorial-process"
                    className="hover:text-ink"
                  >
                    Editorial Process
                  </Link>
                </li>
                <li>
                  <Link
                    href="/disclaimer"
                    className="hover:text-ink"
                  >
                    Disclaimer
                  </Link>
                </li>
                <li>
                  <Link
                    href="/affiliate-disclosure"
                    className="hover:text-ink"
                  >
                    Affiliate Disclosure
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-ink">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-ink">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Top topics */}
            <div>
              <h3 className="text-sm font-semibold text-ink">
                <Link href="/topics" className="hover:text-ink-muted">
                  Top Topics
                </Link>
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-ink-muted">
                {FOOTER_TOPICS.map((topic) => (
                  <li key={topic.slug}>
                    <Link
                      href={`/topics/${topic.slug}`}
                      className="hover:text-ink"
                    >
                      {topic.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/topics"
                    className="font-medium text-ink underline decoration-hairline hover:decoration-ink"
                  >
                    View all topics →
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-6 text-xs text-ink-muted">
            <p>
              © {new Date().getFullYear()} Hype Check. All rights
              reserved.
            </p>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-ink">
                Privacy
              </Link>
              <Link href="/contact" className="hover:text-ink">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm --filter hype-check typecheck && pnpm --filter hype-check lint`
Expected: both pass.

- [ ] **Step 3: Run the full test suite one more time**

Run: `pnpm --filter hype-check test`
Expected: all tests pass — this is the last file in the plan, so this is the final confirmation the whole redesign is consistent.

- [ ] **Step 4: Manually verify in the browser**

With `pnpm --filter hype-check dev` running, scroll to the footer on the home page and any other public page (e.g. `/topics`) and confirm the footer uses the cream/ink palette and the new logotype, in both light and dark OS modes.

- [ ] **Step 5: Commit**

```bash
git add "apps/hype-check/app/(public)/layout.tsx"
git commit -m "Restyle public footer to Verdict Stamp Editorial palette"
```

---

## Done criteria

- `pnpm --filter hype-check typecheck`, `pnpm --filter hype-check lint`, and `pnpm --filter hype-check test` all pass.
- The home page, header, and footer render in the cream/ink palette in both light and dark OS modes, with no leftover `indigo`/`slate`/`gray` Tailwind color classes in the touched files (`grep -rn "indigo\|slate-50" apps/hype-check/components/ui/BrandLogotype.tsx apps/hype-check/components/ui/SiteHeader.tsx "apps/hype-check/app/(public)/layout.tsx" "apps/hype-check/app/(public)/page.tsx"` returns nothing).
- At least one trending card or the featured insight shows a real colored verdict stamp when a reviewed subject is available; everything else falls back to the existing evidence/risk badges exactly as before.
- `packages/ui/**` has zero diffs — confirm with `git diff --stat main -- packages/ui` before merging.
