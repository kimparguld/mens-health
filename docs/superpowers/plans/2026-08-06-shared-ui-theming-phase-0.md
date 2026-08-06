# Shared UI + Generic Theming — Phase 0 (Pilot) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the shared-UI/token pattern end-to-end on a small slice of already-duplicated code — `BrandLogotype`, `SiteHeader`, `NewsletterSignupForm`, `HowWeRateClaims` — before committing to the full migration described in the design doc.

**Architecture:** Both apps already map their brand values onto CSS custom properties via Tailwind v4's `@theme inline` in `app/globals.css`. This phase adds a small set of new *role*-named tokens (`--color-bg-surface`, `--color-text-primary`, `--color-status-strong`, …) to both apps' `globals.css`, each app pointing the role at its own existing value (or a Tailwind-generated palette variable, never a hand-typed hex). Components in `packages/ui` are rewritten to reference only these token classes — never a raw Tailwind palette class, never a `site` prop. Per-app differences that are genuinely structural (nav link lists, drawer chrome, logo artwork) become props/slots, not forks.

**Tech Stack:** Next.js App Router, Tailwind v4 (`@theme inline`), `tailwind-merge`, ESLint 9 flat config, pnpm/Turborepo workspace (`apps/menhealth`, `apps/hype-check`, `packages/ui`).

## Global Constraints

- Both apps must look **exactly as they do today** after this phase, with the specific, disclosed exceptions listed in "Known Visual Deltas" below — these are the only intentional pixel changes in this plan.
- No raw Tailwind palette color class (`bg-emerald-600`, `text-gray-900`, `border-amber-100`, etc. — any utility of the form `{prefix}-{colorname}-{shade}` where colorname is a default Tailwind hue) may appear inside `packages/ui/src/**` after this phase, for the four files this phase touches. `white`, `black`, and existing app-specific custom-property classes (`ink`, `paper`, `hairline`, `surface`, `verdict-*`) are not raw palette classes and remain allowed anywhere.
- Every new CSS custom property value must alias an *existing* app custom property or a Tailwind-generated default-palette variable (`var(--color-emerald-100)`, etc.) — never a hand-typed hex. This guarantees pixel parity without visual verification of the hex math.
- No `site?: string` (or similar) prop may exist on a `packages/ui` component after this phase for the four components touched.
- Never download/rehost YouTube videos, never expose server env vars to client components, never bypass the health-content disclaimer — none of this phase's work touches those areas, but the rule stands per `AGENTS.md`.
- This repo has no visual regression tooling (confirmed absent: no Playwright/Storybook/Chromatic). Verification per task is `pnpm typecheck` + `pnpm lint` (scoped as described in Task 6) + running both dev servers and comparing the touched page(s) against current `main` in a browser. Task 7 is a full-repo pass of this.

## Known Visual Deltas (disclosed up front — confirm these are acceptable during Task 7's visual QA, not a bug to silently "fix" back)

1. **hype-check: `bg-surface` and `text-ink-muted` classes sitewide** currently render as near-black (mis-mapped to `--color-gray-900`) instead of the intended cream/dark-brown values. Task 1 fixes the mapping. This is a pre-existing bug fix (already tracked as known behavior), not a regression — it will visibly change the hype-check homepage's two `bg-surface` band sections and footer from near-black to cream, and sitewide `text-ink-muted` text from cool near-black to warm near-black-brown (subtle).
2. **menhealth: the newsletter "Subscribe" button** (`NewsletterSignupForm`) changes from literal `bg-gray-900 hover:bg-gray-700` (dark neutral gray, inconsistent with the rest of the site) to `bg-accent hover:opacity-80` (the site's emerald accent, consistent with every other CTA button on menhealth, e.g. `SiteHeader`'s "Newsletter" and "Go premium" buttons). This is a one-button color change, disclosed here for reviewer sign-off.
3. **menhealth: `HowWeRateClaims`' section background** shifts from `bg-gray-50` (`#f9fafb`, cool light gray) to `bg-bg-muted` → `var(--surface-alt)` (`#eef2f1`, very close, imperceptible in practice). **hype-check:** same section shifts from `bg-gray-50` to `bg-bg-muted` → `var(--surface)` (`#fbf9f4`, warm cream — a bit more visible, brings this section in line with the rest of hype-check's palette instead of an off-brand cool gray).
4. **menhealth: the mobile drawer's "Go premium" button `:active` state** goes from a distinct darker shade (`active:bg-emerald-800`) to the same shade as `:hover` (`active:bg-accent-strong`, ≈ `emerald-700`) — there's no existing token for a third, darker accent shade, and this state is only visible for the instant a touch/click is held down. Not expected to be noticeable; flagged for completeness. (This button is unreachable in practice today since `premium.isEnabled()` returns `false` in both apps — see Task 7 Step 4.)

If any of these are unacceptable, stop after Task 1/3/4 respectively and get sign-off before continuing — don't silently revert them, since reverting means keeping the raw-palette class the ESLint rule (Task 6) is specifically designed to catch.

---

## Task 1: Establish the shared token vocabulary in both apps' `globals.css`

**Files:**
- Modify: `apps/menhealth/app/globals.css`
- Modify: `apps/hype-check/app/globals.css`

**Interfaces:**
- Produces: the `--color-*` custom properties every later task consumes: `--color-bg-page`, `--color-bg-surface`, `--color-bg-muted`, `--color-bg-emphasis` (hype-check only), `--color-text-primary`, `--color-text-muted`, `--color-text-on-emphasis` (hype-check only), `--color-accent`, `--color-success-bg`, `--color-success-text`, `--color-status-strong`, `--color-status-strong-soft` (menhealth only), `--color-status-moderate`(-soft), `--color-status-mixed`(-soft), `--color-status-weak`(-soft), `--color-status-unsupported`(-soft), `--color-status-none`(-soft). Existing tokens (`--color-hairline`, `--color-accent-strong` on menhealth) are unchanged and reused as-is.

- [ ] **Step 1: Add the new tokens to menhealth's `@theme inline` block**

