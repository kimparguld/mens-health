# Shared UI + Generic Theming Design

Date: 2026-08-06

## Problem

`apps/menhealth` and `apps/hype-check` are near-identical Next.js apps (same
layout patterns, same page structure, same component shapes) but almost
nothing is actually shared between them. Markup that is functionally
identical has been copy-pasted per app and then hand-tuned with each site's
raw Tailwind palette classes (`bg-emerald-600` vs `bg-indigo-600`,
`text-gray-900` vs `text-ink-muted`, etc.) instead of theme variables. This
has three costs:

1. **Duplication**: `SiteHeader.tsx`, `BrandLogotype.tsx`, `GrowthPlanBoard.tsx`,
   `GrowthTaskCard.tsx`, `RelatedTopics.tsx`, and most of each `page.tsx` are
   ~90%+ identical between the two apps, differing mainly in color classes
   and minor copy.
2. **Drift**: components already living in the shared `packages/ui` package
   are not actually theme-aware. `VideoCard.tsx` hardcodes
   `bg-emerald-100`/`text-emerald-800` directly. `NewsletterSignupForm.tsx`
   and `HowWeRateClaims.tsx` take a `site?: string` prop and internally
   branch (`if (site === 'hype-check') { ...hardcoded hype colors... } else
   { ...hardcoded menhealth colors... }`) — this is the exact anti-pattern
   this design eliminates, already present in the "shared" package.
3. **Silent bugs**: hype-check's `app/globals.css` has two tokens mis-mapped
   to the wrong value: `--color-surface: var(--color-gray-900)` and
   `--color-ink-muted: var(--color-gray-900)` (both should reference the
   app's own `--surface`/`--ink-muted` custom properties, not Tailwind's
   gray-900 scale). This kind of error is easy to introduce and easy to miss
   precisely because there's no single contract both sites are checked
   against.

Adding a third site under this pattern means copy-pasting the drift forward
again.

## Goals

- Establish one shared, role-based CSS variable ("token") contract that both
  apps' `globals.css` map their brand values onto.
- Move markup that is genuinely identical once tokenized into
  `packages/ui`, so a future third site gets it for free by writing a
  `globals.css` theme, not by copying components.
- Stop the drift from recurring via lint enforcement, not just convention.
- Do this incrementally, proving the pattern on a small pilot before
  committing to the full migration, since the change touches a lot of code
  across two live apps.

## Non-goals

- Not rebuilding either app's visual design — the goal is that both sites
  look **exactly as they do today** after migration; this is a refactor of
  *how* the styling is expressed, not a redesign.
- Not introducing a component library / design system product, Storybook,
  or visual regression tooling as part of this effort (neither exists in
  the repo today; out of scope here).
