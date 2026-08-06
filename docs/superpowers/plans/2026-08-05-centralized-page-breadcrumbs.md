# Centralized Page Breadcrumbs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every public page in `apps/menhealth` and `apps/hype-check` renders its breadcrumb trail (visible nav + JSON-LD) through one new shared `PageBreadcrumbs` component, fed by a single per-page `trail` array, eliminating hand-rolled `<nav>` markup and the drift between visible breadcrumbs and JSON-LD schema.

**Architecture:** Add `PageBreadcrumbs` to `packages/ui/src/seo/`, composing the existing `Breadcrumbs` (visual) and `buildBreadcrumbSchema` + `JsonLd` (JSON-LD) from one `trail: { label: string; href: string }[]` array (Home prepended automatically, last item rendered as non-linked current page). Migrate every `app/(public)/**/page.tsx` in both apps to use it, grouped into tasks by which pattern the page currently follows.

**Tech Stack:** Next.js App Router (Server Components), TypeScript strict, Tailwind, Vitest + Testing Library (tests live in each app's `__tests__/`, not inside `packages/ui` — there is no vitest config there).

## Global Constraints

- Never expose server env vars to client components — not relevant here (`PageBreadcrumbs` is a Server Component, no `"use client"`).
- No breadcrumbs on `signin`, `account`, `upgrade`, `upgrade/success` in either app (explicit user decision — auth/billing flows).
- `digest/page.tsx` (menhealth) is a bare redirect to `/newsletter` (`permanentRedirect`, no JSX return) — excluded, nothing to migrate.
- Keep existing `Breadcrumbs`, `buildBreadcrumbSchema`, `JsonLd` components unchanged; `PageBreadcrumbs` composes them, it doesn't replace them.
- Each site's `APP_URL` fallback literal (already used verbatim across both codebases) — menhealth: `'https://www.menhealth-digest.com'`, hype-check: `'https://www.hype-check.net'`. Use `process.env.NEXT_PUBLIC_APP_URL ?? '<that literal>'` exactly as existing files in that app already do.
- Run `pnpm --filter <app> typecheck` after every task; run `pnpm --filter <app> lint` and `pnpm --filter <app> test` after every task that touches that app's `__tests__/` or page files.

---

### Task 1: `PageBreadcrumbs` component

**Files:**

- Create: `packages/ui/src/seo/PageBreadcrumbs.tsx`
- Modify: `packages/ui/src/index.ts` (add export)
- Test: `apps/menhealth/__tests__/PageBreadcrumbs.test.tsx`

**Interfaces:**

- Consumes: `Breadcrumbs` from `./Breadcrumbs` (props `{ items: { label: string; href?: string }[] }`), `JsonLd` from `./JsonLd` (props `{ schema: Record<string, unknown> | Record<string, unknown>[] }`), `buildBreadcrumbSchema` from `@menhealth/core-seo` (`(items: { name: string; url: string }[]) => Record<string, unknown>`).
- Produces: `PageBreadcrumbs` component, `{ baseUrl: string; trail: BreadcrumbTrailItem[] }` props, and the `BreadcrumbTrailItem = { label: string; href: string }` type — both exported from `@menhealth/ui` and used by every later task.

- [ ] **Step 1: Write the failing test**

Create `apps/menhealth/__tests__/PageBreadcrumbs.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageBreadcrumbs } from '@menhealth/ui';

describe('PageBreadcrumbs', () => {
  const baseUrl = 'https://example.com';

  it('renders Home plus every trail item as visible nav text', () => {
    render(
      <PageBreadcrumbs
        baseUrl={baseUrl}
        trail={[
          { label: 'Topics', href: '/topics' },
          { label: 'Testosterone', href: '/topics/testosterone' },
        ]}
      />,
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Topics')).toBeInTheDocument();
    expect(screen.getByText('Testosterone')).toBeInTheDocument();
  });

  it('does not render the last trail item as a link', () => {
    render(
      <PageBreadcrumbs
        baseUrl={baseUrl}
        trail={[
          { label: 'Topics', href: '/topics' },
          { label: 'Testosterone', href: '/topics/testosterone' },
        ]}
      />,
    );
    expect(screen.getByText('Topics').closest('a')).not.toBeNull();
    expect(screen.getByText('Testosterone').closest('a')).toBeNull();
  });

  it('emits a JSON-LD BreadcrumbList whose entries exactly match the visible trail', () => {
    const { container } = render(
      <PageBreadcrumbs
        baseUrl={baseUrl}
        trail={[
          { label: 'Claims', href: '/claims' },
          { label: 'Some claim text', href: '/claims/some-claim' },
        ]}
      />,
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const schema = JSON.parse(script?.innerHTML ?? '{}') as {
      '@type': string;
      itemListElement: Array<{ position: number; name: string; item: string }>;
    };
    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Claims',
        item: `${baseUrl}/claims`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Some claim text',
        item: `${baseUrl}/claims/some-claim`,
      },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter menhealth exec vitest run __tests__/PageBreadcrumbs.test.tsx`
Expected: FAIL — `PageBreadcrumbs` is not exported from `@menhealth/ui`.

- [ ] **Step 3: Write the component**

Create `packages/ui/src/seo/PageBreadcrumbs.tsx`:

```tsx
import { buildBreadcrumbSchema } from '@menhealth/core-seo';
import { Breadcrumbs } from './Breadcrumbs';
import { JsonLd } from './JsonLd';

export type BreadcrumbTrailItem = {
  label: string;
  href: string;
};

type Props = {
  baseUrl: string;
  trail: BreadcrumbTrailItem[];
};

export function PageBreadcrumbs({ baseUrl, trail }: Props) {
  const schema = buildBreadcrumbSchema([
    { name: 'Home', url: baseUrl },
    ...trail.map((item) => ({
      name: item.label,
      url: `${baseUrl}${item.href}`,
    })),
  ]);

  const visibleItems = trail.map((item, index) => (index === trail.length - 1 ? { label: item.label } : item));

  return (
    <>
      <JsonLd schema={schema} />
      <Breadcrumbs items={visibleItems} />
    </>
  );
}
```

- [ ] **Step 4: Export it from the package index**

In `packages/ui/src/index.ts`, change:

```ts
export { Breadcrumbs } from './seo/Breadcrumbs';
export { JsonLd } from './seo/JsonLd';
```

to:

```ts
export { Breadcrumbs } from './seo/Breadcrumbs';
export { JsonLd } from './seo/JsonLd';
export { PageBreadcrumbs } from './seo/PageBreadcrumbs';
export type { BreadcrumbTrailItem } from './seo/PageBreadcrumbs';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter menhealth exec vitest run __tests__/PageBreadcrumbs.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Typecheck the ui package**

Run: `pnpm --filter @menhealth/ui typecheck`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/seo/PageBreadcrumbs.tsx packages/ui/src/index.ts apps/menhealth/__tests__/PageBreadcrumbs.test.tsx
git commit -m "feat(ui): add PageBreadcrumbs component composing Breadcrumbs + JSON-LD from one trail"
```

---

### Task 2: Migrate menhealth pages that already render a hand-rolled breadcrumb

**Files (all `apps/menhealth/app/(public)/.../page.tsx`):**
`claims/[slug]`, `creators/[slug]`, `faq`, `glossary`, `glossary/[slug]`, `rankings/[topic]`, `topics/[slug]`, `videos/[slug]`, `weekly/[slug]`, `reports/[slug]`, `newsletter/[slug]` — 11 files.

**Interfaces:**

- Consumes: `PageBreadcrumbs` and `BreadcrumbTrailItem` from `@menhealth/ui` (Task 1).
- Produces: nothing consumed by later tasks — this task is self-contained.

Every file in this task follows the same transform: delete the hand-rolled `<nav>...</nav>` breadcrumb block, delete the `buildBreadcrumbSchema` call that fed it (or just its entry if it's combined with other schemas in one `JsonLd schema={[...]}` array), add `import { PageBreadcrumbs } from '@menhealth/ui';` (merge into an existing `@menhealth/ui` import if present), and render `<PageBreadcrumbs baseUrl={APP_URL} trail={...} />` where the nav used to be.

- [ ] **Step 1: Worked example — `apps/menhealth/app/(public)/claims/[slug]/page.tsx`**

Remove the `buildBreadcrumbSchema` import if `buildBreadcrumbSchema` becomes unused in the file (it does here — this file has no other schema). Change:

```ts
import { buildBreadcrumbSchema } from '@menhealth/core-seo';
```

to nothing (delete the line) — and change:

```ts
import { AdSlot, Disclaimer, EvidenceBadge, JsonLd, NewsletterFooterCTA, RiskBadge } from '@menhealth/ui';
```

to:

```ts
import {
  AdSlot,
  Disclaimer,
  EvidenceBadge,
  JsonLd,
  NewsletterFooterCTA,
  PageBreadcrumbs,
  RiskBadge,
} from '@menhealth/ui';
```

Change:

```tsx
const canonicalSlug = claim.slug ?? claim.id;
const breadcrumb = buildBreadcrumbSchema([
  { name: 'Home', url: APP_URL },
  { name: 'Claims', url: `${APP_URL}/claims` },
  {
    name: claim.text.slice(0, 60),
    url: `${APP_URL}/claims/${canonicalSlug}`,
  },
]);
```

to:

```tsx
const canonicalSlug = claim.slug ?? claim.id;
```

Change:

```tsx
  return (
    <>
      <JsonLd schema={breadcrumb} />
      <main className="mx-auto max-w-2xl px-4 py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-gray-600">
          <Link href="/" className="hover:text-gray-600">
            Home
          </Link>
          <span>/</span>
          {firstTopic && (
            <>
              <Link
                href={`/topics/${firstTopic.slug}`}
                className="hover:text-gray-600"
              >
                {firstTopic.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-gray-600">Claim</span>
        </nav>
```

to:

```tsx
  return (
    <>
      <main className="mx-auto max-w-2xl px-4 py-12">
        <PageBreadcrumbs
          baseUrl={APP_URL}
          trail={[
            { label: 'Claims', href: '/claims' },
            {
              label: claim.text.slice(0, 60),
              href: `/claims/${canonicalSlug}`,
            },
          ]}
        />
```

Note: `firstTopic` was only used by the deleted nav block in this file — check with `grep -n firstTopic apps/menhealth/app/\(public\)/claims/\[slug\]/page.tsx` after the edit; if it's now unused, remove its declaration (`const { video } = claim; ... const firstTopic = video.topics[0]?.topic;`) too, since an unused variable fails lint/typecheck. Re-check `video` is still used elsewhere in the file before removing that destructure.

- [ ] **Step 2: Apply the same transform to the remaining 10 files**

Use the exact trail per file below. In each case: delete the old `<nav>` block, delete/trim the `buildBreadcrumbSchema` call (remove just the breadcrumb entry if it's merged into a `schemas` array or a multi-schema `JsonLd schema={[...]}`, per each file's existing structure — read the file first), add `PageBreadcrumbs` to the `@menhealth/ui` import, render `<PageBreadcrumbs baseUrl={APP_URL} trail={...} />` where the `<nav>` was.

| File                         | Trail (exact)                                                                                                                                              | Notes                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `creators/[slug]/page.tsx`   | `[{ label: 'Creators', href: '/creators' }, { label: creator.name, href: `/creators/${slug}` }]`                                                           | `JsonLd schema={[breadcrumb, personSchema]}` → keep `personSchema` only: `JsonLd schema={personSchema}`. Delete the `breadcrumb` variable.                                                                                                                                                                                                                                                           |
| `faq/page.tsx`               | `[{ label: 'FAQ', href: '/faq' }]`                                                                                                                         | `JsonLd schema={[breadcrumbSchema, faqSchema]}` → `JsonLd schema={faqSchema}`. Delete `breadcrumbSchema`.                                                                                                                                                                                                                                                                                            |
| `glossary/page.tsx`          | `[{ label: 'Glossary', href: '/glossary' }]`                                                                                                               | `JsonLd schema={[breadcrumbSchema, definedTermSetSchema]}` → `JsonLd schema={definedTermSetSchema}`. Delete `breadcrumbSchema`.                                                                                                                                                                                                                                                                      |
| `glossary/[slug]/page.tsx`   | `[{ label: 'Glossary', href: '/glossary' }, { label: term.term, href: `/glossary/${slug}` }]`                                                              | `JsonLd schema={[breadcrumbSchema, definedTermSchema]}` → `JsonLd schema={definedTermSchema}`. Delete `breadcrumbSchema`.                                                                                                                                                                                                                                                                            |
| `rankings/[topic]/page.tsx`  | `[{ label: 'Rankings', href: '/rankings' }, { label: seed.name, href: `/rankings/${topic}` }]`                                                             | Two separate `<JsonLd schema={breadcrumb} />` / `<JsonLd schema={listSchema} />` tags → delete the breadcrumb one, keep `<JsonLd schema={listSchema} />`. Delete `breadcrumb` variable.                                                                                                                                                                                                              |
| `topics/[slug]/page.tsx`     | `[{ label: 'Topics', href: '/topics' }, { label: topicSeed.name, href: `/topics/${slug}` }]`                                                               | **Adds the missing "Topics" list level** — today's trail is just `[Home, topicSeed.name]`, which is the drift bug from the design doc. `schemas` array built as `[breadcrumbSchema, ...itemListSchema, ...faqSchema]` → remove `breadcrumbSchema` from that array (keep the rest), delete the `breadcrumbSchema` variable.                                                                           |
| `videos/[slug]/page.tsx`     | `[...(firstTopic ? [{ label: firstTopic.name, href: `/topics/${firstTopic.slug}` }] : []), { label: displayTitle, href: `/videos/${video.slug}` }]`        | Three separate `<JsonLd>` tags (`videoSchema`, `breadcrumbSchema`, `articleSchema`) → delete only the breadcrumb one. Delete `breadcrumbSchema` variable.                                                                                                                                                                                                                                            |
| `weekly/[slug]/page.tsx`     | `[{ label: 'Weekly trends', href: '/weekly' }, { label: seed.name, href: `/weekly/${slug}` }]`                                                             | Already uses `<Breadcrumbs items={[{ label: 'Weekly trends', href: '/weekly' }, { label: seed.name }]} />` directly — replace that `Breadcrumbs` usage with `PageBreadcrumbs` (same trail, now with `href` on both items) and delete the separate `<JsonLd schema={breadcrumbSchema} />` + `breadcrumbSchema` variable. Remove `Breadcrumbs` from the `@menhealth/ui` import, add `PageBreadcrumbs`. |
| `reports/[slug]/page.tsx`    | `[{ label: 'Reports', href: '/reports' }, { label: stats.periodLabel, href: `/reports/${slug}` }]`                                                         | This page has **no** JSON-LD breadcrumb schema today, only the visible `<nav>` — new behavior, it gains one. Add `import { PageBreadcrumbs } from '@menhealth/ui';`. Needs a local `APP_URL` constant — add `const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.menhealth-digest.com';` near the top (this file has none today).                                                        |
| `newsletter/[slug]/page.tsx` | `[{ label: 'Newsletter', href: '/newsletter' }, { label: 'Archive', href: '/newsletter/archive' }, { label: issue.subject, href: `/newsletter/${slug}` }]` | Same as above: no existing schema, add `PageBreadcrumbs` import and a local `APP_URL` constant (same fallback literal).                                                                                                                                                                                                                                                                              |

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter menhealth typecheck`
Expected: no errors. Fix any unused-variable errors (e.g. `firstTopic` in `claims/[slug]`, `Link` if it becomes unused in a file after removing the nav — check each file for other `Link` usages before removing the import).

- [ ] **Step 4: Lint**

Run: `pnpm --filter menhealth lint`
Expected: no errors.

- [ ] **Step 5: Run the full test suite**

Run: `pnpm --filter menhealth test`
Expected: PASS (existing tests unaffected — this task doesn't change `core-seo` behavior, only which pages call it).

- [ ] **Step 6: Commit**

```bash
git add apps/menhealth/app/\(public\)/claims/\[slug\]/page.tsx apps/menhealth/app/\(public\)/creators/\[slug\]/page.tsx apps/menhealth/app/\(public\)/faq/page.tsx apps/menhealth/app/\(public\)/glossary/page.tsx apps/menhealth/app/\(public\)/glossary/\[slug\]/page.tsx apps/menhealth/app/\(public\)/rankings/\[topic\]/page.tsx apps/menhealth/app/\(public\)/topics/\[slug\]/page.tsx apps/menhealth/app/\(public\)/videos/\[slug\]/page.tsx apps/menhealth/app/\(public\)/weekly/\[slug\]/page.tsx apps/menhealth/app/\(public\)/reports/\[slug\]/page.tsx apps/menhealth/app/\(public\)/newsletter/\[slug\]/page.tsx
git commit -m "refactor(menhealth): migrate pages with hand-rolled breadcrumbs to PageBreadcrumbs"
```

---

### Task 3: Migrate hype-check pages that already render a hand-rolled breadcrumb

**Files (all `apps/hype-check/app/(public)/.../page.tsx`):**
`claims/[slug]`, `creators/[slug]`, `faq`, `glossary`, `glossary/[slug]`, `rankings/[topic]`, `topics/[slug]`, `videos/[slug]`, `weekly/[slug]`, `reports/[slug]`, `newsletter/[slug]` — 11 files.

**Interfaces:**

- Consumes: `PageBreadcrumbs`, `BreadcrumbTrailItem` from `@menhealth/ui` (Task 1).
- Produces: nothing consumed by later tasks.

Identical transform to Task 2, applied to hype-check's copy of each page (same file paths under `apps/hype-check`, same trail data — labels are identical, only the site's `APP_URL` fallback literal differs: `'https://www.hype-check.net'`). hype-check's markup uses different Tailwind classes (dark-theme tokens like `text-gray-400`/`text-gray-500`/`text-muted`) but the same structural nav-before-header pattern, same variable names (`firstTopic`, `creator.name`, `seed.name`, `topicSeed.name`, `displayTitle`, `stats.periodLabel`, `issue.subject`), so the same edits from Task 2's table apply file-for-file.

Two hype-check-specific differences to account for:

- `topics/[slug]/page.tsx`: same as menhealth — trail gains the missing `Topics` list level: `[{ label: 'Topics', href: '/topics' }, { label: topicSeed.name, href: `/topics/${slug}` }]`.
- `rankings/[topic]/page.tsx` and `topics/[slug]/page.tsx` map `listSchema`/`itemListSchema` entries using `v.editorialTitle ?? v.sourceVideos[0]?.title ?? v.name` (hype-check's data model differs slightly from menhealth's) — that mapping is untouched by this migration, only the breadcrumb entry is removed.

- [ ] **Step 1: Migrate all 11 files per the Task 2 recipe and trail table, substituting the hype-check file paths and `APP_URL` fallback (`'https://www.hype-check.net'`)**

For `reports/[slug]/page.tsx` and `newsletter/[slug]/page.tsx` (no existing schema, same as menhealth), add the local `APP_URL` constant:

```ts
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.hype-check.net';
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `pnpm --filter hype-check lint`
Expected: no errors.

- [ ] **Step 4: Run the full test suite**

Run: `pnpm --filter hype-check test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/hype-check/app/\(public\)/claims/\[slug\]/page.tsx apps/hype-check/app/\(public\)/creators/\[slug\]/page.tsx apps/hype-check/app/\(public\)/faq/page.tsx apps/hype-check/app/\(public\)/glossary/page.tsx apps/hype-check/app/\(public\)/glossary/\[slug\]/page.tsx apps/hype-check/app/\(public\)/rankings/\[topic\]/page.tsx apps/hype-check/app/\(public\)/topics/\[slug\]/page.tsx apps/hype-check/app/\(public\)/videos/\[slug\]/page.tsx apps/hype-check/app/\(public\)/weekly/\[slug\]/page.tsx apps/hype-check/app/\(public\)/reports/\[slug\]/page.tsx apps/hype-check/app/\(public\)/newsletter/\[slug\]/page.tsx
git commit -m "refactor(hype-check): migrate pages with hand-rolled breadcrumbs to PageBreadcrumbs"
```

---

### Task 4: Add breadcrumbs to menhealth pages that currently have none

**Files (all `apps/menhealth/app/(public)/.../page.tsx`, single-item trail unless noted):**
`about`, `affiliate-disclosure`, `claims`, `contact`, `creators`, `editorial-process`, `how-we-rate-evidence`, `newsletter`, `newsletter/archive`, `privacy`, `rankings`, `reports`, `topics`, `weekly`, `medical-disclaimer`, `widgets` — 16 files.

**Interfaces:**

- Consumes: `PageBreadcrumbs` from `@menhealth/ui` (Task 1).
- Produces: nothing consumed by later tasks.

None of these files currently import `PageBreadcrumbs`, `Breadcrumbs`, or `buildBreadcrumbSchema` for a page-level trail (verified: zero `APP_URL` mentions in any of them except `widgets`, which already has one for unrelated snippet strings). For each file: add `import { PageBreadcrumbs } from '@menhealth/ui';` (or merge into an existing `@menhealth/ui` import), add a local `const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.menhealth-digest.com';` if the file doesn't already declare one, and render `<PageBreadcrumbs baseUrl={APP_URL} trail={...} />` as the first child inside `<main ...>`.

- [ ] **Step 1: Worked example — `apps/menhealth/app/(public)/about/page.tsx`**

Change:

```tsx
import type { Metadata } from "next";
import { Disclaimer } from "@menhealth/ui";
import { MEDICAL_DISCLAIMER_TEXT } from "@/lib/site-brand";
import { createMetadata } from "@/lib/seo/site-metadata";
export const metadata: Metadata = createMetadata({
  title: "About Us",
  description:
    "Why MenHealth Digest exists, what we do, and how we approach men's health content.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-12">
      <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900">
        About MenHealth Digest
      </h1>
```

to:

```tsx
import type { Metadata } from "next";
import { Disclaimer, PageBreadcrumbs } from "@menhealth/ui";
import { MEDICAL_DISCLAIMER_TEXT } from "@/lib/site-brand";
import { createMetadata } from "@/lib/seo/site-metadata";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.menhealth-digest.com";

export const metadata: Metadata = createMetadata({
  title: "About Us",
  description:
    "Why MenHealth Digest exists, what we do, and how we approach men's health content.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-12">
      <PageBreadcrumbs
        baseUrl={APP_URL}
        trail={[{ label: "About", href: "/about" }]}
      />
      <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900">
        About MenHealth Digest
      </h1>
```

- [ ] **Step 2: Apply the same transform to the remaining 15 files**

For each: add the `PageBreadcrumbs` import (merging into the file's existing `@menhealth/ui` import if one exists), add the `APP_URL` constant if missing, insert `<PageBreadcrumbs baseUrl={APP_URL} trail={...} />` as the first line inside the JSX returned from `<main ...>` (immediately after the opening `<main>` tag, before whatever was first — an `<h1>`, a `<JsonLd>` call, or a `<header>`).

| File                            | Trail (exact)                                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `affiliate-disclosure/page.tsx` | `[{ label: 'Affiliate Disclosure', href: '/affiliate-disclosure' }]`                                                             |
| `claims/page.tsx`               | `[{ label: 'Claims', href: '/claims' }]`                                                                                         |
| `contact/page.tsx`              | `[{ label: 'Contact', href: '/contact' }]`                                                                                       |
| `creators/page.tsx`             | `[{ label: 'Creators', href: '/creators' }]`                                                                                     |
| `editorial-process/page.tsx`    | `[{ label: 'Editorial Process', href: '/editorial-process' }]`                                                                   |
| `how-we-rate-evidence/page.tsx` | `[{ label: 'How We Rate Evidence', href: '/how-we-rate-evidence' }]`                                                             |
| `newsletter/page.tsx`           | `[{ label: 'Newsletter', href: '/newsletter' }]`                                                                                 |
| `newsletter/archive/page.tsx`   | `[{ label: 'Newsletter', href: '/newsletter' }, { label: 'Archive', href: '/newsletter/archive' }]`                              |
| `privacy/page.tsx`              | `[{ label: 'Privacy Policy', href: '/privacy' }]`                                                                                |
| `rankings/page.tsx`             | `[{ label: 'Rankings', href: '/rankings' }]`                                                                                     |
| `reports/page.tsx`              | `[{ label: 'Reports', href: '/reports' }]`                                                                                       |
| `topics/page.tsx`               | `[{ label: 'Topics', href: '/topics' }]`                                                                                         |
| `weekly/page.tsx`               | `[{ label: 'Weekly trends', href: '/weekly' }]`                                                                                  |
| `medical-disclaimer/page.tsx`   | `[{ label: 'Medical Disclaimer', href: '/medical-disclaimer' }]`                                                                 |
| `widgets/page.tsx`              | `[{ label: 'Widgets', href: '/widgets' }]` — this file already has a local `APP_URL` constant; reuse it, don't add a second one. |

Note: `claims/page.tsx`, `creators/page.tsx`, `rankings/page.tsx`, `topics/page.tsx` currently start their `<main>` with `<JsonLd schema={itemListSchema} />` as the first child — put `<PageBreadcrumbs .../>` immediately after that `<JsonLd>` call (order between the two doesn't matter functionally, but keep `<JsonLd>` first to match this codebase's existing convention of JSON-LD before visible content in every other migrated file).

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter menhealth typecheck`
Expected: no errors.

- [ ] **Step 4: Lint**

Run: `pnpm --filter menhealth lint`
Expected: no errors.

- [ ] **Step 5: Run the full test suite**

Run: `pnpm --filter menhealth test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/menhealth/app/\(public\)/about apps/menhealth/app/\(public\)/affiliate-disclosure apps/menhealth/app/\(public\)/claims/page.tsx apps/menhealth/app/\(public\)/contact apps/menhealth/app/\(public\)/creators/page.tsx apps/menhealth/app/\(public\)/editorial-process apps/menhealth/app/\(public\)/how-we-rate-evidence apps/menhealth/app/\(public\)/newsletter/page.tsx apps/menhealth/app/\(public\)/newsletter/archive apps/menhealth/app/\(public\)/privacy apps/menhealth/app/\(public\)/rankings/page.tsx apps/menhealth/app/\(public\)/reports/page.tsx apps/menhealth/app/\(public\)/topics/page.tsx apps/menhealth/app/\(public\)/weekly/page.tsx apps/menhealth/app/\(public\)/medical-disclaimer apps/menhealth/app/\(public\)/widgets
git commit -m "feat(menhealth): add breadcrumbs to list and static pages that had none"
```

---

### Task 5: Add breadcrumbs to hype-check pages that currently have none

**Files (all `apps/hype-check/app/(public)/.../page.tsx`):**
`about`, `affiliate-disclosure`, `claims`, `contact`, `creators`, `editorial-process`, `how-we-rate-evidence`, `newsletter`, `newsletter/archive`, `privacy`, `rankings`, `reports`, `topics`, `weekly`, `disclaimer`, `widgets` — 16 files.

**Interfaces:**

- Consumes: `PageBreadcrumbs` from `@menhealth/ui` (Task 1).
- Produces: nothing consumed by later tasks.

Same transform and same trail labels as Task 4, applied to hype-check's copies, with two differences:

- `APP_URL` fallback literal is `'https://www.hype-check.net'`.
- hype-check's equivalent of `medical-disclaimer` is named `disclaimer` — trail: `[{ label: 'Disclaimer', href: '/disclaimer' }]`.

- [ ] **Step 1: Apply the Task 4 recipe to all 16 files, substituting the hype-check `APP_URL` fallback and the `disclaimer`/`Disclaimer` naming**

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter hype-check typecheck`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `pnpm --filter hype-check lint`
Expected: no errors.

- [ ] **Step 4: Run the full test suite**

Run: `pnpm --filter hype-check test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/hype-check/app/\(public\)/about apps/hype-check/app/\(public\)/affiliate-disclosure apps/hype-check/app/\(public\)/claims/page.tsx apps/hype-check/app/\(public\)/contact apps/hype-check/app/\(public\)/creators/page.tsx apps/hype-check/app/\(public\)/editorial-process apps/hype-check/app/\(public\)/how-we-rate-evidence apps/hype-check/app/\(public\)/newsletter/page.tsx apps/hype-check/app/\(public\)/newsletter/archive apps/hype-check/app/\(public\)/privacy apps/hype-check/app/\(public\)/rankings/page.tsx apps/hype-check/app/\(public\)/reports/page.tsx apps/hype-check/app/\(public\)/topics/page.tsx apps/hype-check/app/\(public\)/weekly/page.tsx apps/hype-check/app/\(public\)/disclaimer apps/hype-check/app/\(public\)/widgets
git commit -m "feat(hype-check): add breadcrumbs to list and static pages that had none"
```

---

### Task 6: Final verification

**Files:** none created or modified — this task only runs checks.

**Interfaces:**

- Consumes: everything from Tasks 1–5.
- Produces: nothing.

- [ ] **Step 1: Full typecheck, lint, and test across the monorepo**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all pass across every app/package.

- [ ] **Step 2: Confirm no page still hand-rolls a breadcrumb nav**

Run: `grep -rl 'aria-label="Breadcrumb"' apps/menhealth/app apps/hype-check/app --include="*.tsx"; grep -rln "buildBreadcrumbSchema" apps/menhealth/app apps/hype-check/app --include="*.tsx"`
Expected: both commands return no matches — every `buildBreadcrumbSchema` call now lives inside `PageBreadcrumbs` itself (`packages/ui/src/seo/PageBreadcrumbs.tsx`), not in any page file.

- [ ] **Step 3: Manual dev-server spot check — menhealth**

Run: `pnpm --filter menhealth dev` and in a browser check:

- `/about` (static, single-item trail) — "Home / About"
- `/topics` (list) — "Home / Topics"
- `/topics/testosterone` (nested detail) — "Home / Topics / Testosterone", confirm it's a clickable link back to `/topics`
- View source on `/topics/testosterone`, confirm exactly one `<script type="application/ld+json">` containing `"@type":"BreadcrumbList"` with 3 `itemListElement` entries (Home, Topics, Testosterone) — this is the specific drift bug from the design doc, confirm it's gone.
- `/signin` — confirm no breadcrumb renders.

- [ ] **Step 4: Manual dev-server spot check — hype-check**

Run: `pnpm --filter hype-check dev` and repeat the same checks against hype-check's equivalent URLs (`/about`, `/topics`, `/topics/<any-topic-slug>`, `/signin`).

- [ ] **Step 5: Stop both dev servers**

No commit for this task — it's verification only.
