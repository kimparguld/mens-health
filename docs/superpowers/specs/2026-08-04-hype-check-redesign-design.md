# Hype Check public site redesign

Status: approved (design), not yet planned/implemented.

## Goal

Replace Hype Check's current generic indigo/white SaaS look with a distinct
"Verdict Stamp Editorial" identity, and rebuild the logotype from scratch.
Scope is the **public site shell**: header/nav, footer, and the home page.
Admin (`app/admin/**`) is untouched.

Brand name stays **Hype Check** — a same-owner domain, `scam-or-legit.net`,
was considered as a rename but rejected: the site's real verdict system has
5 outcomes (LEGIT / MISLEADING / OVERPRICED / RISKY / SCAM), and a binary
"scam or legit" name doesn't cover MISLEADING/OVERPRICED. `hype-check.net`
remains the domain in `site.config.ts`.

## Visual identity

**Concept:** the site's whole premise is "we stamp a verdict on trending
claims," so the design leans into a literal ink-stamp/newsprint editorial
look rather than a SaaS dashboard look. Cream paper, near-black ink, and one
red reserved *only* for verdicts/stamps — buttons and links stay monochrome
so red doesn't get diluted into a generic accent color.

### Color tokens

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--paper` | `#F5F1E8` | `#14110F` | page background |
| `--surface` | `#FBF9F4` | `#1C1815` | card backgrounds |
| `--ink` | `#14110F` | `#F5F1E8` | primary text, buttons, borders |
| `--ink-muted` | `#6B6459` | `#B5AEA0` | secondary text |
| `--hairline` | `#D9D2C3` | `#3A342C` | borders/rules |
| `--brand-red` | `#C1272D` | `#E2555A` | stamp mark accent only |
| `--verdict-legit` | `#1E7A46` | `#34A868` | VerdictType.LEGIT |
| `--verdict-misleading` | `#A6791F` | `#D9A83B` | VerdictType.MISLEADING |
| `--verdict-overpriced` | `#C1652B` | `#E08A4C` | VerdictType.OVERPRICED |
| `--verdict-risky` | `#B8452B` | `#E0684C` | VerdictType.RISKY |
| `--verdict-scam` | `#C1272D` | `#E2555A` | VerdictType.SCAM |

Dark mode is a deliberately designed variant (not an auto-invert of the
light palette), applied via `prefers-color-scheme: dark`, matching the
existing pattern in `globals.css`.

Buttons: solid `--ink` background, `--paper` text, no rounding beyond a
small `3px` radius (avoids the current pill/rounded-full SaaS look). Links:
`--ink` text with an underline in `--hairline`, not a color change on hover
— hover instead is a color shift on the underline only.

### Typography

- Body/UI text stays **Inter** (`--font-inter`, already loaded) — no
  reason to change a working, readable UI font.
- Headings (h1 hero, h2 section titles) and the logotype wordmark switch to
  a bold upright slab serif: **Zilla Slab**, weight 700, loaded via
  `next/font/google` as `--font-slab`. This replaces `EB Garamond` italic,
  which is dropped entirely (it's also the same typeface MenHealth Digest's
  wordmark uses — dropping it fully differentiates the two brands, not just
  the weight/style).
- No italics anywhere in the new design. The old wordmark's "bold caps top
  word + italic serif bottom word" stacked structure is retired — it's the
  exact structure MenHealth Digest's own `BrandLogotype` uses (same CSS
  class names, `mh-logotype-top`/`mh-logotype-bottom`), which is why it read
  as generic/borrowed.

### Logotype

**Mark:** a comic-style "burst" badge (8-point spiky/pow shape, like a
starburst) rendered solid in `--ink`, with a checkmark cut out of it in
reverse (i.e. the checkmark is drawn in `--paper`/background color, not a
separate stroke on top) — approved in the visual companion mockup as
concept #4 ("Burst Badge"). Slight counter-rotation (`-4deg`) so it reads as
stamped rather than perfectly aligned.

**Wordmark:** "Hype Check" in Zilla Slab 700, upright, one weight, one
size, sitting inline next to the mark (not stacked). No color change
between the two words — this was concept #2 ("Bold Slab Serif") from the
wordmark options screen.

Rebuild `BrandLogotype.tsx` and its `.mh-logotype*` CSS block in
`globals.css` from scratch — this is a full replacement, not a palette
swap of the existing SVG (the shield/checkmark mark and the stacked
wordmark structure are both being retired).

## Verdict stamps become real page content