Edit `apps/menhealth/app/globals.css`. Replace the `@theme inline { ... }` block (lines 14-24) with:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-text-muted: var(--text-muted);
  --color-text-subtle: var(--text-subtle);
  --color-surface-alt: var(--surface-alt);
  --color-hairline: var(--hairline);
  --color-accent: var(--accent);
  --color-accent-strong: var(--accent-strong);
  --font-sans: var(--font-inter);

  /* Shared UI token contract — see docs/superpowers/specs/2026-08-06-shared-ui-theming-design.md */
  --color-bg-page: var(--background);
  --color-bg-surface: white;
  --color-bg-muted: var(--surface-alt);
  --color-text-primary: var(--foreground);
  --color-success-bg: var(--color-green-50);
  --color-success-text: var(--color-green-800);
  --color-status-strong: var(--color-emerald-800);
  --color-status-strong-soft: var(--color-emerald-100);
  --color-status-moderate: var(--color-teal-800);
  --color-status-moderate-soft: var(--color-teal-100);
  --color-status-mixed: var(--color-amber-800);
  --color-status-mixed-soft: var(--color-amber-100);
  --color-status-weak: var(--color-orange-800);
  --color-status-weak-soft: var(--color-orange-100);
  --color-status-unsupported: var(--color-red-800);
  --color-status-unsupported-soft: var(--color-red-100);
  --color-status-none: var(--color-gray-600);
  --color-status-none-soft: var(--color-gray-100);
}
```

(`--color-text-muted` already existed and is reused for the new `text-muted` role — no duplicate needed.)

- [ ] **Step 2: Fix hype-check's two mis-mapped tokens and add the new tokens**

Edit `apps/hype-check/app/globals.css`. Replace the `@theme inline { ... }` block (lines 17-31) with:

```css
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

  /* Shared UI token contract — see docs/superpowers/specs/2026-08-06-shared-ui-theming-design.md */
  --color-bg-page: var(--paper);
  --color-bg-surface: white;
  --color-bg-muted: var(--surface);
  --color-bg-emphasis: var(--ink-muted);
  --color-text-primary: var(--ink-muted);
  --color-text-muted: var(--ink-muted);
  --color-text-on-emphasis: white;
  --color-accent: var(--ink);
  --color-success-bg: white;
  --color-success-text: var(--ink);
  --color-status-strong: var(--verdict-legit);
  --color-status-moderate: var(--verdict-legit);
  --color-status-mixed: var(--verdict-misleading);
  --color-status-weak: var(--verdict-overpriced);
  --color-status-unsupported: var(--verdict-scam);
  --color-status-none: var(--ink-muted);
}
```

Note the two bug fixes: `--color-surface: var(--surface)` (was `var(--color-gray-900)`) and `--color-ink-muted: var(--ink-muted)` (was `var(--color-gray-900)`) — see "Known Visual Deltas" #1 above.

- [ ] **Step 3: Verify both apps still typecheck and the CSS is valid**

Run: `pnpm --filter menhealth typecheck && pnpm --filter hype-check typecheck`
Expected: both pass with no new errors (this step only touches CSS, so this mainly guards against a typo breaking the build pipeline).

Run: `pnpm --filter menhealth dev` (in one terminal) and `pnpm --filter hype-check dev` (in another), open both homepages in a browser.
Expected on hype-check: the homepage's two large `bg-surface` band sections and the footer now render cream (`#fbf9f4`), not near-black. This is the intended Known Visual Delta #1 — confirm it looks right, not broken.
Expected on menhealth: no visible change yet (this task only adds new unused tokens; nothing consumes them until Tasks 2-5).

- [ ] **Step 4: Commit**

```bash
git add apps/menhealth/app/globals.css apps/hype-check/app/globals.css
git commit -m "Add shared UI token vocabulary; fix hype-check's mis-mapped surface/ink-muted tokens"
```

---

## Task 2: Migrate `BrandLogotype` into `packages/ui` as a slot-based shell

The two apps' `BrandLogotype` components have completely different SVG artwork and wordmark markup (menhealth: gradient-filled shield mark + two-line stacked wordmark; hype-check: starburst-and-checkmark mark + single-line wordmark) — per the design doc's classification rule, this is genuine structural difference, not a styling fork. The shared piece is the outer wrapper (span structure, `aria-label` wiring, className/style plumbing); the artwork stays app-owned via `mark`/`wordmark` slot props.

**Files:**
- Create: `packages/ui/src/ui/BrandLogotype.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `apps/menhealth/components/ui/BrandLogotype.tsx`
- Modify: `apps/hype-check/components/ui/BrandLogotype.tsx`

**Interfaces:**
- Produces: `BrandLogotype({ className?, style?, ariaLabel, mark, wordmark }): JSX.Element` exported from `@menhealth/ui`, where `mark: ReactNode`, `wordmark: ReactNode`.

- [ ] **Step 1: Create the shared shell**

Write `packages/ui/src/ui/BrandLogotype.tsx`:

```tsx
import type { CSSProperties, ReactNode } from 'react';

export interface BrandLogotypeProps {
  className?: string;
  style?: CSSProperties;
  ariaLabel: string;
  mark: ReactNode;
  wordmark: ReactNode;
}

export function BrandLogotype({ className = '', style, ariaLabel, mark, wordmark }: BrandLogotypeProps) {
  return (
    <span className={`mh-logotype ${className}`.trim()} style={style} aria-label={ariaLabel}>
      <span className="mh-logotype-mark" aria-hidden="true">
        {mark}
      </span>
      <span className="mh-logotype-wordmark" aria-hidden="true">
        {wordmark}
      </span>
    </span>
  );
}
```

- [ ] **Step 2: Export it from the package index**

Edit `packages/ui/src/index.ts`, add near the other `ui/` exports (alphabetically, after `AffiliateDisclosure`):

```ts
export { AffiliateDisclosure } from './ui/AffiliateDisclosure';
export { BrandLogotype } from './ui/BrandLogotype';
export type { BrandLogotypeProps } from './ui/BrandLogotype';
export { Disclaimer } from './ui/Disclaimer';
```

- [ ] **Step 3: Rewrite menhealth's wrapper to delegate to the shared shell**

Write `apps/menhealth/components/ui/BrandLogotype.tsx` (replacing the whole file):

```tsx
import { BrandLogotype as SharedBrandLogotype } from '@menhealth/ui';
import { useId, type CSSProperties } from 'react';

type BrandLogotypeSize = 'sm' | 'md';

interface BrandLogotypeProps {
  className?: string;
  size?: BrandLogotypeSize;
}

const SIZE_STYLES: Record<BrandLogotypeSize, CSSProperties> = {
  sm: {
    '--mh-logo-mark-size': '2rem',
    '--mh-logo-wordmark-height': '2rem',
    '--mh-logo-top-size': '0.58rem',
    '--mh-logo-bottom-size': '1.06rem',
  } as CSSProperties,
  md: {
    '--mh-logo-mark-size': '2.45rem',
    '--mh-logo-wordmark-height': '2.45rem',
    '--mh-logo-top-size': '0.66rem',
    '--mh-logo-bottom-size': '1.2rem',
  } as CSSProperties,
};

export function BrandLogotype({ className, size = 'md' }: BrandLogotypeProps) {
  const gradientId = useId();

  return (
    <SharedBrandLogotype
      className={className}
      style={SIZE_STYLES[size]}
      ariaLabel="MenHealth Digest"
      mark={
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={gradientId} x1="6" y1="8" x2="58" y2="60" gradientUnits="userSpaceOnUse">
              <stop stopColor="#14b8a6" />
              <stop offset="1" stopColor="#047857" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="16"
            className="mh-logotype-mark-bg"
            style={{ fill: `url(#${gradientId})` }}
          />
          <path
            d="M11 37H21L26 28L33 42L38 34H53"
            className="mh-logotype-mark-wave"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M32 14L44 20V32C44 40 38.4 47.1 32 49.5C25.6 47.1 20 40 20 32V20L32 14Z"
            className="mh-logotype-mark-shield"
          />
        </svg>
      }
      wordmark={
        <>
          <span className="mh-logotype-top">MENHEALTH</span>
          <span className="mh-logotype-bottom">Digest</span>
        </>
      }
    />
  );
}
```

- [ ] **Step 4: Rewrite hype-check's wrapper to delegate to the shared shell**

Write `apps/hype-check/components/ui/BrandLogotype.tsx` (replacing the whole file):

```tsx
import { BrandLogotype as SharedBrandLogotype } from '@menhealth/ui';
import type { CSSProperties } from 'react';

