# menhealth SEO foundation pass + testosterone pillar pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship five low-risk SEO/structural improvements across all existing menhealth topic hub pages (natural-language titles/metas, repositioned takeaways, inline citations, clickable `VideoCard` topic badges), plus one hand-authored, real-citation long-form pillar article for the testosterone topic as a reviewable pattern for future topics.

**Architecture:** All changes are additive/optional-field extensions to existing static-content modules (`lib/seo/topic-faq.ts`, `lib/seo/topic-content.ts`) and the existing `topics/[slug]/page.tsx` render tree — no new DB tables, no new admin workflow. `VideoCard` in `packages/ui` gets one new optional prop with a backward-compatible fallback path so `hype-check` is untouched. The long-form article is hand-written, sourced via `WebSearch` ahead of time (already done — see Task 5), and rendered through a small, unit-tested citation-marker parser.

**Tech Stack:** Next.js 16 App Router (Server Components), TypeScript strict, Prisma/PostgreSQL, Tailwind, Vitest.

**Spec:** [docs/superpowers/specs/2026-08-13-menhealth-seo-foundation-design.md](../specs/2026-08-13-menhealth-seo-foundation-design.md)

## Global Constraints

- No fabricated citations anywhere — every citation in the testosterone long-form article links a real, findable source (PubMed / NEJM / Endocrine Society / peer-reviewed journal). No placeholder or invented URLs.
- Testosterone is a HIGH-risk category (`CATEGORY_RISK_FLOOR`, `site.config.ts`) — the PR description must explicitly call out the new medical claims/citations in Task 5 for human review before merge. This is hand-authored static content reviewed via normal PR process, not the AI claim-approval pipeline (non-goal — do not touch `Claim`/`VideoSummary`/`auto-publish-gate.ts`).
- No new DB schema, no new admin-approval workflow for static topic content.
- No changes to `apps/hype-check`. The `VideoCard` prop addition must stay 100% backward-compatible — existing `topicNames`-only callers (all of `hype-check`, plus any menhealth call site not touched in Task 4) keep rendering exactly as before.
- No reordering of existing topic-page sections beyond the Key Takeaways move (Task 2) and the new long-form section insertion (Task 5). Beginner Guide, Evidence overview, Top claims, Common myths, video grid, and FAQ keep their current relative order and styling.
- No FAQ schema/structure changes.
- `pnpm typecheck` and `pnpm build` must pass for `apps/menhealth`, `packages/ui`, and `apps/hype-check` after every task that touches shared code.
- Medical disclaimer: `topics/[slug]/page.tsx` already renders `<Disclaimer text={MEDICAL_DISCLAIMER_TEXT} />` page-wide — no new disclaimer needed for the long-form section.

**Note on topic count:** the spec says "14 existing topics" but `apps/menhealth/site.config.ts` currently defines 15 topic entries (`testosterone`, `fitness-over-40`, `muscle-gain`, `longevity`, `sleep`, `mental-health`, `nutrition`, `weight-loss`, `hair-loss`, `fertility`, `prostate-health`, `erectile-dysfunction`, `biohacking`, `supplements`, `mens-health`). This plan covers all 15 for Task 1 (titles/metas) since `TOPIC_SEO` in `lib/seo/topic-faq.ts` already has entries for all 15 and the goal is full coverage, not a specific count.

---

### Task 1: Natural-language titles & meta descriptions

**Files:**
- Modify: `apps/menhealth/lib/seo/topic-faq.ts` (add `title`/`metaDescription` fields to `TopicSeoData`, populate all 15 entries)
- Modify: `apps/menhealth/app/(public)/topics/[slug]/page.tsx:42-72` (`generateMetadata`)
- Modify: `apps/menhealth/__tests__/seo-content-coverage.test.ts` (add coverage test)

**Interfaces:**
- Produces: `TopicSeoData.title?: string`, `TopicSeoData.metaDescription?: string` — consumed by `generateMetadata()` in `topics/[slug]/page.tsx`. Not consumed anywhere else (the in-page `seo` object built inside `TopicPage()` is unrelated and untouched).

- [ ] **Step 1: Add the two new optional fields to `TopicSeoData` and populate all 15 topics**

In `apps/menhealth/lib/seo/topic-faq.ts`, change the type at the top of the file:

```ts
export type TopicSeoData = {
  title?: string;
  metaDescription?: string;
  intro: string;
  faq: FaqEntry[];
};
```