Today, the home page (`app/(public)/page.tsx`) only shows `EvidenceBadge`
(evidence strength) and `RiskBadge` (risk level) — both from the shared
`packages/ui` package. The actual per-subject `Verdict` (LEGIT/MISLEADING/
OVERPRICED/RISKY/SCAM, from `prisma/schema.prisma`) is fetched only on the
video detail page (`getVideoBySlug`), never on the home page, and only
exists once a subject has been through admin review — so many published
subjects won't have one yet.

Given the whole visual identity is built around verdict stamps, the
redesign wires the real verdict into the home page:

1. `lib/db/queries.ts` — add `verdict: true` to the `include` in
   `getFeaturedVideo` and `_getTrendingVideosCached`.
2. New component `apps/hype-check/components/ui/VerdictStamp.tsx` — takes
   an optional `verdict: VerdictType | null | undefined` and renders the
   rotated ink-stamp badge (color per the table above) when present.
3. When `verdict` is absent (not yet reviewed), fall back to the existing
   `EvidenceBadge`/`RiskBadge` display — don't show an empty state or a
   "pending" stamp; the fallback is exactly today's badge behavior.

## Shared component boundary

`packages/ui`'s `VideoCard`, `EvidenceBadge`, and `RiskBadge` are used by
**both** hype-check and menhealth (confirmed: menhealth's home, rankings,
creators, weekly, and topics pages all import `VideoCard`). None of these
get modified or restyled — doing so would leak Hype Check's new palette
into MenHealth Digest, which wasn't requested and isn't part of this
redesign's scope.

Instead, `apps/hype-check` gets its own local card component,
`components/ui/HypeVideoCard.tsx`, styled with the new palette and
rendering `VerdictStamp`. It replaces the shared `VideoCard` only in
`app/(public)/page.tsx` (the only place it's used in this app today, per
the current codebase). `EvidenceBadge`/`RiskBadge` themselves are still
imported and used as-is (their internal styling is generic pill-badge
styling that already reads fine against the new palette as a fallback
state) — only their container/layout changes, not the shared components.

## Files touched

- `apps/hype-check/components/ui/BrandLogotype.tsx` — full rebuild (new SVG mark, new wordmark markup)
- `apps/hype-check/app/globals.css` — replace `.mh-logotype*` block; add color tokens (`@theme` block) and dark-mode overrides
- `apps/hype-check/components/ui/SiteHeader.tsx` — restyle to new palette/typography, same structure/behavior (drawer, nav links unchanged)
- `apps/hype-check/app/(public)/layout.tsx` — restyle footer to new palette
- `apps/hype-check/app/(public)/page.tsx` — restyle hero/sections to new palette+typography, swap `VideoCard` for `HypeVideoCard`
- `apps/hype-check/components/ui/HypeVideoCard.tsx` — new, hype-check-local card
- `apps/hype-check/components/ui/VerdictStamp.tsx` — new
- `apps/hype-check/lib/db/queries.ts` — add `verdict: true` to featured/trending includes
- `apps/hype-check/app/layout.tsx` — swap `EB_Garamond` font import for `Zilla_Slab`
- `apps/hype-check/tailwind.config.ts` — no change expected (Tailwind v4 `@theme` in `globals.css` drives tokens); confirmed during implementation

**Out of scope:** admin pages, `packages/ui` shared components, any other
app in the monorepo, the `scam-or-legit.net` rename, changing the
`VerdictType`/`Verdict` Prisma schema (it already has everything needed).

## Testing

- `__tests__/scoring.test.ts` and friends don't touch rendering — no
  changes needed there.
- New: a small unit test for `VerdictStamp`'s fallback behavior (renders
  nothing / renders the stamp / doesn't throw on `null`) — the only new
  logic being introduced, per the "add unit tests for scoring, parsing, and
  AI-output-validation functions" standard in `AGENTS.md` extended here to
  the one new piece of conditional logic this redesign adds.
- Everything else is presentational (JSX/CSS), verified visually via
  `pnpm --filter hype-check dev` rather than unit tests, per the "test the
  golden path in a browser for UI changes" instruction in the system
  prompt.

## Implementation delivery

Per the requesting user: implementation is delegated to a subagent running
on a cheaper model (not the model running this planning session), to keep
cost down. The plan produced from this spec should be structured so that
subagent can execute it with minimal back-and-forth — concrete file paths,
exact color values, and the approved mockup descriptions above should be
sufficient without re-deriving design decisions.