type BrandLogotypeSize = 'sm' | 'md' | 'lg';

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
  lg: {
    '--mh-logo-mark-size': '3.35rem',
    '--mh-logo-wordmark-size': '1.85rem',
  } as CSSProperties,
};

export function BrandLogotype({ className, size = 'md' }: BrandLogotypeProps) {
  return (
    <SharedBrandLogotype
      className={className}
      style={SIZE_STYLES[size]}
      ariaLabel="Hype Check"
      mark={
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
      }
      wordmark="Hype Check"
    />
  );
}
```

- [ ] **Step 5: Typecheck and visually verify**

Run: `pnpm --filter menhealth typecheck && pnpm --filter hype-check typecheck && pnpm --filter @menhealth/ui typecheck`
Expected: all pass.

In the browser (dev servers from Task 1 Step 3), check the header logo, the mobile drawer logo, and the admin sidebar logo (`app/admin/(protected)/layout.tsx` uses `BrandLogotype` too, unchanged call site) on both apps.
Expected: pixel-identical to `main` — this task is a pure structural refactor with zero token substitution, so there should be no visual delta at all.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/ui/BrandLogotype.tsx packages/ui/src/index.ts apps/menhealth/components/ui/BrandLogotype.tsx apps/hype-check/components/ui/BrandLogotype.tsx
git commit -m "Migrate BrandLogotype into packages/ui as a slot-based shared shell"
```

---

## Task 3: Rewrite `NewsletterSignupForm` to drop the `site` prop and consume tokens

**Files:**
- Modify: `packages/ui/src/ui/NewsletterSignupForm.tsx`
- Modify: `apps/menhealth/app/(public)/newsletter/page.tsx` (no `site` prop to remove — already prop-less; only affected by the token-driven color change, no code edit needed)
- Modify: `apps/hype-check/app/(public)/page.tsx`
- Modify: `apps/hype-check/app/(public)/videos/[slug]/page.tsx`
- Modify: `apps/hype-check/app/(public)/newsletter/page.tsx`
- Modify: `apps/hype-check/app/(public)/newsletter/[slug]/page.tsx`

**Interfaces:**
- Consumes: `--color-bg-surface`, `--color-text-primary`, `--color-accent`, `--color-success-bg`, `--color-success-text` from Task 1.
- Produces: `NewsletterSignupForm({ compact?, className? })` — same as before minus the `site` prop.

- [ ] **Step 1: Rewrite the component**

Write `packages/ui/src/ui/NewsletterSignupForm.tsx` (replacing the whole file):

```tsx
'use client';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

type Status = 'idle' | 'loading' | 'success' | 'error';

type Props = {
  /** Compact layout: single-row with smaller input for sticky banners */
  compact?: boolean;
  className?: string;
};

export function NewsletterSignupForm({ compact = false, className }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');

    const res = await fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = (await res.json()) as {
      ok?: boolean;
      alreadySubscribed?: boolean;
      error?: string;
    };

    if (!res.ok || !data.ok) {
      setStatus('error');
      setMessage(data.error ?? 'Something went wrong. Please try again.');
      return;
    }

    setStatus('success');
    setMessage(
      data.alreadySubscribed ? "You're already subscribed!" : "You're in! Check your inbox for the next digest.",
    );
    setEmail('');
  }

  if (status === 'success') {
    return <p className="bg-success-bg text-success-text rounded-lg px-4 py-3 text-base">{message}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className={twMerge('flex flex-row gap-2 items-center', className)}>
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        disabled={status === 'loading'}
        className={twMerge(
          'bg-bg-surface border-text-primary text-text-primary focus:border-text-primary focus:ring-text-primary flex-1 rounded-lg border px-4 py-2.5 text-sm focus:ring-1 focus:outline-none disabled:opacity-50',
          compact ? 'rounded px-2 py-1.5 text-xs' : '',
        )}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className={twMerge(
          'bg-accent rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-50',
          compact ? 'rounded px-3 py-1.5 text-xs' : '',
        )}
      >
        {status === 'loading' ? '…' : 'Subscribe'}
      </button>
      {status === 'error' && <p className="w-full text-xs text-red-600">{message}</p>}
    </form>
  );
}
```

(`text-red-600` for the error message is intentionally left as-is: it's a small, generic error-text color used identically by both apps today with no site branching, and out of the four components' documented token roles — leave it for a later phase rather than inventing a new token for one line. Note it in Task 6 if the lint rule flags it — if so, alias it the same way as the other tokens, e.g. `--color-error-text: var(--color-red-600)` in both `globals.css`.)

- [ ] **Step 2: Remove the `site="hype-check"` prop at all 5 hype-check call sites**

Edit `apps/hype-check/app/(public)/page.tsx` line 306:
```tsx
<NewsletterSignupForm site="hype-check" />
```
→
```tsx
<NewsletterSignupForm />
```

Edit `apps/hype-check/app/(public)/videos/[slug]/page.tsx` line 611: same change.

Edit `apps/hype-check/app/(public)/newsletter/page.tsx` line 177: same change.

Edit `apps/hype-check/app/(public)/newsletter/page.tsx` around line 61 (the `compact`/`className` call): remove the `site="hype-check"` line from the multi-line JSX call, leaving `className="flex-col items-stretch"` as the only prop.

Edit `apps/hype-check/app/(public)/newsletter/[slug]/page.tsx` line 71: same change as the first.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @menhealth/ui typecheck && pnpm --filter menhealth typecheck && pnpm --filter hype-check typecheck`
Expected: all pass. If `site` is still referenced anywhere, TypeScript will error since the prop no longer exists — that's the safety net confirming every call site was updated.

- [ ] **Step 4: Visually verify**

In the browser, check every page listed in Step 2 plus menhealth's `/newsletter` and `/newsletter/[slug]` pages (unchanged call sites, but new token-driven styling).
Expected on menhealth: the Subscribe button is now emerald instead of dark gray (Known Visual Delta #2) — everything else identical.
Expected on hype-check: input border/focus ring same near-black-brown tone as before (via `--color-text-primary` = `var(--ink-muted)`), Subscribe button same rust-brown `--ink` color, success message unchanged (`bg-white text-ink` → now `bg-success-bg text-success-text`, same values).

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/ui/NewsletterSignupForm.tsx apps/hype-check/app/\(public\)/page.tsx apps/hype-check/app/\(public\)/videos/\[slug\]/page.tsx apps/hype-check/app/\(public\)/newsletter/page.tsx apps/hype-check/app/\(public\)/newsletter/\[slug\]/page.tsx
git commit -m "Remove site prop from NewsletterSignupForm; consume shared tokens instead"
```

