# Hype Check video page redesign

## Problem

The public video detail page (`app/(public)/videos/[slug]/page.tsx`) has three issues:

1. **Off-brand colors.** The page hardcodes raw Tailwind colors (`gray-900/700/500/400`, `amber-50/200/500/900`, `indigo-50`) instead of this site's theme tokens (`--paper`, `--accent`, `--muted`, `--hairline`, `--verdict-*`) defined in `app/globals.css`.
2. **Shared badges don't fit the brand.** `EvidenceBadge` and `RiskBadge` from `@menhealth/ui` are hardcoded to generic Tailwind colors (`emerald`, `teal`, `amber`, `orange`, `red`, `gray`) with no awareness of this site's palette — the same problem this app already solved for verdicts with a site-local `VerdictStamp` component.
3. **The page doesn't state its own verdict.** `getVideoBySlug` already fetches `video.verdict` (with `verdict` + `rationale`, set via the admin `VerdictPanel`), but the video page never renders it — it shows claim-level risk/evidence badges instead of the actual Legit/Misleading/Overpriced/Risky/Scam call that is this site's core value proposition.

Investigation also found `WarningSign`, `CostItem`, and `Disclosure` are fetched by the same query but have **no writer anywhere in the codebase** (no admin form, no job) — they're permanently empty. Out of scope for this change; noted as a follow-up idea only.

## Scope

- Site-local `EvidenceStamp` and `RiskStamp` components (new), replacing `@menhealth/ui`'s `EvidenceBadge`/`RiskBadge` across all public-facing hype-check pages (11 files) and `HypeVideoCard`.
- `packages/ui`'s `EvidenceBadge`/`RiskBadge` are untouched (shared across sites; other apps still use them as-is).
- Admin pages are untouched — they keep their current utilitarian styling; that's a separate concern.
- Video detail page restructured to lead with the verdict.

## Design

### 1. Color tokens

No new CSS tokens. All raw Tailwind grays/ambers/indigos on the video page become theme tokens:

- `text-gray-900` → `text-muted`
- `text-gray-500`/`gray-400` → `text-muted/60` (or `/50`, matched to existing usage patterns in `HypeVideoCard`/frontpage)
- `border-gray-200` → `border-hairline`
- `bg-amber-50`/`border-amber-200`/`text-amber-900` (warnings box) → `verdict-risky`-tinted (border/text `verdict-risky`, background a low-opacity tint)
- `bg-indigo-50` (target-audience box) → `surface` or `paper` background with `hairline` border, consistent with other info boxes on the site

### 2. `EvidenceStamp` / `RiskStamp` components

New files: `components/ui/EvidenceStamp.tsx`, `components/ui/RiskStamp.tsx`. Same shape as `VerdictStamp` (bordered, uppercase, `font-serif`, tied to `--verdict-*` tokens) but **not rotated** — they appear in inline lists/rows where repeated rotation would look noisy, whereas `VerdictStamp` stays rotated because it appears once as a hero element.

Color mapping (reusing existing 5 verdict tokens, no new colors):

| Evidence status | Token                    |     | Risk level | Token                    |
| --------------- | ------------------------ | --- | ---------- | ------------------------ |
| SUPPORTED       | `verdict-legit`          |     | LOW        | `ink-muted/40` (neutral) |
| MODERATE        | `verdict-legit`          |     | MEDIUM     | `verdict-misleading`     |
| MIXED           | `verdict-misleading`     |     | HIGH       | `verdict-risky`          |
| WEAK            | `verdict-overpriced`     |     |            |                          |
| UNSUPPORTED     | `verdict-scam`           |     |            |                          |
| NOT_CHECKED     | `ink-muted/40` (neutral) |     |            |                          |

Both components preserve the existing prop shape (`status`/`level` + label text) of the components they replace, so callers don't need to change beyond the import path.

### 3. Swap-in sites (import change only, no behavior change)

Replace `EvidenceBadge`/`RiskBadge` imports from `@menhealth/ui` with the new local `EvidenceStamp`/`RiskStamp` in:

- `app/(public)/page.tsx`
- `app/(public)/videos/[slug]/page.tsx`
- `app/(public)/videos/[slug]/PremiumSection.tsx`
- `app/(public)/creators/[slug]/page.tsx`
- `app/(public)/glossary/[slug]/page.tsx`
- `app/(public)/weekly/[slug]/page.tsx`
- `app/(public)/topics/page.tsx`
- `app/(public)/topics/[slug]/page.tsx`
- `app/(public)/claims/page.tsx`
- `app/(public)/claims/[slug]/page.tsx`
- `components/ui/HypeVideoCard.tsx`

(`app/admin/(protected)/claims/page.tsx` is intentionally excluded — admin scope.)

### 4. Video page content restructure

New section order for `app/(public)/videos/[slug]/page.tsx`:

1. Breadcrumb (tokenized colors)
2. Title + channel/published meta (tokenized colors)
3. **New: Verdict block.** Large `VerdictStamp`, `video.verdict.rationale` displayed underneath as the "why", topic chips alongside. If `video.verdict` is null, render a neutral "Not yet verdicted" state (not hidden) so the page never looks broken/unfinished for un-verdicted videos.
4. YouTube embed (unchanged)
5. Sponsor block (unchanged)
6. Summary + takeaways + warnings (tokenized; warnings box switches from amber to `verdict-risky`)
7. Claims section using `EvidenceStamp`/`RiskStamp`
8. Topics / key terms / related reviews / embeddable badge / affiliate links / newsletter CTA / disclaimer — unchanged structure, tokenized colors only

### 5. Out of scope / follow-up

`WarningSign`, `CostItem`, `Disclosure` models are fetched but never written anywhere in the app. No UI will be built for them in this change. Leave a short code comment at the query site noting the gap, as a pointer for a future admin-UI task.

## Testing

- Existing `__tests__/VerdictStamp.test.tsx` pattern extended with `EvidenceStamp`/`RiskStamp` unit tests (status/level → correct token class mapping).
- Manual check: `pnpm --filter hype-check dev`, visually verify the video page and at least one of each swapped-in page (frontpage, topics, claims) against the palette.
- No DB/schema changes, no migration needed.