Then add `title` and `metaDescription` as the first two fields inside each of the 15 entries in `TOPIC_SEO` (values below — copy each pair into its matching topic's object, right before `intro:`):

```ts
// testosterone
title: "Testosterone & Aging: What the Evidence Actually Shows",
metaDescription: "How fast testosterone really declines with age, what actually raises it, and what current research says about TRT safety — evidence-based, not hype.",

// fitness-over-40
title: "Training After 40: What Actually Works",
metaDescription: "How to train, recover, and build muscle after 40 — evidence-backed guidance on volume, recovery, and protein for men in their 40s and 50s.",

// muscle-gain
title: "How Muscle Growth Actually Works",
metaDescription: "The evidence behind building muscle: progressive overload, protein targets, and how long real hypertrophy actually takes.",

// longevity
title: "What the Longevity Evidence Actually Supports",
metaDescription: "VO2 max, strength, sleep, and metabolic health — the longevity interventions with real evidence, and the supplements that don't have it yet.",

// sleep
title: "Why Sleep Is the Most Underrated Men's Health Lever",
metaDescription: "How sleep affects testosterone, recovery, and cardiovascular risk — and what actually helps versus what's marketing noise.",

// mental-health
title: "Men's Mental Health: Signs, Evidence, and What Helps",
metaDescription: "How depression and anxiety show up differently in men, why help-seeking lags, and what the evidence says actually works.",

// nutrition
title: "Men's Nutrition: What the Evidence Actually Says",
metaDescription: "Protein targets, whole-food patterns, and why no single diet wins — an evidence-based look at nutrition for men's health.",

// weight-loss
title: "Sustainable Fat Loss: What Actually Works",
metaDescription: "The evidence behind fat loss: calorie deficits, protein, and why most 'fat-burning' shortcuts don't hold up.",

// hair-loss
title: "Male Hair Loss: What Treatments Actually Work",
metaDescription: "Why male pattern baldness happens, and which treatments — finasteride, minoxidil — have real clinical evidence behind them.",

// fertility
title: "Male Fertility: What Affects It and What to Do",
metaDescription: "The lifestyle factors that measurably affect sperm quality, and when a semen analysis is worth getting.",

// prostate-health
title: "Prostate Health: Screening, Risk, and Evidence",
metaDescription: "When to start PSA screening, how BPH differs from prostate cancer, and what the evidence says about prevention.",

// erectile-dysfunction
title: "Erectile Dysfunction: Causes, Evidence, and Treatment",
metaDescription: "Why ED is often a cardiovascular warning sign, not just a psychological one — and what treatments actually have evidence.",

// biohacking
title: "Biohacking: Separating Evidence From Noise",
metaDescription: "Which biohacks — cold exposure, fasting, wearables — have real evidence, and which are expensive guesswork.",

// supplements
title: "Men's Supplements: What the Evidence Actually Supports",
metaDescription: "Which supplements have real evidence behind them — and why most testosterone boosters and proprietary blends don't.",

// mens-health
title: "Men's Health Basics: What Actually Matters",
metaDescription: "The screenings, habits, and evidence-based fundamentals that explain why men live shorter, less healthy lives — and how to change that.",
```

- [ ] **Step 2: Wire the fallback into `generateMetadata`**

In `apps/menhealth/app/(public)/topics/[slug]/page.tsx`, replace the body of `generateMetadata`:

```ts
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = TOPIC_SEEDS.find((t) => t.slug === slug);
  if (!topic) return { title: 'Topic Not Found' };

  const seo = getTopicSeo(slug);
  const title = seo?.title ?? `${topic.name} — Men's Health Guide`;
  const description = seo?.metaDescription ?? seo?.intro ?? topic.description;
  const canonical = `${APP_URL}/topics/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    keywords: [topic.name, "men's health", 'health guide', 'evidence-based'],
  };
}
```

This preserves current behavior for any topic without a `title`/`metaDescription` (none will exist after Step 1, but the fallback stays so future topics without rewritten copy still render correctly).

- [ ] **Step 3: Add a coverage test**

In `apps/menhealth/__tests__/seo-content-coverage.test.ts`, add a new test inside the existing `describe("topic content coverage", ...)` block (after the `"has FAQ data for every topic"` test):

```ts
  it("has a rewritten title and meta description for every topic", () => {
    const allSeo = getAllTopicSeo();
    const missing = TOPIC_SEEDS.filter(
      (t) => !allSeo[t.slug]?.title || !allSeo[t.slug]?.metaDescription
    );
    expect(missing.map((t) => t.slug)).toEqual([]);
  });
```

- [ ] **Step 4: Run the test suite**

Run: `cd apps/menhealth && pnpm test -- seo-content-coverage`
Expected: PASS, including the new test.

- [ ] **Step 5: Typecheck**

Run: `cd apps/menhealth && pnpm typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/menhealth/lib/seo/topic-faq.ts apps/menhealth/app/\(public\)/topics/\[slug\]/page.tsx apps/menhealth/__tests__/seo-content-coverage.test.ts
git commit -m "feat(menhealth): natural-language titles and meta descriptions for all topics"
```

---

### Task 2: Reposition Key Takeaways above the fold

**Files:**
- Modify: `apps/menhealth/app/(public)/topics/[slug]/page.tsx` (move + restyle the "Evidence-aware takeaways" section)

**Interfaces:**
- Consumes: `staticContent?.takeaways: string[]` (already exists on `TopicContent`, from `getTopicContent(slug)` — unchanged).
- No new interfaces produced. Task 5 depends on this task's final section order (long-form section renders directly after this one).

- [ ] **Step 1: Delete the takeaways section from its current position**

In `apps/menhealth/app/(public)/topics/[slug]/page.tsx`, remove this block (currently between the Common Myths section and the video grid, right after the Common Myths `</section>` and before `{/* Video grid */}`):

```tsx
      {/* Evidence-Aware Takeaways */}
      {staticContent?.takeaways && staticContent.takeaways.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Evidence-aware takeaways
          </h2>
          <ul className="space-y-2">
            {staticContent.takeaways.map((takeaway, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-700">
                <span className="mt-0.5 text-emerald-600">✓</span>
                {takeaway}
              </li>
            ))}
          </ul>
        </section>
      )}
```

- [ ] **Step 2: Re-insert it, restyled, directly after the hero `<header>` and before Beginner Guide**

Insert this immediately after the closing `</header>` tag and before the `{/* Beginner Guide */}` comment:

```tsx
      {/* Key Takeaways */}
      {staticContent?.takeaways && staticContent.takeaways.length > 0 && (
        <section className="mb-10 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Key takeaways
          </h2>
          <ul className="space-y-2">
            {staticContent.takeaways.map((takeaway, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-700">
                <span className="mt-0.5 text-emerald-600">✓</span>
                {takeaway}
              </li>
            ))}
          </ul>
        </section>
      )}
```

This matches the Beginner Guide box's visual treatment (`rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-6`, `text-lg font-semibold` heading) instead of the old plain `<section className="mb-10">` / `text-xl` heading.

- [ ] **Step 3: Typecheck and visually verify**

Run: `cd apps/menhealth && pnpm typecheck`
Expected: no errors.

Run the dev server (`pnpm dev` from `apps/menhealth`) and load `http://localhost:3000/topics/sleep` — confirm the Key Takeaways box now renders directly under the hero, styled like the Beginner Guide box, and no longer appears near the bottom of the page.

- [ ] **Step 4: Commit**

```bash
git add "apps/menhealth/app/(public)/topics/[slug]/page.tsx"
git commit -m "feat(menhealth): move Key Takeaways above the fold on topic pages"
```

---

### Task 3: Inline citations on topic pages

**Files:**
- Modify: `apps/menhealth/app/(public)/topics/[slug]/page.tsx` (topicClaims query `select` + claim `<li>` render)

**Interfaces:**
- Consumes: Prisma `Claim.sources: EvidenceSource[]` relation (`apps/menhealth/prisma/schema.prisma:171-198`, fields `title`, `url`).
- No new interfaces produced.

- [ ] **Step 1: Add `sources` to the `topicClaims` query select**

In `apps/menhealth/app/(public)/topics/[slug]/page.tsx`, change the `topicClaims` query:

```ts
  const topicClaims = topic
    ? await db.claim.findMany({
        where: {
          video: {
            status: 'PUBLISHED',
            topics: { some: { topicId: topic.id } },
          },
          slug: { not: null },
        },
        take: 3,
        orderBy: { riskLevel: 'desc' },
        select: {
          id: true,
          text: true,
          evidenceStatus: true,
          slug: true,
          sources: { select: { title: true, url: true }, take: 1 },
        },
      })
    : [];
```

- [ ] **Step 2: Render the inline citation beneath the claim text**

Replace the DB-driven claim `<li>` (the `topicClaims.length > 0 ? topicClaims.map(...)` branch — leave the `staticContent?.topClaims?.map(...)` fallback branch untouched):

```tsx
              ? topicClaims.map((claim) => (
                  <li
                    key={claim.id}
                    className="rounded-xl border border-gray-200 bg-white px-5 py-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex-1 text-sm text-gray-800">
                        &ldquo;{claim.text}&rdquo;
                      </span>
                      <EvidenceBadge
                        status={claim.evidenceStatus}
                        showNotChecked
                      />
                    </div>
                    {claim.sources[0] && (
                      <p className="mt-2 text-xs text-gray-600">
                        Source:{' '}
                        <a
                          href={claim.sources[0].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          {claim.sources[0].title}
                        </a>
                      </p>
                    )}
                    {claim.slug && (
                      <Link
                        href={`/claims/${claim.slug}`}
                        className="mt-2 inline-block text-xs font-medium text-emerald-700 hover:underline"
                      >
                        See evidence →
                      </Link>
                    )}
                  </li>
                ))
```

Claims with zero `EvidenceSource` rows keep today's behavior — no `Source:` line renders, just the badge and the "See evidence →" link-through.

- [ ] **Step 3: Typecheck**

Run: `cd apps/menhealth && pnpm typecheck`
Expected: no errors (confirms `claim.sources[0]` is typed correctly off the new Prisma select shape).

- [ ] **Step 4: Manual verification**

Run the dev server and load a topic page whose claims have `EvidenceSource` rows (check via `SELECT slug FROM "Claim" c JOIN "EvidenceSource" s ON s."claimId" = c.id WHERE c."videoId" IN (SELECT id FROM "Video" WHERE status='PUBLISHED') LIMIT 1;` against the local DB, or just check `/topics/testosterone` after a `pnpm db:seed`/sync run) — confirm the "Source: <title>" line renders as a working external link beneath the claim text, and claims without sources still show only the evidence badge and "See evidence →" link.

- [ ] **Step 5: Commit**

```bash
git add "apps/menhealth/app/(public)/topics/[slug]/page.tsx"
git commit -m "feat(menhealth): show inline evidence citations on topic pages"
```

---

### Task 4: Clickable topic badges on VideoCard

**Files:**
- Modify: `packages/ui/src/video/VideoCard.tsx`
- Modify: `apps/menhealth/app/(public)/page.tsx`
- Modify: `apps/menhealth/app/(public)/rankings/[topic]/page.tsx`
- Modify: `apps/menhealth/app/(public)/creators/[slug]/page.tsx`
- Modify: `apps/menhealth/app/(public)/weekly/[slug]/page.tsx` (2 call sites)
- Modify: `apps/menhealth/app/(public)/topics/[slug]/page.tsx` (2 call sites)

**Interfaces:**
- Produces: `VideoCardProps.topics?: Array<{ name: string; slug: string }>` — optional, additive. When omitted, `topicNames: string[]` renders exactly as before (plain `<span>`, no link) — this is the path `apps/hype-check` and any untouched menhealth call site keeps using.
- Consumes (in the 7 menhealth call sites): `video.topics: Array<{ topic: { name: string; slug: string } }>` — already returned by every query in `apps/menhealth/lib/db/queries.ts` via `topics: { include: { topic: true } }`, so `vt.topic.slug` is already available with no query changes needed.

- [ ] **Step 1: Add the `topics` prop and restructure the card markup**

Replace the full contents of `packages/ui/src/video/VideoCard.tsx`:

```tsx
import Image from 'next/image';
import Link from 'next/link';
import { EvidenceBadge } from '../ui/EvidenceBadge';
import { RiskBadge } from '../ui/RiskBadge';

type VideoCardProps = {
  slug: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  shortSummary: string | null;
  trendScore: number;
  topicNames: string[];
  topics?: Array<{ name: string; slug: string }>;
  riskLevel?: string;
  evidenceLabel?: string;
  durationSeconds?: number;
  customSizes?: string;
  priority?: boolean;
};

export function VideoCard({
  slug,
  title,
  channelTitle,
  thumbnailUrl,
  shortSummary,
  topicNames,
  topics,
  riskLevel,
  evidenceLabel,
  durationSeconds,
  customSizes,
  priority,
}: VideoCardProps) {
  const watchTimeMin = durationSeconds ? Math.ceil(durationSeconds / 60) : null;

  const sizes = customSizes ?? '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';

  return (
    <div className="border-hairline group flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-center gap-1.5 px-4 pt-4">
        {topics
          ? topics.slice(0, 2).map((t) => (
              <Link
                key={t.slug}
                href={`/topics/${t.slug}`}
                className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 hover:bg-emerald-200"
              >
                {t.name}
              </Link>
            ))
          : topicNames.slice(0, 2).map((name) => (
              <span key={name} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                {name}
              </span>
            ))}
        {riskLevel && riskLevel !== 'LOW' && <RiskBadge level={riskLevel} />}
      </div>
      <Link href={`/videos/${slug}`} className="flex flex-1 flex-col">
        {thumbnailUrl && (
          <div className="relative aspect-video w-full bg-gray-100">
            <Image src={thumbnailUrl} alt={title} fill className="object-cover" sizes={sizes} priority={priority} />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-2 p-4">
          {(evidenceLabel || watchTimeMin) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {evidenceLabel && <EvidenceBadge status={evidenceLabel} />}
              {watchTimeMin && <span className="text-xs text-gray-500">{watchTimeMin} min watch</span>}
            </div>
          )}
          <h3 className="line-clamp-2 text-base font-semibold text-gray-900 group-hover:text-emerald-700">{title}</h3>
          {shortSummary && <p className="line-clamp-2 text-sm text-gray-700">{shortSummary}</p>}
          <p className="mt-auto text-xs text-gray-500">{channelTitle}</p>
        </div>
      </Link>
    </div>
  );
}
```

Key structural change: the outer element is now a `<div>` carrying the border/shadow/`group` classes (was previously on the all-encompassing `<Link>`). The topic-badge row is a sibling `<div>` rendered before an inner `<Link>` that wraps the thumbnail and the title/summary/channel block — this avoids nested `<a>` tags while topic badges are real, independently-clickable anchors. `group-hover:text-emerald-700` on the `<h3>` still works because Tailwind's `group-hover` matches any descendant of the nearest ancestor with the `group` class, regardless of the intervening `<Link>`.

- [ ] **Step 2: Typecheck `packages/ui`**

Run: `cd packages/ui && pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Update the 7 menhealth call sites**

In each of the following files, change the `<VideoCard ... topicNames={X.topics.map((vt) => vt.topic.name)} ... />` call to also pass `topics`:

`apps/menhealth/app/(public)/page.tsx:130-140` (approx) — change:
```tsx
                topicNames={video.topics.map((vt) => vt.topic.name)}
```
to:
```tsx
                topicNames={video.topics.map((vt) => vt.topic.name)}
                topics={video.topics.map((vt) => ({ name: vt.topic.name, slug: vt.topic.slug }))}
```

`apps/menhealth/app/(public)/rankings/[topic]/page.tsx` — same change for the `topicNames={video.topics.map((vt) => vt.topic.name)}` line inside the `<VideoCard>` call.

`apps/menhealth/app/(public)/creators/[slug]/page.tsx` — same change for the `topicNames={video.topics.map((vt) => vt.topic.name)}` line inside the `<VideoCard>` call.

`apps/menhealth/app/(public)/weekly/[slug]/page.tsx` — two call sites:
1. `topicNames={topVideo.topics.map((vt) => vt.topic.name)}` → add `topics={topVideo.topics.map((vt) => ({ name: vt.topic.name, slug: vt.topic.slug }))}`.
2. The `const topicNames = video.topics.map((vt) => vt.topic.name);` / `topicNames={topicNames}` pair — add a sibling `const topics = video.topics.map((vt) => ({ name: vt.topic.name, slug: vt.topic.slug }));` and pass `topics={topics}` alongside `topicNames={topicNames}`.

`apps/menhealth/app/(public)/topics/[slug]/page.tsx` — two call sites (Featured this week grid and All videos grid), both currently:
```tsx
                topicNames={video.topics.map(
                  (vt: (typeof video.topics)[number]) => vt.topic.name
                )}
```
Add directly below each:
```tsx
                topics={video.topics.map(
                  (vt: (typeof video.topics)[number]) => ({
                    name: vt.topic.name,
                    slug: vt.topic.slug,
                  })
                )}
```

Do **not** touch any file under `apps/hype-check/` — those keep passing only `topicNames` and will render the plain-`<span>` fallback path, unchanged.

- [ ] **Step 4: Typecheck and build both apps**

Run: `cd apps/menhealth && pnpm typecheck && pnpm build`
Expected: no errors.

Run: `cd apps/hype-check && pnpm typecheck && pnpm build`
Expected: no errors — confirms `hype-check`'s existing `VideoCard` usage (still `topicNames`-only) is unaffected by the additive prop.

- [ ] **Step 5: Manual check for nested anchors**

Run the menhealth dev server, load `/` (or any page with a video grid), open browser devtools, and inspect a `VideoCard`'s rendered HTML — confirm there is no `<a>` nested inside another `<a>`, and that clicking a topic badge navigates to `/topics/<slug>` while clicking the thumbnail/title navigates to `/videos/<slug>`.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/video/VideoCard.tsx \
  "apps/menhealth/app/(public)/page.tsx" \
  "apps/menhealth/app/(public)/rankings/[topic]/page.tsx" \
  "apps/menhealth/app/(public)/creators/[slug]/page.tsx" \
  "apps/menhealth/app/(public)/weekly/[slug]/page.tsx" \
  "apps/menhealth/app/(public)/topics/[slug]/page.tsx"
git commit -m "feat(ui): make VideoCard topic badges clickable links to topic pages"
```

---

### Task 5: Testosterone pillar article (pilot) — HIGH-RISK, requires human review

**Files:**
- Modify: `apps/menhealth/lib/seo/topic-content.ts` (add `longForm` field to `TopicContent`, add `parseParagraphCitations` helper, populate `testosterone.longForm`)
- Create: `apps/menhealth/__tests__/paragraph-citations.test.ts`
- Modify: `apps/menhealth/app/(public)/topics/[slug]/page.tsx` (render the long-form section)

**Interfaces:**
- Produces: `TopicContent.longForm?: { intro: string; sections: Array<{ heading: string; paragraphs: string[]; citations?: Array<{ label: string; url: string }> }> }`.
- Produces: `parseParagraphCitations(text: string): Array<{ type: 'text'; value: string } | { type: 'citation'; index: number }>` — exported from `lib/seo/topic-content.ts`, consumed by the render step in this task. `index` is 0-based and refers to the position in that *section's* `citations` array (bracket marker `[1]` in prose → `index: 0`).

**Compliance note for the PR description:** this task adds new, specific medical claims (age-related testosterone decline rate, sleep's effect on testosterone, resistance training's effect on basal testosterone, TRT cardiovascular/hematocrit/fertility risk data) to a HIGH-risk category topic. All six citations below were found via `WebSearch` against PubMed, NEJM, and the Endocrine Society — none are fabricated. Flag this task's diff explicitly for review of medical-claim accuracy before merging, per `AGENTS.md`'s HIGH-risk-category rule.

- [ ] **Step 1: Write the failing test for the citation-marker parser**

Create `apps/menhealth/__tests__/paragraph-citations.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseParagraphCitations } from "@/lib/seo/topic-content";

describe("parseParagraphCitations", () => {
  it("returns a single text token for prose with no citation markers", () => {
    expect(parseParagraphCitations("No markers here.")).toEqual([
      { type: "text", value: "No markers here." },
    ]);
  });

  it("splits text around a single citation marker", () => {
    expect(parseParagraphCitations("Levels decline [1] with age.")).toEqual([
      { type: "text", value: "Levels decline " },
      { type: "citation", index: 0 },
      { type: "text", value: " with age." },
    ]);
  });

  it("handles multiple citation markers with correct 0-based indices", () => {
    expect(parseParagraphCitations("First [1] then [2] then [3].")).toEqual([
      { type: "text", value: "First " },
      { type: "citation", index: 0 },
      { type: "text", value: " then " },
      { type: "citation", index: 1 },
      { type: "text", value: " then " },
      { type: "citation", index: 2 },
      { type: "text", value: "." },
    ]);
  });

  it("handles a marker at the very start or end of the string", () => {
    expect(parseParagraphCitations("[1] Leads the sentence.")).toEqual([
      { type: "citation", index: 0 },
      { type: "text", value: " Leads the sentence." },
    ]);
    expect(parseParagraphCitations("Ends the sentence [2]")).toEqual([
      { type: "text", value: "Ends the sentence " },
      { type: "citation", index: 1 },
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/menhealth && pnpm test -- paragraph-citations`
Expected: FAIL with "parseParagraphCitations is not a function" or a module-resolution error (the export doesn't exist yet).

- [ ] **Step 3: Implement `parseParagraphCitations` and the `longForm` type**

In `apps/menhealth/lib/seo/topic-content.ts`, add near the top of the file (after the existing imports/comment, before `export type TopicContent`):

```ts
export type ParagraphToken =
  | { type: "text"; value: string }
  | { type: "citation"; index: number };

export function parseParagraphCitations(text: string): ParagraphToken[] {
  return text
    .split(/(\[\d+\])/g)
    .filter((part) => part.length > 0)
    .map((part) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match) {
        return { type: "citation", index: Number(match[1]) - 1 };
      }
      return { type: "text", value: part };
    });
}
```

Then extend `TopicContent`:

```ts
export type TopicContent = {
  beginnerGuide: {
    heading: string;
    steps: string[];
  };
  topClaims: Array<{
    text: string;
    evidenceStatus: "SUPPORTED" | "MIXED" | "WEAK" | "UNSUPPORTED";
  }>;
  commonMyths: Array<{
    myth: string;
    reality: string;
  }>;
  takeaways: string[];
  longForm?: {
    intro: string;
    sections: Array<{
      heading: string;
      paragraphs: string[];
      citations?: Array<{ label: string; url: string }>;
    }>;
  };
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/menhealth && pnpm test -- paragraph-citations`
Expected: PASS, all 4 tests.

- [ ] **Step 5: Add the `longForm` content to the `testosterone` entry**

In `apps/menhealth/lib/seo/topic-content.ts`, add a `longForm` field to the `testosterone` entry in `TOPIC_CONTENT` (after `takeaways`, before the closing `},` of that entry):

```ts
    longForm: {
      intro:
        "Testosterone might be the most talked-about hormone in men's health content — and also one of the most misunderstood. Search results are dominated by supplement marketing, TRT clinic advertising, and confident claims that don't always survive contact with the primary research. This piece pulls together what long-running, peer-reviewed studies actually show about testosterone and aging: how fast levels really decline, which lifestyle factors genuinely move the needle, and what the newest clinical trial data says about the safety of testosterone replacement therapy. None of this replaces a conversation with a doctor — testosterone levels, symptoms, and treatment decisions are individual, and TRT in particular is a medical treatment with real trade-offs, not a lifestyle upgrade.",
      sections: [
        {
          heading: "How fast does testosterone actually decline with age?",
          paragraphs: [
            'The oft-repeated number is "about 1% per year after 30," and the underlying data holds up reasonably well. The Baltimore Longitudinal Study of Aging tracked testosterone in the same men over many years rather than comparing different age groups at a single point in time, which matters — it separates the effect of aging itself from differences between generations. That study found total testosterone declining at roughly 1% per year on average, with free testosterone (the fraction not bound to proteins in the blood, and arguably more biologically relevant) declining somewhat faster [1].',
            'To put that percentage in context: using the commonly cited reference range of roughly 300-1000 ng/dL for adult men, a 1% annual decline off a mid-range starting point works out to single-digit ng/dL per year in absolute terms for most men in their 30s and 40s — a slow drift, not a sudden drop. It\'s also why a testosterone level that looks "low" on paper needs to be interpreted against symptoms and a repeat test, not treated as an automatic red flag on its own.',
            "Two caveats are worth keeping in mind. First, this is a population average — individual trajectories vary widely, and a fit, lean 55-year-old can easily have higher testosterone than an unfit 30-year-old. Second, some researchers have found that average testosterone levels across entire generations of men appear to be trending lower at a given age, independent of ordinary aging — a pattern not fully explained by rising obesity rates alone [2]. The honest takeaway: age-related decline is real and gradual, not a cliff, and age isn't the whole story — body composition, sleep, and general health status all move the number more than most men expect.",
          ],
          citations: [
            {
              label: "Harman et al., J Clin Endocrinol Metab (2001) — Baltimore Longitudinal Study of Aging",
              url: "https://pubmed.ncbi.nlm.nih.gov/11158037/",
            },
            {
              label: "Travison et al., J Clin Endocrinol Metab (2007) — population-level decline in serum testosterone",
              url: "https://academic.oup.com/jcem/article-abstract/92/1/196/2598434",
            },
          ],
        },
        {
          heading: "Symptoms often blamed on low testosterone — that usually aren't",
          paragraphs: [
            'Low energy, reduced libido, and irritability get attributed to "low T" constantly, partly because supplement and clinic marketing has trained men to look for a hormonal explanation first. In practice, those same symptoms overlap heavily with poor sleep, chronic stress, depression, and thyroid dysfunction — all of which are far more common than clinically low testosterone, and none of which are fixed by raising a hormone level. This is part of why a careful diagnostic approach insists on a confirmed low blood test alongside symptoms, rather than symptoms alone: guessing from how you feel produces a lot of false positives. If you're tired, unmotivated, and low-libido, a blood test is a reasonable starting point — but so is an honest look at how much you're sleeping, how stressed you are, and whether anything else in your health picture (thyroid function, mood, medications, alcohol intake) could explain it just as well.',
          ],
        },
        {
          heading: "Sleep is the single highest-leverage lever",
          paragraphs: [
            'If there\'s one intervention with genuinely strong, mechanistic evidence behind it, it\'s sleep. In a tightly controlled laboratory study, healthy young men who were restricted to five hours of sleep a night for one week saw daytime testosterone levels drop by 10-15% compared to their own baseline after a full night\'s sleep — a decline the researchers described as roughly equivalent to the drop you\'d expect from 10 to 15 years of aging [1]. The effect showed up within days and was independent of cortisol changes, meaning it wasn\'t just generic "stress" — the sleep loss itself appears to blunt nocturnal testosterone production directly, since testosterone secretion is tightly tied to sleep architecture, particularly the deeper stages that get compressed first when total sleep time shrinks.',
            "The practical implication isn't subtle: for most men, fixing chronic short sleep (five to six hours a night, most nights) will do more for testosterone than any supplement on the market, and it costs nothing. It's also one of the few interventions here where the effect size, direction, and mechanism all point the same way, which is rarer in this field than marketing copy suggests.",
          ],
          citations: [
            {
              label: "Leproult & Van Cauter, JAMA (2011) — Effect of 1 Week of Sleep Restriction on Testosterone Levels in Young Healthy Men",
              url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4445839/",
            },
          ],
        },
        {
          heading: "What resistance training actually does — and doesn't do — for testosterone",
          paragraphs: [
            'Resistance training gets credited with "boosting testosterone" constantly, and the real picture is more nuanced than that framing suggests. A single training session does produce an acute, short-lived spike in circulating testosterone — that part is well documented. What\'s less settled is whether a regular resistance-training habit raises your baseline, resting testosterone level over the long run. A systematic review and meta-analysis focused on older men found that short-term exercise training, including resistance training, did not reliably shift basal testosterone levels — the pooled effect was close to zero, and results varied considerably between individual studies [1].',
            "That doesn't mean training is pointless for testosterone-adjacent health, or for men's health generally. Resistance training builds and preserves muscle mass and helps reduce body fat — and fat tissue contains aromatase, an enzyme that converts testosterone into estrogen, so carrying less excess body fat is associated with a healthier testosterone-to-estrogen ratio even if the training itself isn't reliably raising resting testosterone on its own. Adequate vitamin D and zinc status matter for the same reason: they're supportive of normal hormone production in men who are actually deficient, without acting as boosters in men who aren't. The more accurate, if less punchy, summary: train for strength, muscle, and body composition — all of which matter for how you feel and function day to day — without expecting your next lab-drawn testosterone number to move dramatically as a direct result.",
          ],
          citations: [
            {
              label: "Frontiers in Physiology systematic review & meta-analysis (2018) — Short-Term Exercise Training Inconsistently Influences Basal Testosterone in Older Men",
              url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6339914/",
            },
          ],
        },
        {
          heading: "TRT — what the newest safety data actually shows",
          paragraphs: [
            'Testosterone Replacement Therapy is a legitimate medical treatment for men with clinically diagnosed hypogonadism — not a performance supplement, and not something to start because a single number looked low. The Endocrine Society\'s clinical practice guideline is explicit that diagnosis requires both consistent, unequivocally low testosterone on repeat morning testing and real symptoms, partly because roughly 30% of men who test in the "low" range turn out to have normal levels when retested [1].',
            'For men who are appropriately diagnosed, the safety picture has gotten considerably clearer in recent years. The TRAVERSE trial — a large, randomized, placebo-controlled study of over 5,000 middle-aged and older men with documented hypogonadism and existing or elevated cardiovascular risk — found no increase in major adverse cardiovascular events with testosterone therapy compared with placebo, addressing a question that had lingered over TRT prescribing for years [2]. That\'s a genuinely reassuring result, but it isn\'t a blanket "TRT is safe, full stop." The same trial found a higher incidence of pulmonary embolism, abnormal heart rhythm (atrial fibrillation), and acute kidney injury in the testosterone group than in the placebo group [2].',
            "Separately, TRT reliably raises hematocrit (red blood cell concentration), which increases clotting risk and needs periodic blood-test monitoring, and it suppresses natural sperm production — relevant for men who haven't finished building their family and may need to discuss fertility-preserving options with a doctor before starting [3]. None of this makes TRT inherently dangerous for the right patient under proper monitoring — it makes it a real medical treatment with a real risk-benefit calculation, which is exactly why it requires a diagnosis, blood work, and an ongoing relationship with a doctor rather than a self-directed decision or an online purchase.",
          ],
          citations: [
            {
              label: "Bhasin et al., Endocrine Society Clinical Practice Guideline, J Clin Endocrinol Metab (2018)",
              url: "https://pubmed.ncbi.nlm.nih.gov/29562364/",
            },
            {
              label: "Lincoff et al., NEJM (2023) — Cardiovascular Safety of Testosterone-Replacement Therapy (TRAVERSE trial)",
              url: "https://www.nejm.org/doi/full/10.1056/NEJMoa2215025",
            },
            {
              label: "Management of Adverse Effects in Testosterone Replacement Therapy, PMC (2024)",
              url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12052019/",
            },
          ],
        },
        {
          heading: "What this actually means for you",
          paragraphs: [
            "None of the above is medical advice, and it isn't meant to replace a conversation with a doctor about your own situation — the disclaimer on this page applies to everything above. But if you're trying to separate signal from marketing noise: age-related decline is real but gradual and highly individual, so a single low reading isn't a diagnosis on its own. Plenty of the symptoms blamed on low testosterone have more mundane, more common explanations worth ruling out first. Sleep is the most evidence-backed lever most men are underusing, with an effect size that shows up in days, not months. Resistance training earns its place for body composition and overall health, even if its direct effect on your resting testosterone number is smaller than commonly claimed. And TRT, for men who are appropriately diagnosed, now has considerably better cardiovascular safety data than it did a few years ago — alongside a clearer, more specific list of risks worth discussing with a doctor before starting.",
            "The pattern across all of it: the unglamorous fundamentals — sleep, body composition, consistent training — do more of the work than most marketing suggests, and anything promising a fast, dramatic fix on testosterone specifically is worth treating with extra skepticism.",
          ],
        },
      ],
    },
```

Only the `testosterone` entry gets this field — every other topic's `TopicContent` object is unmodified.

- [ ] **Step 6: Render the long-form section in `topics/[slug]/page.tsx`**

In `apps/menhealth/app/(public)/topics/[slug]/page.tsx`, add this new `import`:

```ts
import { getTopicContent, parseParagraphCitations } from '@/lib/seo/topic-content';
```

(replacing the existing `import { getTopicContent } from '@/lib/seo/topic-content';` line).

Then insert this new section directly after the repositioned Key Takeaways `</section>` (from Task 2) and before `{/* Beginner Guide */}`:

```tsx
      {/* Long-form pillar content */}
      {staticContent?.longForm && (
        <section className="mb-10">
          <p className="mb-6 text-base leading-relaxed text-gray-700">
            {staticContent.longForm.intro}
          </p>
          {staticContent.longForm.sections.map((sub, i) => (
            <div key={i} className="mb-6">
              <h2 className="mb-3 text-xl font-semibold text-gray-900">
                {sub.heading}
              </h2>
              {sub.paragraphs.map((p, j) => (
                <p key={j} className="mb-3 text-sm leading-relaxed text-gray-700">
                  {parseParagraphCitations(p).map((token, k) =>
                    token.type === 'text' ? (
                      <span key={k}>{token.value}</span>
                    ) : sub.citations?.[token.index] ? (
                      <sup key={k}>
                        <a
                          href={sub.citations[token.index].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          [{token.index + 1}]
                        </a>
                      </sup>
                    ) : (
                      <span key={k}>[{token.index + 1}]</span>
                    )
                  )}
                </p>
              ))}
              {sub.citations && sub.citations.length > 0 && (
                <p className="mt-2 text-xs text-gray-600">
                  Sources:{' '}
                  {sub.citations.map((c, k) => (
                    <span key={c.url}>
                      {k > 0 && ', '}[{k + 1}]{' '}
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {c.label}
                      </a>
                    </span>
                  ))}
                </p>
              )}
            </div>
          ))}
        </section>
      )}
```

- [ ] **Step 7: Typecheck**

Run: `cd apps/menhealth && pnpm typecheck`
Expected: no errors.

- [ ] **Step 8: Manual verification**

Run the dev server and load `http://localhost:3000/topics/testosterone` — confirm:
- The long-form section renders between Key Takeaways and Beginner Guide.
- Each `[n]` marker in the prose is a clickable superscript link.
- Each section with citations has a "Sources" list at the end whose links match the inline markers.
- The word count of intro + all paragraphs is comfortably over 1,500 words (already verified at ~1,532 words during drafting).

Then load `http://localhost:3000/topics/sleep` (a non-pilot topic) — confirm it renders unchanged apart from the Key Takeaways repositioning and inline citations from Tasks 2–3 (no long-form section, since `sleep`'s `TopicContent` has no `longForm`).

- [ ] **Step 9: Run the full test suite**

Run: `cd apps/menhealth && pnpm test`
Expected: all tests pass, including `seo-content-coverage.test.ts` and the new `paragraph-citations.test.ts`.

- [ ] **Step 10: Commit**

```bash
git add apps/menhealth/lib/seo/topic-content.ts \
  apps/menhealth/__tests__/paragraph-citations.test.ts \
  "apps/menhealth/app/(public)/topics/[slug]/page.tsx"
git commit -m "feat(menhealth): add testosterone long-form pillar article with sourced citations

HIGH-risk category content (testosterone) — new medical claims and all
six citations (Baltimore Longitudinal Study of Aging, Leproult & Van
Cauter JAMA 2011, Frontiers systematic review, Endocrine Society
guideline, TRAVERSE trial NEJM, PMC adverse-effects review) were
sourced via WebSearch from PubMed/NEJM/Endocrine Society. Flagging for
explicit human review of claim accuracy before merge per AGENTS.md."
```

---

## Final verification (after all 5 tasks)

- [ ] Run `pnpm typecheck` and `pnpm build` from the repo root (or per-app) for `apps/menhealth`, `apps/hype-check`, and `packages/ui` — all must pass.
- [ ] Run `cd apps/menhealth && pnpm test` — full suite passes.
- [ ] Manually browse `/topics/testosterone` and `/topics/sleep` in the dev server, plus the homepage and one `/rankings/[topic]` page, to confirm `VideoCard` topic badges are clickable and no console errors appear.
- [ ] Confirm the PR description explicitly calls out Task 5's medical claims/citations for review (HIGH-risk category gate).