---

## Task 4: Rewrite `HowWeRateClaims` to drop the `site` prop and consume status tokens

**Files:**
- Modify: `packages/ui/src/ui/HowWeRateClaims.tsx`
- Modify: `packages/ui/src/index.ts`
- Create: `apps/menhealth/lib/ui/evidenceRatingBadgeClassName.ts`
- Create: `apps/hype-check/lib/ui/evidenceRatingBadgeClassName.ts`
- Modify: `apps/menhealth/app/(public)/page.tsx`
- Modify: `apps/menhealth/app/(public)/how-we-rate-evidence/page.tsx`
- Modify: `apps/hype-check/app/(public)/page.tsx`
- Modify: `apps/hype-check/app/(public)/how-we-rate-evidence/page.tsx`

**Interfaces:**
- Consumes: `--color-bg-muted`, `--color-bg-surface`, `--color-text-primary`, `--color-text-muted`, `--color-status-*` (and `-soft` variants where defined) from Task 1.
- Produces: `type EvidenceRatingKey = 'strong' | 'moderate' | 'mixed' | 'weak' | 'unsupported' | 'none'` and `HowWeRateClaims({ badgeClassName: (key: EvidenceRatingKey) => string })`, both exported from `@menhealth/ui`. Each app's `evidenceRatingBadgeClassName(key: EvidenceRatingKey): string` (from its new `lib/ui/evidenceRatingBadgeClassName.ts`) is the function passed in.

- [ ] **Step 1: Rewrite the shared component**

Write `packages/ui/src/ui/HowWeRateClaims.tsx` (replacing the whole file):

```tsx
export type EvidenceRatingKey = 'strong' | 'moderate' | 'mixed' | 'weak' | 'unsupported' | 'none';

const RATINGS: { key: EvidenceRatingKey; label: string; description: string }[] = [
  {
    key: 'strong',
    label: 'Strong evidence',
    description: 'Supported by multiple high-quality human studies or clinical guidelines.',
  },
  {
    key: 'moderate',
    label: 'Moderate evidence',
    description: 'Supported, but still context-dependent or limited to certain populations.',
  },
  {
    key: 'mixed',
    label: 'Mixed / early',
    description: 'Promising but uncertain. Results vary across studies or populations.',
  },
  {
    key: 'weak',
    label: 'Weak evidence',
    description: 'Mostly anecdotal, small studies, animal studies, or influencer claims.',
  },
  {
    key: 'unsupported',
    label: 'Not supported',
    description: 'Contradicted by existing evidence or scientifically implausible.',
  },
  {
    key: 'none',
    label: 'Not reviewed',
    description: 'We have not yet reviewed the claims in this video.',
  },
];

type Props = {
  badgeClassName: (key: EvidenceRatingKey) => string;
};

export function HowWeRateClaims({ badgeClassName }: Props) {
  return (
    <section className="border-hairline bg-bg-muted border-t py-14">
      <div className="mx-auto max-w-[1120px] px-4">
        <h2 className="text-text-primary mb-2 text-2xl font-bold">How our evidence labels work</h2>
        <p className="text-text-muted mb-8">Every claim we review gets one of five evidence ratings.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RATINGS.map(({ key, label, description }) => (
            <div key={key} className="border-hairline bg-bg-surface rounded-md border p-4">
              <span className={badgeClassName(key)}>{label}</span>
              <p className="text-text-muted mt-3 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Export the new type from the package index**

Edit `packages/ui/src/index.ts`:
```ts
export { HowWeRateClaims } from './ui/HowWeRateClaims';
export type { EvidenceRatingKey } from './ui/HowWeRateClaims';
```

- [ ] **Step 3: Create menhealth's badge-class helper (pill style)**

Write `apps/menhealth/lib/ui/evidenceRatingBadgeClassName.ts`:

```ts
import type { EvidenceRatingKey } from '@menhealth/ui';
import { twMerge } from 'tailwind-merge';

const BASE = 'inline-block rounded-full px-2.5 py-0.5 text-sm font-medium';

const COLOR_CLASS: Record<EvidenceRatingKey, string> = {
  strong: 'bg-status-strong-soft text-status-strong',
  moderate: 'bg-status-moderate-soft text-status-moderate',
  mixed: 'bg-status-mixed-soft text-status-mixed',
  weak: 'bg-status-weak-soft text-status-weak',
  unsupported: 'bg-status-unsupported-soft text-status-unsupported',
  none: 'bg-status-none-soft text-status-none',
};

export function evidenceRatingBadgeClassName(key: EvidenceRatingKey): string {
  return twMerge(BASE, COLOR_CLASS[key]);
}
```

- [ ] **Step 4: Create hype-check's badge-class helper (outline badge style)**

Write `apps/hype-check/lib/ui/evidenceRatingBadgeClassName.ts`:

```ts
import type { EvidenceRatingKey } from '@menhealth/ui';
import { twMerge } from 'tailwind-merge';

const BASE =
  'inline-block rounded-sm border-[1.5px] px-2.5 py-0.5 font-slab text-sm font-bold tracking-wide uppercase';

const COLOR_CLASS: Record<EvidenceRatingKey, string> = {
  strong: 'border-status-strong text-status-strong rotate-1',
  moderate: 'border-status-strong text-status-strong rotate-1',
  mixed: 'border-status-mixed text-status-mixed rotate-1',
  weak: 'border-status-weak text-status-weak -rotate-1',
  unsupported: 'border-status-unsupported text-status-unsupported -rotate-1',
  none: 'border-ink-muted/40 text-ink-muted/60',
};

