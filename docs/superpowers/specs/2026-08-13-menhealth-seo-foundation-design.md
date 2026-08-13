# menhealth SEO foundation pass + testosterone pillar pilot

Scope: `apps/menhealth` topic hub pages (`lib/seo/topic-faq.ts`,
`lib/seo/topic-content.ts`, `app/(public)/topics/[slug]/page.tsx`) and the
shared `VideoCard` component (`packages/ui/src/video/VideoCard.tsx`).

## Problem

A 2026-08-13 SEO audit compared menhealth-digest.com against three top-
ranking comparables for evidence-based men's-health queries (Harvard
Health, FlowMale, The Longevity Store) and flagged several on-page gaps:
generic single-word topic titles, no long-form pillar content, no inline
per-page citations, takeaways buried instead of prominent, and weak
internal linking between video cards and topic hub pages.

Investigating the current code shows the picture is narrower than the
audit assumed — FAQ blocks with FAQ schema, an "Evidence-aware takeaways"
section, real per-claim citations (`EvidenceSource` rows in Postgres), and
video-page reviewer bylines (`reviewerName`/`reviewerCredentials`) already
exist. The genuine gaps are: template-y titles, takeaways positioned near
the bottom instead of the top, citations only reachable via a link-through
to `/claims/[slug]` instead of inlined on the topic page itself, `VideoCard`
topic badges not being links, and no long-form narrative content anywhere
(topic pages are structured/bulleted, not prose).

Long-form pillar content is the single biggest gap, but it's also the
highest-risk one: several menhealth topics (testosterone, supplements,
mental-health, erectile-dysfunction) are HIGH-risk categories under
`AGENTS.md`, which requires human review before AI-assisted health content
ships. Bulk-drafting 1,500+-word articles for all 14 topics in one pass
would mean shipping under-reviewed medical copy live in one shot.

## Goal

- Ship the low-risk, high-confidence structural/technical items across all
  14 existing topics: natural-language titles/metas, Key Takeaways box
  moved to the top of the page, real inline citations on topic pages, and
  clickable topic badges on `VideoCard`.
- Hand-draft one long-form pillar article (testosterone) end-to-end as a
  reusable content pattern/schema, using real sourced citations (via
  `WebSearch`) for any new specific claims — not fabricated ones — so the
  user can review voice, structure, and medical-claim accuracy before the
  same pattern is used to write the remaining 13 topics in a follow-up.
- Because testosterone is a HIGH-risk category, the drafted article's
  specific health claims and citations are called out explicitly for the
  user's review before being treated as final/mergeable — the human
  code-review step on this PR is the equivalent of the admin-approval gate
  the AI publishing pipeline has for video/claim content.

## Non-goals

- No long-form articles for the other 13 topics in this pass — follow-up
  work once the testosterone pattern is reviewed and approved.
- No new DB schema/admin-approval workflow for static topic content. This
  content is hand-authored and reviewed via the normal PR/code-review
  process (the same way `topic-content.ts` and `topic-faq.ts` already work
  today), not through the `Claim`/`VideoSummary` AI-approval pipeline —
  that pipeline is for AI output generated from scraped video claims, which
  this isn't.
- No changes to `hype-check`. The `VideoCard` prop addition is additive and
  backward-compatible (existing `topicNames` callers, including all of
  `hype-check`, are untouched), but no hype-check call sites are updated in
  this pass.
- No fabricated citations. Where the testosterone article needs a citation
  for a new specific claim, it links a real source found via `WebSearch`
  (PubMed, major medical bodies, e.g. Endocrine Society guidelines) — if a
  claim can't be backed by a real, findable source, it's either dropped or
  phrased as directional/observational rather than stated as fact.
- No reordering of existing topic-page sections beyond moving Key
  Takeaways to the top and inserting the new long-form section — Beginner
  Guide, Evidence overview, Top claims, Common myths, video grid, and FAQ
  keep their current relative order and styling.
- No FAQ schema/structure changes — already implemented and working.

## Design

### 1. Titles & meta descriptions

`TopicSeoData` in `lib/seo/topic-faq.ts` gets two new optional fields:

```ts
export type TopicSeoData = {
  title?: string;
  metaDescription?: string;
  intro: string;
  faq: FaqEntry[];
};
```

`generateMetadata()` in `topics/[slug]/page.tsx` uses `seo.title` /
`seo.metaDescription` when present, falling back to the current
`` `${topic.name} — Men's Health Guide` `` / `seo?.intro` behavior
otherwise — so topics without a rewritten title still render correctly.
All 14 topics get a natural-language title written in this pass (e.g.
"Testosterone & Aging: What the Evidence Actually Shows" instead of
"Testosterone — Men's Health Guide"), matching the intent-driven,
benefit/question-style headlines the comparables use, in the site's
existing "evidence-aware, not hype" voice.

### 2. Key Takeaways repositioning