- Not touching admin-only or genuinely site-specific components (e.g.
  hype-check's `VerdictHero`, `VerdictStamp`) beyond making their *color*
  usage token-based where they already parallel a menhealth equivalent.

## Design

### 1. Token architecture

A canonical set of role-based CSS custom properties is documented (in
`packages/ui`, as the source of truth for the contract) and each app's
`app/globals.css` defines the underlying values and maps them via Tailwind
v4's `@theme inline`, exactly as both apps already do today — this is not a
new mechanism, just a shared vocabulary for it.

Token names describe **role**, never a color or a site:

| Token | Role | Menhealth value today | Hype-check value today |
|---|---|---|---|
| `--color-bg-page` | page/body background | `--background` | `--paper` |
| `--color-bg-surface` | raised surfaces (cards, panels) | hardcoded `white` | hardcoded `white` |
| `--color-bg-muted` | subtle section background | `--surface-alt` | `--surface` *(currently mis-mapped)* |
| `--color-bg-emphasis` | inverted/dark bands (e.g. header) | *(none — new)* | `--ink-muted` *(currently mis-mapped)* |
| `--color-text-primary` | primary body text | `--foreground` | `--ink-muted` |
| `--color-text-muted` | secondary/muted text | `--text-muted` / `--text-subtle` | `--ink-muted` at reduced opacity |
| `--color-text-on-emphasis` | text on inverted/dark surfaces | *(none — new)* | `white` |
| `--color-border` | hairline borders | `--hairline` | `--hairline` |
| `--color-accent` / `--color-accent-strong` | brand CTA color, hover state | `--accent` / `--accent-strong` (emerald) | `--ink` |
| `--color-status-strong` … `--color-status-none` | 5-step evidence/verdict scale | emerald/teal/amber/orange/red/gray | `--verdict-legit` … `--verdict-scam` |

This table is a starting inventory, not exhaustive — the full set of tokens
needed gets finalized during Phase 0 as real components are migrated and
new color usages are discovered. Fixing hype-check's two mis-mapped tokens
falls out of doing this properly (its `--color-surface` and
`--color-ink-muted` start pointing at the right custom property).

Components in `packages/ui` reference only `--color-*` token classes
(`bg-surface`, `text-primary`, …). They never reference a raw Tailwind
palette class (`emerald`, `indigo`, `gray-900`, …) and never take a `site`
prop purely to select a color.

### 2. Classification rule

A piece of markup is a candidate for `packages/ui` only if, once its colors
are expressed as tokens, the two apps' versions are **structurally
identical** — same DOM shape, same conditionals, differing only in
copy/data/tokens. Concretely:

- **Move to `packages/ui`** if the only diffs are class names (color/font)
  and text content/data. Copy differences (headings, CTA text, nav labels)
  stay as props — the ban is on styling forks, not on all per-site
  variation.
- **Keep local** if interaction, layout, or conditional structure genuinely
  differs. Where only *part* of a component differs this way (e.g.
  hype-check's `VerdictStamp` branch inside `FeaturedInsight`, which
  menhealth doesn't have), the shared component takes a slot
  (`statusSlot?: ReactNode` or a render prop) for that piece rather than
  being forked or growing an internal `if (site === ...)` branch.
- A `site` (or similar) prop existing purely to pick a color palette is
  always a signal the component should be tokenized instead, not
  parameterized.

### 3. Enforcement

An ESLint rule (flat config `no-restricted-syntax` matching JSX `className`
string literals against a denylist of raw Tailwind color-palette prefixes —
`bg-emerald-`, `text-gray-`, `bg-indigo-`, `border-amber-`, etc.) is added
scoped to `packages/ui/src/**`, referenced from both apps' existing
per-app `eslint.config.mjs` (there is no shared root ESLint config today).
Token-backed classes (`bg-surface`, `text-ink`, arbitrary values) remain
allowed everywhere. This directly prevents a repeat of the
`NewsletterSignupForm`/`HowWeRateClaims`/`VideoCard` drift found during this
audit.

### 4. Phased rollout

- **Phase 0 — Pilot.** Fix the two components in `packages/ui` that already
  fake being shared (`NewsletterSignupForm`, `HowWeRateClaims`): remove
  their `site` branch, consume tokens instead. Migrate `BrandLogotype` and
  `SiteHeader` into `packages/ui` (nav links passed as a prop array, since
  menhealth's has a "Creators" link hype-check's doesn't). Fix hype-check's
  two mis-mapped CSS tokens as part of building the real contract. Land the
  ESLint rule. This proves the pattern end-to-end on code that's already
  duplicated, before expanding scope.
- **Phase 1 — Core components.** Merge `VideoCard`/`HypeVideoCard` (the
  verdict stamp becomes an optional slot), unify `EvidenceBadge`/
  `RiskBadge`/`VerdictStamp` on the `--color-status-*` scale,
  `GrowthPlanBoard`/`GrowthTaskCard`, `RelatedTopics`.
- **Phase 2 — Homepage sections.** Both `page.tsx` homepages are ~90%
  structurally identical. Extract into `packages/ui`:
  - `<HeroSection>` — headline/subhead/CTA props.
  - `<FeaturedInsightSection>` — takes a `statusSlot` render prop for the
    evidence-badges-vs-verdict-stamp difference; each app's page still owns
    its own data fetch and adapts its schema shape (menhealth:
    `featuredVideo.summaries[0]`, hype-check:
    `featuredVideo.sourceVideos[0].summaries[0]`) into the shared props.
  - `<TopicsGridSection>`, `<TrendingVideosSection>` (list wrapper; card
    itself already covered in Phase 1), `<NewsletterCtaSection>`.
  Each `page.tsx` becomes a thin composition + data-fetching layer over
  these.
- **Phase 3 — Remaining public pages.** `topics/[slug]`, `creators/[slug]`,
  `rankings/[topic]`, `weekly/[slug]`, video detail pages — audited with the
  same classification rule from Phase 0/2. Not pre-planned line-by-line here
  since these haven't been read yet; the implementation plan will scope
  this phase from a fresh audit once Phase 2 patterns exist as a reference.
- **Phase 4 — Cleanup.** Delete now-dead per-app duplicate files, confirm
  the lint rule has zero exceptions across both apps, update `AGENTS.md`
  and `.github/copilot-instructions.md` with the shared-UI/token convention
  as a standing rule for future sites (per `docs/adding-a-new-site.md`).

### 5. Verification strategy

No visual regression tooling exists in the repo (no Playwright, Storybook,
or Chromatic found) and none is being added as part of this effort. Each
phase's checkpoint is manual: run both apps' dev servers, compare the
affected pages/breakpoints against pre-change screenshots for both sites,
and run `pnpm typecheck` / `pnpm lint` across touched packages. Because the
explicit goal is zero visual change, any difference found during manual
comparison is a bug to fix before moving to the next phase.

## Risks

- **Missed duplication**: the classification rule relies on manual judgment
  per component; Phase 3's page-by-page audit is where most of this risk
  lives, since those pages haven't been inventoried yet.
- **Token gaps discovered mid-phase**: the token table above is a starting
  point; expect to add tokens as Phase 1/2 surface color usages not yet
  accounted for (e.g. focus rings, disabled states).
- **Data-shape differences masquerading as markup differences**: as seen in
  `FeaturedInsight`, the two apps' Prisma schemas shape data slightly
  differently even when the resulting markup is identical — the fix is an
  adapter at the page level, not a fork in the shared component.