export function evidenceRatingBadgeClassName(key: EvidenceRatingKey): string {
  return twMerge(BASE, COLOR_CLASS[key]);
}
```

(`none` keeps the existing `ink-muted`-based classes literally — `ink-muted` isn't a raw palette color, and there's no dedicated "muted status" token needed for one already-neutral case.)

- [ ] **Step 5: Update menhealth's two call sites**

Edit `apps/menhealth/app/(public)/page.tsx`:
- Line 1: add `evidenceRatingBadgeClassName` is a local import, not from `@menhealth/ui` — add a new import line: `import { evidenceRatingBadgeClassName } from '@/lib/ui/evidenceRatingBadgeClassName';`
- Line 293: `<HowWeRateClaims />` → `<HowWeRateClaims badgeClassName={evidenceRatingBadgeClassName} />`

Edit `apps/menhealth/app/(public)/how-we-rate-evidence/page.tsx`:
- Add import: `import { evidenceRatingBadgeClassName } from '@/lib/ui/evidenceRatingBadgeClassName';`
- Line 107: `<HowWeRateClaims />` → `<HowWeRateClaims badgeClassName={evidenceRatingBadgeClassName} />`

- [ ] **Step 6: Update hype-check's two call sites**

Edit `apps/hype-check/app/(public)/page.tsx`:
- Add import: `import { evidenceRatingBadgeClassName } from '@/lib/ui/evidenceRatingBadgeClassName';`
- Line 312: `<HowWeRateClaims site="hype-check" />` → `<HowWeRateClaims badgeClassName={evidenceRatingBadgeClassName} />`

Edit `apps/hype-check/app/(public)/how-we-rate-evidence/page.tsx`:
- Add import: `import { evidenceRatingBadgeClassName } from '@/lib/ui/evidenceRatingBadgeClassName';`
- Line 107: `<HowWeRateClaims site="hype-check" />` → `<HowWeRateClaims badgeClassName={evidenceRatingBadgeClassName} />`

- [ ] **Step 7: Typecheck**

Run: `pnpm --filter @menhealth/ui typecheck && pnpm --filter menhealth typecheck && pnpm --filter hype-check typecheck`
Expected: all pass. `badgeClassName` is a required prop with no default — TypeScript will error at any call site that still omits it, confirming full coverage.

- [ ] **Step 8: Visually verify**

Check `/` and `/how-we-rate-evidence` on both apps.
Expected: same six pills/badges, same relative colors (strong=green-family, mixed=amber-family, weak=orange-family, unsupported=red-family, none=neutral), same pill-vs-outline-badge shape per app. Section background shifts per Known Visual Delta #3.

- [ ] **Step 9: Commit**

```bash
git add packages/ui/src/ui/HowWeRateClaims.tsx packages/ui/src/index.ts apps/menhealth/lib/ui/evidenceRatingBadgeClassName.ts apps/hype-check/lib/ui/evidenceRatingBadgeClassName.ts apps/menhealth/app/\(public\)/page.tsx "apps/menhealth/app/(public)/how-we-rate-evidence/page.tsx" apps/hype-check/app/\(public\)/page.tsx "apps/hype-check/app/(public)/how-we-rate-evidence/page.tsx"
git commit -m "Remove site prop from HowWeRateClaims; drive badge styling via per-app token classes"
```

---

## Task 5: Migrate `SiteHeader` into `packages/ui` as a prop-driven shared shell

This is the largest task. The two `SiteHeader`s share ~90% of their logic (drawer open/close state machine, transition timing, body-scroll lock, SVG icons, ARIA wiring) but differ in nav link lists, several className strings (some driven by tokens, a few — header opacity, drawer shadow-vs-border — by genuine per-site chrome choices), and how the `premium` feature flag is read (each app currently imports its own `@/lib/flags/feature-flags`, a path alias `packages/ui` cannot resolve). The shared component takes `premiumEnabled: boolean` as a prop instead.

**Files:**
- Create: `packages/ui/src/ui/SiteHeader.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `apps/menhealth/components/ui/SiteHeader.tsx`
- Modify: `apps/hype-check/components/ui/SiteHeader.tsx`
- Modify: `apps/menhealth/app/(public)/layout.tsx`
- Modify: `apps/hype-check/app/(public)/layout.tsx`