Move the existing "Evidence-aware takeaways" `<section>` in
`topics/[slug]/page.tsx` from its current position (after Common Myths) to
directly after the hero `<header>`, before the Beginner Guide section.
Restyle as a bordered highlight box (bullet list with checkmarks, subtle
background — matching the existing Beginner Guide box's visual treatment)
so it reads as a scannable summary immediately on page load. Render-order
and styling change only — no new data source, `staticContent?.takeaways`
already exists per topic.

### 3. Inline citations on topic pages

The `topicClaims` query in `topics/[slug]/page.tsx` (fetches up to 3 claims
for "Top claims in this topic") adds `sources: true` to its `select`/
`include`. Each rendered claim gets its first real `EvidenceSource` (title
+ link) shown inline beneath the claim text, in addition to the existing
"See evidence →" link through to `/claims/[slug]` for the full source list.
Claims with zero `EvidenceSource` rows keep today's behavior (no inline
citation shown, just the evidence badge and link-through) — no fabricated
placeholder citations.

### 4. Clickable topic badges on VideoCard

`packages/ui/src/video/VideoCard.tsx` gets a new optional prop:

```ts
topics?: Array<{ name: string; slug: string }>;
```

When `topics` is provided, badges render as `Link`s to `/topics/${slug}`;
otherwise the component falls back to the existing plain-`<span>`
`topicNames` rendering (backward-compatible — no `hype-check` or other
menhealth call site breaks by default). Because badges become real
anchors, the card's outer wrapper changes from one all-encompassing
`<Link>` to a `<div>` (carrying the existing hover/shadow/`group` styling)
containing an inner `<Link>` around the thumbnail/title/summary/channel
block, with the topic-badge row rendered as a sibling outside that inner
`Link` — avoiding invalid nested `<a>` elements while preserving the
existing hover behavior via `group`/`group-hover` on the outer `<div>`.

menhealth's 7 `VideoCard` call sites (`app/(public)/page.tsx`,
`rankings/[topic]/page.tsx`, `creators/[slug]/page.tsx`,
`weekly/[slug]/page.tsx` ×2, `topics/[slug]/page.tsx` ×2) switch from
passing `topicNames={video.topics.map(vt => vt.topic.name)}` to passing
`topics={video.topics.map(vt => ({ name: vt.topic.name, slug: vt.topic.slug }))}`.
`hype-check` call sites are untouched.

### 5. Testosterone pillar article (pilot)

`TopicContent` in `lib/seo/topic-content.ts` gets a new optional field:

```ts
export type TopicContent = {
  // ...existing fields
  longForm?: {
    intro: string;
    sections: Array<{
      heading: string;
      paragraphs: string[]; // each entry renders as one <p>
      citations?: Array<{ label: string; url: string }>; // real sources only
    }>;
  };
};
```

Only the `testosterone` entry gets a `longForm` value in this pass — every
other topic's `TopicContent` is unchanged, so nothing else in the render
tree is affected. `topics/[slug]/page.tsx` renders a new section (between
the repositioned Key Takeaways box and the Beginner Guide) when
`staticContent?.longForm` is present: intro paragraph, then each
subsection's heading + paragraphs, with citation links rendered inline
(e.g., superscript-style bracketed links) at the point in the prose they
support, plus a "Sources" list at the end of the section for the same
links. Target length ~1,500+ words across the intro + sections combined.

Content approach: before writing prose, use `WebSearch` to find real
sources (PubMed, Endocrine Society / Mayo Clinic / Harvard Health-tier
sources) for the specific claims the article makes (e.g. age-related
decline rates, sleep's effect on testosterone, resistance training
effects, TRT risk/benefit framing). Claims already present in the existing
`topic-content.ts`/`topic-faq.ts` testosterone entries can be reused
without new citation-hunting (they're already-live site content); genuinely
new claims added for the long-form narrative need a real citation or get
phrased in hedged, observational language rather than stated as settled
fact — consistent with the site's existing "observational, not causal"
voice the audit called out as a strength worth leaning into.

## Testing

- Existing topic-page and `VideoCard` consumers keep working with topics
  that have no `longForm`/rewritten `title`/`metaDescription` — verify by
  loading a non-pilot topic page (e.g. `/topics/sleep`) and confirming it
  renders unchanged apart from the Key Takeaways repositioning and inline
  citations (both apply to every topic, not just testosterone).
- `/topics/testosterone` renders the new long-form section with working
  citation links.
- `pnpm typecheck`/`pnpm build` for `apps/menhealth` and `packages/ui`
  (shared prop addition must not break `hype-check`'s existing `VideoCard`
  usage — confirm `apps/hype-check` still typechecks/builds unchanged).
- Manual check: no nested `<a>` elements in the rendered `VideoCard` markup
  (topic badges and the card's main link both clickable independently).

## Compliance notes

- No AI output auto-publishes: this is hand-authored static content
  reviewed via normal PR/code review, not the automated video/claim
  pipeline — consistent with how `topic-content.ts`/`topic-faq.ts` already
  work.
- HIGH-risk category (testosterone) content gets explicit call-out in the
  PR for the user's review of the specific medical claims and citations
  before merge — this is the human-review gate for this content type.
- Medical disclaimer: `topics/[slug]/page.tsx` already renders
  `<Disclaimer text={MEDICAL_DISCLAIMER_TEXT} />` site-wide on this page
  template; the new long-form section doesn't need its own separate
  disclaimer since the page-level one already covers all content on the
  page, including the new section.
- No fabricated citations, no claims presented as medical advice, no
  changes to `CATEGORY_RISK_FLOOR` or any compliance-gating logic.
