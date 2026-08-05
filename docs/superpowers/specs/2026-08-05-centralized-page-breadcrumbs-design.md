# Centralized page breadcrumbs

## Problem

`packages/ui/src/seo/Breadcrumbs.tsx` (visual nav) and `buildBreadcrumbSchema()` in
`packages/core-seo` (JSON-LD `BreadcrumbList`) already exist, but only one page in the
whole monorepo (`weekly/[slug]/page.tsx`, in both `apps/menhealth` and `apps/hype-check`)
actually uses the `Breadcrumbs` component. Every other page that shows a breadcrumb trail
(`claims/[slug]`, `creators/[slug]`, `faq`, `glossary`, `glossary/[slug]`,
`rankings/[topic]`, `topics/[slug]`, `videos/[slug]`) hand-rolls its own `<nav>` markup
with drifting Tailwind classes, built from a second, independently-maintained item list
that only coincidentally matches the JSON-LD schema. In `claims/[slug]/page.tsx` it has
already drifted: the JSON-LD trail includes the claim's topic; the visible trail doesn't.

List pages and static pages (`about`, `contact`, `privacy`, `reports/[slug]`,
`newsletter/[slug]`, etc.) have no breadcrumb at all.

## Goal

Every public page gets its breadcrumb trail — visible nav and JSON-LD — from a single
array, rendered through one shared component, so the two can't drift and no page hand-rolls
breadcrumb markup.

## Design

### New component: `PageBreadcrumbs`

Added to `packages/ui/src/seo/PageBreadcrumbs.tsx`, exported from the package index
alongside the existing `Breadcrumbs` and `JsonLd`.

```ts
type BreadcrumbTrailItem = { label: string; href: string };

type PageBreadcrumbsProps = {
  baseUrl: string;               // site's APP_URL, for absolute JSON-LD urls
  trail: BreadcrumbTrailItem[];  // excludes Home; last item = current page
};
```

`PageBreadcrumbs`:
- Prepends `{ label: 'Home', href: '/' }` internally.
- Renders the visible nav via the existing `Breadcrumbs` component (last item shown as
  plain text, not a link — matching `Breadcrumbs`' current "no href = current page"
  behavior).
- Builds the JSON-LD `BreadcrumbList` via the existing `buildBreadcrumbSchema`, joining
  every `href` (including the last/current item) onto `baseUrl` for absolute URLs, and
  renders it via the existing `JsonLd` component.
- `href` on every trail item (including the last) is always a relative path; pages never
  build `${APP_URL}/...` strings for breadcrumb purposes anymore.

`Breadcrumbs`, `buildBreadcrumbSchema`, and `JsonLd` are unchanged and remain independently
usable — `PageBreadcrumbs` is a composition, not a replacement.

### Per-page migration

For every `app/(public)/**/page.tsx` in `apps/menhealth` and `apps/hype-check`:

- Remove any hand-rolled `<nav aria-label="Breadcrumb">...</nav>` (or equivalent) JSX.
- Remove any `buildBreadcrumbSchema` call that only fed the breadcrumb. Where a page
  combines the breadcrumb schema with other schemas in one `<JsonLd schema={[...]} />`
  array (e.g. `faq/page.tsx`, `topics/[slug]/page.tsx`), drop just that entry — the page
  keeps its own `JsonLd` call for the remaining schemas (FAQ, ItemList, etc.), and
  `PageBreadcrumbs` emits its own separate `<script>` tag for the breadcrumb. Multiple
  JSON-LD blocks per page is standard and not a regression.
- Add a `trail` array and `<PageBreadcrumbs baseUrl={APP_URL} trail={...} />` in its place.

**Trail shape by page depth:**
- Home page (`app/(public)/page.tsx`): no breadcrumbs — it's the root.
- Top-level pages one level under Home (`about`, `claims`, `topics`, `rankings`,
  `reports`, `creators`, `weekly`, `newsletter`, `faq`, `privacy`,
  `affiliate-disclosure`, `contact`, `digest`, `editorial-process`,
  `how-we-rate-evidence`, `medical-disclaimer`/`disclaimer`, `newsletter/archive`,
  `widgets` (hype-check only)): `trail` has exactly one item, e.g.
  `[{ label: 'About', href: '/about' }]` → "Home / About".
- Nested detail pages (`topics/[slug]`, `claims/[slug]`, `videos/[slug]`,
  `creators/[slug]`, `weekly/[slug]`, `rankings/[topic]`, `reports/[slug]`,
  `newsletter/[slug]`): two items, e.g.
  `[{ label: 'Topics', href: '/topics' }, { label: topicName, href: '/topics/' + slug }]`.
  `reports/[slug]` and `newsletter/[slug]` currently have no breadcrumb at all — add one
  following this same pattern.
- `glossary/[slug]`: two items, `[{ label: 'Glossary', href: '/glossary' }, { label: term, href: '/glossary/' + slug }]`.

**Excluded pages** (no breadcrumbs, unchanged): `signin`, `account`, `upgrade`,
`upgrade/success`.

Both apps mirror the same page structure and get the same trail logic; no site-specific
divergence beyond each site's own brand strings/`APP_URL`.

### Testing

- Unit test for `PageBreadcrumbs` (or its internal trail→schema mapping) asserting the
  JSON-LD `itemListElement` labels/urls exactly match the rendered visible items — this is
  the exact class of drift found in `claims/[slug]` today, and the regression the new
  component structurally prevents.
- Manual spot check in dev server: one static page, one list page, one two-level detail
  page per app, confirming breadcrumb rendering and no visual regression.

## Out of scope

- Changing `Breadcrumbs`' visual styling/design.
- Adding breadcrumbs to `signin`, `account`, `upgrade`, `upgrade/success` (explicitly
  excluded — breadcrumbs on auth/billing flows are not useful UX).
- Changing the shape of `buildBreadcrumbSchema` or `JsonLd` — both are reused as-is.