**Interfaces:**
- Consumes: `--color-bg-surface`, `--color-bg-page`, `--color-bg-emphasis`, `--color-text-on-emphasis`, `--color-accent` from Task 1; `BrandLogotype` from Task 2 (each app's own wrapper, passed in as `desktopLogo`/`drawerLogo`).
- Produces (exported from `@menhealth/ui`): `SiteHeader`, `SiteHeaderProps`, `SiteHeaderNavLink`, `SiteHeaderClassNames`, `SiteHeaderUser`.

- [ ] **Step 1: Create the shared component**

Write `packages/ui/src/ui/SiteHeader.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { Fragment, useEffect, useState, type ReactNode } from 'react';

export interface SiteHeaderUser {
  name?: string | null;
  email?: string | null;
  isPremium?: boolean;
}

export interface SiteHeaderNavLink {
  href: string;
  label: string;
  desktopClassName: string;
  mobileClassName: string;
  /** Render a hairline divider immediately before this link in the mobile drawer. */
  dividerBefore?: boolean;
}

export interface SiteHeaderClassNames {
  header: string;
  logoLink: string;
  hamburgerButton: string;
  drawerPanel: string;
  drawerNav: string;
  closeButton: string;
  accountLink: string;
  signInLink: string;
  premiumCta: string;
  mobileAccountLink: string;
  mobileSignInLink: string;
  mobilePremiumCta: string;
  navLinkChevron: string;
  accountChevron: string;
  signInChevron: string;
}

export interface SiteHeaderProps {
  user?: SiteHeaderUser;
  premiumEnabled: boolean;
  navLinks: SiteHeaderNavLink[];
  desktopLogo: ReactNode;
  drawerLogo: ReactNode;
  classNames: SiteHeaderClassNames;
}

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
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronIcon({ className }: { className: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
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

export function SiteHeader({ user, premiumEnabled, navLinks, desktopLogo, drawerLogo, classNames }: SiteHeaderProps) {
  const nav = useDrawer();
  const mounted = nav.mounted;
  const visible = nav.visible;
  const openDrawer = nav.open;
  const closeDrawer = nav.close;

  useEffect(() => {
    document.body.style.overflow = nav.mounted ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [nav.mounted]);

  return (
    <>
      <header className={classNames.header}>
        <div className="mx-auto flex max-w-280 items-center justify-between px-4 py-2 lg:py-4">
          <Link href="/" className={classNames.logoLink}>
            {desktopLogo}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-5 text-sm md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={link.desktopClassName}>
                {link.label}
              </Link>
            ))}
            {premiumEnabled && (
              <>
                {user ? (
                  <Link href="/account" className={classNames.accountLink}>
                    {user.name ?? user.email ?? 'Account'}
                  </Link>
                ) : (
                  <Link href="/signin" className={classNames.signInLink}>
                    Sign in
                  </Link>
                )}
                {!user?.isPremium && (
                  <Link href="/upgrade" className={classNames.premiumCta}>
                    Go premium
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button type="button" onClick={openDrawer} className={classNames.hamburgerButton} aria-label="Open menu">
            <HamburgerIcon />
          </button>
        </div>
      </header>

      {/* ── Drawer ── stays mounted during exit transition ── */}
      {mounted && (
        <>
          <div
            onClick={closeDrawer}
            aria-hidden="true"
            className={[
              'fixed inset-0 z-40 bg-black/60 transition-opacity md:hidden',
              `duration-[${TRANSITION_MS}ms]`,
              visible ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className={[
              classNames.drawerPanel,
              `transition-transform duration-[${TRANSITION_MS}ms] ease-in-out`,
              visible ? 'translate-x-0' : 'translate-x-full',
            ].join(' ')}
          >
            <div className="flex items-center justify-between px-6 py-5">
              <Link href="/" onClick={closeDrawer} className={classNames.logoLink}>
                {drawerLogo}
              </Link>
              <button type="button" onClick={closeDrawer} className={classNames.closeButton} aria-label="Close menu">
                <CloseIcon />
              </button>
            </div>

            <div className="mx-6 border-hairline border-t" />

            <nav className={classNames.drawerNav}>
              {navLinks.map((link) => (
                <Fragment key={link.href}>
                  {link.dividerBefore && <div className="border-hairline -mx-4 mt-3 mb-6 border-t" />}
                  <Link href={link.href} onClick={closeDrawer} className={link.mobileClassName}>
                    {link.label}
                    <ChevronIcon className={classNames.navLinkChevron} />
                  </Link>
                </Fragment>
              ))}

              {premiumEnabled && (
                <>
                  {user ? (
                    <Link href="/account" onClick={closeDrawer} className={classNames.mobileAccountLink}>
                      {user.name ?? user.email ?? 'Account'}
                      <ChevronIcon className={classNames.accountChevron} />
                    </Link>
                  ) : (
                    <Link href="/signin" onClick={closeDrawer} className={classNames.mobileSignInLink}>
                      Sign in
                      <ChevronIcon className={classNames.signInChevron} />
                    </Link>
                  )}
                </>
              )}
            </nav>

            {!user?.isPremium && premiumEnabled && (
              <div className="px-5 pt-3 pb-8">
                <Link href="/upgrade" onClick={closeDrawer} className={classNames.mobilePremiumCta}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
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

- [ ] **Step 2: Export from the package index**

Edit `packages/ui/src/index.ts`:
```ts
export { SiteHeader } from './ui/SiteHeader';
export type { SiteHeaderClassNames, SiteHeaderNavLink, SiteHeaderProps, SiteHeaderUser } from './ui/SiteHeader';
```

- [ ] **Step 3: Rewrite menhealth's wrapper**

Write `apps/menhealth/components/ui/SiteHeader.tsx` (replacing the whole file):

```tsx
import { BrandLogotype } from '@/components/ui/BrandLogotype';
import { premium } from '@/lib/flags/feature-flags';
import {
  SiteHeader as SharedSiteHeader,
  type SiteHeaderClassNames,
  type SiteHeaderNavLink,
  type SiteHeaderUser,
} from '@menhealth/ui';

interface SiteHeaderProps {
  user?: SiteHeaderUser;
}

const NAV_LINK_CLASS = 'font-semibold text-gray-800 hover:text-accent-strong';
const MOBILE_LINK_CLASS =
  'group flex items-center justify-between rounded-xl px-4 py-4 text-lg font-medium text-gray-800 transition-colors hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100';

const NAV_LINKS: SiteHeaderNavLink[] = [
  { href: '/topics', label: 'Topics', desktopClassName: NAV_LINK_CLASS, mobileClassName: MOBILE_LINK_CLASS },
  { href: '/rankings', label: 'Rankings', desktopClassName: NAV_LINK_CLASS, mobileClassName: MOBILE_LINK_CLASS },
  { href: '/creators', label: 'Creators', desktopClassName: NAV_LINK_CLASS, mobileClassName: MOBILE_LINK_CLASS },
  { href: '/weekly', label: 'Weekly', desktopClassName: NAV_LINK_CLASS, mobileClassName: MOBILE_LINK_CLASS },
  {
    href: '/how-we-rate-evidence',
    label: 'How It Works',
    desktopClassName: NAV_LINK_CLASS,
    mobileClassName: MOBILE_LINK_CLASS,
  },
  {
    href: '/newsletter',
    label: 'Newsletter',
    desktopClassName: 'rounded-lg bg-accent px-3 py-1.5 font-semibold text-white hover:bg-accent-strong',
    mobileClassName: MOBILE_LINK_CLASS,
  },
];

const CLASS_NAMES: SiteHeaderClassNames = {
  header: 'border-hairline sticky top-0 z-30 border-b bg-bg-surface/80 backdrop-blur-sm',
  logoLink: 'rounded-md focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none',
  hamburgerButton:
    'flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 md:hidden',
  drawerPanel: 'bg-bg-surface fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-90 flex-col shadow-2xl md:hidden',
  drawerNav: 'flex flex-1 flex-col overflow-y-auto px-4 py-4',
  closeButton: 'rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  accountLink: 'rounded-lg border border-gray-200 px-3 py-1.5 text-gray-700 hover:bg-gray-50',
  signInLink: 'text-gray-600 hover:text-gray-900',
  premiumCta: 'rounded-lg bg-accent px-3 py-1.5 font-semibold text-white hover:bg-accent-strong',
  mobileAccountLink: MOBILE_LINK_CLASS,
  mobileSignInLink: MOBILE_LINK_CLASS,
  mobilePremiumCta:
    'flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-accent-strong active:bg-accent-strong',
  navLinkChevron: 'h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-700',
  accountChevron: 'h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-700',
  signInChevron: 'h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-700',
};

export function SiteHeader({ user }: SiteHeaderProps) {
  return (
    <SharedSiteHeader
      user={user}
      premiumEnabled={premium?.isEnabled() ?? false}
      navLinks={NAV_LINKS}
      desktopLogo={<BrandLogotype size="md" />}
      drawerLogo={<BrandLogotype size="sm" />}
      classNames={CLASS_NAMES}
    />
  );
}
```

- [ ] **Step 4: Rewrite hype-check's wrapper**

Write `apps/hype-check/components/ui/SiteHeader.tsx` (replacing the whole file):

```tsx
import { BrandLogotype } from '@/components/ui/BrandLogotype';
import { premium } from '@/lib/flags/feature-flags';
import {
  SiteHeader as SharedSiteHeader,
  type SiteHeaderClassNames,
  type SiteHeaderNavLink,
  type SiteHeaderUser,
} from '@menhealth/ui';
import { twMerge } from 'tailwind-merge';

interface SiteHeaderProps {
  user?: SiteHeaderUser;
}

const NAV_LINK_CLASS =
  'font-semibold text-text-on-emphasis underline decoration-transparent decoration-2 underline-offset-4 hover:decoration-ink';
const MOBILE_LINK_CLASS =
  'group text-text-muted hover:bg-surface active:bg-hairline/40 flex items-center justify-between rounded-md px-4 py-4 text-lg font-medium transition-colors';

const NEWSLETTER_MOBILE_CLASS = twMerge(MOBILE_LINK_CLASS, 'bg-accent text-white hover:bg-accent/80 py-3');

const NAV_LINKS: SiteHeaderNavLink[] = [
  {
    href: '/topics',
    label: 'Topics',
    desktopClassName: twMerge(NAV_LINK_CLASS, 'underline-offset-6'),
    mobileClassName: MOBILE_LINK_CLASS,
  },
  { href: '/rankings', label: 'Rankings', desktopClassName: NAV_LINK_CLASS, mobileClassName: MOBILE_LINK_CLASS },
  { href: '/weekly', label: 'Weekly', desktopClassName: NAV_LINK_CLASS, mobileClassName: MOBILE_LINK_CLASS },
  {
    href: '/how-we-rate-evidence',
    label: 'How It Works',
    desktopClassName: NAV_LINK_CLASS,
    mobileClassName: MOBILE_LINK_CLASS,
  },
  {
    href: '/newsletter',
    label: 'Newsletter',
    desktopClassName: 'rounded-sm bg-accent px-3 py-1.5 font-semibold text-paper hover:bg-accent/80',
    mobileClassName: NEWSLETTER_MOBILE_CLASS,
    dividerBefore: true,
  },
];

const CLASS_NAMES: SiteHeaderClassNames = {
  header: 'border-hairline bg-bg-emphasis sticky top-0 z-30 border-b backdrop-blur-sm',
  logoLink: 'focus-visible:ring-accent/40 rounded-md focus-visible:ring-2 focus-visible:outline-none',
  hamburgerButton: 'hover:bg-surface hover:text-ink flex items-center justify-center rounded-md p-2 text-text-on-emphasis md:hidden',
  drawerPanel: 'border-hairline bg-bg-page fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-90 flex-col border-l md:hidden',
  drawerNav: 'flex flex-1 flex-col overflow-y-auto bg-white px-4 py-4',
  closeButton: 'text-text-muted hover:bg-surface hover:text-ink rounded-sm p-2',
  accountLink: 'hover:decoration-ink font-semibold text-white/60 underline decoration-transparent decoration-2 underline-offset-4',
  signInLink: 'text-text-muted hover:text-ink',
  premiumCta: 'bg-accent text-paper hover:bg-ink-muted rounded-sm px-3 py-1.5 font-semibold',
  mobileAccountLink: MOBILE_LINK_CLASS.replace('text-text-muted', 'text-text-muted/80'),
  mobileSignInLink: MOBILE_LINK_CLASS.replace('text-text-muted', 'text-ink'),
  mobilePremiumCta:
    'bg-accent text-paper hover:bg-ink-muted active:bg-ink-muted flex w-full items-center justify-center gap-2 rounded-md px-5 py-4 text-base font-semibold transition-colors',
  navLinkChevron: 'h-4 w-4 transition-transform group-hover:translate-x-0.5',
  accountChevron: 'text-ink-muted/80 group-hover:text-ink-muted h-4 w-4 transition-transform group-hover:translate-x-0.5',
  signInChevron: 'text-hairline group-hover:text-ink-muted h-4 w-4 transition-transform group-hover:translate-x-0.5',
};

export function SiteHeader({ user }: SiteHeaderProps) {
  return (
    <SharedSiteHeader
      user={user}
      premiumEnabled={premium?.isEnabled() ?? false}
      navLinks={NAV_LINKS}
      desktopLogo={<BrandLogotype size="md" />}
      drawerLogo={<BrandLogotype size="md" />}
      classNames={CLASS_NAMES}
    />
  );
}
```

- [ ] **Step 5: Thread `premiumEnabled` is already self-contained per wrapper — confirm both `(public)/layout.tsx` files need no changes**

Both `apps/menhealth/app/(public)/layout.tsx` and `apps/hype-check/app/(public)/layout.tsx` call `<SiteHeader user={...} />` with no other props — since the per-app wrapper (Steps 3-4) now computes `premiumEnabled` internally from its own `@/lib/flags/feature-flags`, no layout.tsx edit is required. Confirm by re-reading both files: the only `SiteHeader` usages are the `AuthedHeader`/`HeaderShell` functions already present, unchanged.

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @menhealth/ui typecheck && pnpm --filter menhealth typecheck && pnpm --filter hype-check typecheck`
Expected: all pass.

- [ ] **Step 7: Visually verify — this is the highest-risk task in Phase 0, check thoroughly**

On both apps, in the browser:
- Desktop header: logo, nav links (including hover states), sign-in/account/premium CTA area (currently invisible on both since `premium.isEnabled()` returns `false` in both apps' `lib/flags/feature-flags.ts` today — confirm this is still the case, i.e. no premium UI renders, matching current behavior).
- Mobile (resize below `md` breakpoint): hamburger button + hover state, open the drawer, confirm the backdrop, slide-in transition, logo, close button, all nav links including hover/active states, the divider before "Newsletter" on hype-check (not present on menhealth), footer premium CTA area (should not render, same as desktop).
- hype-check specifically: confirm the header is no longer near-black-on-black-text (the old `bg-ink-muted` was already correct pre-fix since it used the literal token name, not `bg-surface` — the bug fix from Task 1 affects the *hamburger hover* (`hover:bg-surface`) and *drawer/close-button hover* states, which should now show a visible cream highlight instead of appearing invisible against the near-black bug value).

If anything doesn't match, this is where to iterate on the `CLASS_NAMES` objects in Step 3/4 before moving on — don't proceed to Task 6 with a known visual mismatch.

- [ ] **Step 8: Commit**

```bash
git add packages/ui/src/ui/SiteHeader.tsx packages/ui/src/index.ts apps/menhealth/components/ui/SiteHeader.tsx apps/hype-check/components/ui/SiteHeader.tsx
git commit -m "Migrate SiteHeader into packages/ui as a prop-driven shared shell"
```

---

## Task 6: Land the raw-palette-color ESLint rule, scoped to this phase's migrated files

**Design note (deviation from the spec doc):** the design doc says the rule should be "referenced from both apps' existing per-app `eslint.config.mjs`." During planning this was tested directly: ESLint 9's flat config refuses to lint any file outside the invoking process's cwd ("File ignored because outside of base path"), and running an app's full Next-aware config against `packages/ui/src` from a shifted cwd surfaces ~2,400 pre-existing, unrelated lint errors across files this phase never touches (that package has never been linted before). Both make "reference it from the apps' configs" impractical as literally worded. Instead, `packages/ui` gets its own minimal `eslint.config.mjs` + `lint` script — picked up automatically by `turbo run lint` like any other workspace package — scoped by an explicit file allowlist (not a wildcard over all of `packages/ui/src`, since most files there still have pre-existing raw-palette violations out of this phase's scope; see Task 6 Step 1's comment for the list of what Phase 1+ needs to add as it migrates more files). Both apps' configs get a one-line comment pointing here.

**Files:**
- Create: `packages/ui/eslint.config.mjs`
- Modify: `packages/ui/package.json`
- Modify: `apps/menhealth/eslint.config.mjs`
- Modify: `apps/hype-check/eslint.config.mjs`

**Interfaces:**
- Produces: a `no-restricted-syntax` ESLint rule flagging any `Literal` or `TemplateElement` matching `-(colorname)-\d{2,3}\b` for a default-Tailwind-hue `colorname`, scoped to the four files this phase migrated.

- [ ] **Step 1: Create the packages/ui ESLint config**

Write `packages/ui/eslint.config.mjs`:

```js
import { defineConfig } from 'eslint/config';
import tsParser from '@typescript-eslint/parser';

const RAW_PALETTE_HUES = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
].join('|');

const RAW_PALETTE_PATTERN = `-(${RAW_PALETTE_HUES})-[0-9]{2,3}\\b`;

// Files migrated to the shared token contract so far (see
// docs/superpowers/specs/2026-08-06-shared-ui-theming-design.md). Widen this
// list as later phases migrate more of packages/ui/src — do not switch it to
// a blanket 'src/**/*.tsx' glob until every file in the package is migrated
// (Phase 4), or this rule will fail on pre-existing, out-of-scope debt.
const TOKENIZED_FILES = [
  'src/ui/BrandLogotype.tsx',
  'src/ui/NewsletterSignupForm.tsx',
  'src/ui/HowWeRateClaims.tsx',
  'src/ui/SiteHeader.tsx',
];

export default defineConfig([
  {
    files: TOKENIZED_FILES,
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=/${RAW_PALETTE_PATTERN}/]`,
          message:
            'Raw Tailwind palette color classes are banned in this file. Use a --color-* token class (see the shared UI token contract in both apps\' globals.css) instead.',
        },
        {
          selector: `TemplateElement[value.raw=/${RAW_PALETTE_PATTERN}/]`,
          message:
            'Raw Tailwind palette color classes are banned in this file. Use a --color-* token class (see the shared UI token contract in both apps\' globals.css) instead.',
        },
      ],
    },
  },
]);
```

- [ ] **Step 2: Add the lint script and new devDependencies to packages/ui**

Edit `packages/ui/package.json`. Add `"lint": "eslint ."` to `scripts`, and add to `devDependencies`:

```json
  "devDependencies": {
    "@types/react": "^19",
    "@typescript-eslint/parser": "^8",
    "eslint": "^9",
    "typescript": "^5"
  },
```

Run: `pnpm install`
Expected: resolves and installs the two new devDependencies with no version conflicts (both already exist at these major versions elsewhere in the workspace).

- [ ] **Step 3: Add a documentation pointer in both apps' configs**

Edit `apps/menhealth/eslint.config.mjs`, add as the first line of the file (before the imports):

```js
// The packages/ui/src raw-Tailwind-palette-color ban lives in packages/ui/eslint.config.mjs
// (its own turbo-run lint target) — ESLint 9 flat config cannot lint files outside an
// invocation's cwd, so it isn't run from here. See
// docs/superpowers/specs/2026-08-06-shared-ui-theming-design.md.
```

Make the identical edit to `apps/hype-check/eslint.config.mjs`.

- [ ] **Step 4: Run the new lint target and confirm it's clean**

Run: `pnpm --filter @menhealth/ui lint`
Expected: exits 0, no errors — Tasks 2-5 already tokenized all four files.

- [ ] **Step 5: Confirm the rule actually catches a violation (regression test for the rule itself)**

Temporarily add `<div className="bg-emerald-600" />` inside the return statement of `packages/ui/src/ui/BrandLogotype.tsx`, run `pnpm --filter @menhealth/ui lint` again.
Expected: FAIL with the `no-restricted-syntax` message from Step 1.
Then revert the temporary edit (`git checkout -- packages/ui/src/ui/BrandLogotype.tsx`) and re-run `pnpm --filter @menhealth/ui lint` to confirm it's clean again.

- [ ] **Step 6: Run `turbo run lint` from the repo root to confirm the new package-level task is picked up**

Run: `pnpm lint` (repo root — runs `turbo run lint` across all workspace packages)
Expected: `@menhealth/ui#lint` appears in turbo's task list and passes, alongside the existing `menhealth#lint` and `hype-check#lint` tasks (which remain unaffected — they don't reference `packages/ui/src` and were not modified).

- [ ] **Step 7: Commit**

```bash
git add packages/ui/eslint.config.mjs packages/ui/package.json pnpm-lock.yaml apps/menhealth/eslint.config.mjs apps/hype-check/eslint.config.mjs
git commit -m "Add raw-palette-color ESLint rule for packages/ui, scoped to Phase 0's migrated files"
```

---

## Task 7: Full-repo verification and final visual pass

**Files:** none (verification only).

- [ ] **Step 1: Full typecheck and lint across the workspace**

Run: `pnpm typecheck && pnpm lint`
Expected: both exit 0 across every workspace package (`menhealth`, `hype-check`, `@menhealth/ui`, and the untouched `core-*`/`site-kit` packages).

- [ ] **Step 2: Full-repo grep for any remaining `site="hype-check"` or `site?:` on the four migrated components**

Run: `grep -rn 'site="hype-check"' apps/ --include="*.tsx" | grep -E "NewsletterSignupForm|HowWeRateClaims"`
Expected: no output (all call sites updated in Tasks 3-4).

Run: `grep -n "site" packages/ui/src/ui/NewsletterSignupForm.tsx packages/ui/src/ui/HowWeRateClaims.tsx packages/ui/src/ui/BrandLogotype.tsx packages/ui/src/ui/SiteHeader.tsx`
Expected: no output (no `site` prop remains in any of the four migrated components).

- [ ] **Step 3: Manual visual QA pass on both dev servers**

Run `pnpm --filter menhealth dev` and `pnpm --filter hype-check dev` side by side. For each app, check every page that renders one of the four migrated components at both a desktop and mobile viewport width:
- `/` (homepage — header, footer logo, newsletter section, how-we-rate-evidence section)
- `/how-we-rate-evidence`
- `/newsletter` and `/newsletter/[slug]` (any published slug)
- hype-check only: `/videos/[slug]` (any published slug)
- Any `app/admin/(protected)/*` page (BrandLogotype in the sidebar — same wrapper, should be unaffected but confirm)

Confirm every page matches `main` except for the three items in "Known Visual Deltas" at the top of this plan. Take note of anything else that looks off and fix it in the relevant `CLASS_NAMES`/`COLOR_CLASS` object before considering Phase 0 done — per the design doc's own verification strategy, any unlisted visual difference found here is a bug, not something to defer.

- [ ] **Step 4: Confirm no regressions in premium-gated UI**

Both apps' `premium.isEnabled()` currently hardcodes `false`. Grep to confirm this is unchanged (out of scope for this plan): `grep -n "isEnabled" apps/menhealth/lib/flags/feature-flags.ts apps/hype-check/lib/flags/feature-flags.ts` should still show `return false;`. This means the account/sign-in/premium-CTA branches in `SiteHeader` render nothing in either app today — if this flag is ever flipped to `true` before Phase 1, re-run the Task 5 Step 7 visual checklist against that branch specifically, since it wasn't exercisable during this plan's authoring.

- [ ] **Step 5: Final summary commit (only if Steps 1-4 turned up follow-up fixes not yet committed)**

If Step 3 required any `CLASS_NAMES`/`COLOR_CLASS` adjustments, commit them now with a message describing what was visually wrong and how it was fixed. If nothing needed fixing, there's nothing to commit here — Tasks 1-6 already committed everything.

---

## What's next (not part of this plan)

Once this phase is merged and both apps have been running against it for a bit, Phase 1 (per the design doc) merges `VideoCard`/`HypeVideoCard`, unifies `EvidenceBadge`/`RiskBadge`/`VerdictStamp` onto the `--color-status-*` scale established here, and migrates `GrowthPlanBoard`/`GrowthTaskCard`/`RelatedTopics`. That's a separate plan — write it fresh once Phase 0 has proven the pattern in production, since Phase 1's component list may shift based on what's learned here (per the design doc's own incremental philosophy).
