# Topic discovery design

Date: 2026-08-04
Status: approved (autonomous — user opted out of review gates for this task, see notes)

## Problem

Both sites (`hype-check`, `menhealth`) discover and score YouTube videos against a
hardcoded list of `TopicSeed`s in each app's `site.config.ts`. Growing that list
today requires someone to notice a gap and hand-edit the file. There's no
mechanism that surfaces "this niche is popular right now and we don't cover
it" — topics only grow when a human happens to think of one.

## Goals

- Periodically propose new topic candidates based on what's actually getting
  views on YouTube right now, for admin review.
- Never auto-publish a topic into the live discovery pipeline — every
  candidate needs explicit admin approval, same spirit as the existing
  content-approval gate for high-risk categories.
- Reuse each site's own `highRiskTopicKeywords` so candidates get a sane
  initial high-risk flag instead of always defaulting to "normal."
- Ship for `hype-check` first (this session's priority); carry the same
  feature to `menhealth` in the same PR since the two apps mirror each
  other's topic/job/admin structure closely enough that a second
  implementation is mechanical, not a redesign.

## Non-goals

- No automatic edits to `site.config.ts`. That file stays the curated,
  human-authored baseline per AGENTS.md ("the single file a new site fills
  in").
- No trend/Google-Trends integration — YouTube search result view counts are
  the only popularity signal, since that's the API this repo already has
  access to (`YOUTUBE_API_KEY` via `core-youtube`).
- No changes to the per-video AI/compliance pipeline. Approved topics flow
  through the exact same `sync-youtube` → scoring → risk-gate path as
  hardcoded topics; nothing about that pipeline changes.
- Wiring public-facing surfaces (topic hub pages, sitemap, rankings, FAQ
  page, `RelatedTopics` component, `generateStaticParams`, etc.) to read
  from `getAllTopicSeeds()` instead of the static `TOPIC_SEEDS` array is
  deferred to a follow-up. This was discovered as a gap during final
  whole-branch review — only `jobs/sync-youtube.ts` and the admin topics
  page were wired to the DB-backed list — not originally scoped for this
  feature. It's recorded here as a known limitation: an approved suggestion
  starts real video discovery/processing via `sync-youtube`, but does not
  yet appear on the public topic hub until that follow-up lands.

## Approach

**Chosen: AI-brainstormed candidates, scored by real YouTube search volume,
queued for admin approve/reject, merged into the live topic list only after
approval.**

Two other shapes were considered and rejected:

- *Pure YouTube-only discovery* (cluster trending video titles into topics
  without an LLM step) — cheaper, but produces noisy, ungrammatical topic
  names/queries and no natural-language description, which the admin UI and
  FAQ generation both need. The AI step is what turns "a cluster of videos"
  into a usable `TopicSeed`.
- *Auto-add above a popularity threshold* — rejected outright: this bypasses
  human judgment on `isHighRisk` classification, which both AGENTS.md and the
  existing per-video approval gate treat as a strictly human decision.

### Data flow

```
cron (monthly, per site)
  -> jobs/discover-topics.ts
       1. load existing slugs (site.config TOPIC_SEEDS + all TopicSuggestion rows)
       2. ask aiClient for N candidate topics in this site's niche, excluding those slugs
       3. for each candidate: searchAndEnrichVideos(candidate.query) via existing YouTube client
       4. scoreTopicPopularity(videos) — drop candidates with too little evidence
       5. isHighRiskCandidate(candidate, siteConfig.highRiskTopicKeywords)
       6. upsert a PENDING TopicSuggestion row per surviving candidate
  -> admin reviews queue at /admin/topics
       - Approve: PATCH app/api/admin/topic-suggestions/[id]/route.ts flips
         suggestion status to APPROVED and sets reviewedAt — it does not
         touch the `Topic` table itself
       - Reject: same route flips status to REJECTED (never resurfaced)
  -> jobs/sync-youtube.ts and the admin topics table both read
     getAllTopicSeeds() = site.config TOPIC_SEEDS ∪ APPROVED TopicSuggestions
  -> the next sync-youtube run upserts a `Topic` DB row for every seed
     getAllTopicSeeds() returns, including newly-approved ones — approval
     doesn't create the `Topic` row immediately, the next monthly sync does
```

Approved suggestions never touch `site.config.ts`. They live in the
`TopicSuggestion` table and get merged into the working topic list at
runtime, which is why `sync-youtube.ts` and the admin topics page switch from
importing the static `TOPIC_SEEDS` array to calling `getAllTopicSeeds()`.
Approval only flips the suggestion's `status`; the corresponding `Topic` row
appears lazily on the next `sync-youtube` run rather than being created
synchronously, deliberately avoiding two code paths that write to `Topic`.

### Shared logic (`packages/core-youtube/src/topic-discovery.ts`)

New module, same package that already holds `client.ts` (YouTube API) and
`scoring.ts` (video scoring) — topic-candidate scoring is the same domain.
Exports pure, unit-testable functions with no DB/network access:

- `TopicCandidateSchema` (Zod) + `parseTopicCandidates(raw: unknown)` —
  validates the AI's JSON response at the boundary, per the repo's "all
  external I/O validated with Zod" rule.
- `scoreTopicPopularity(videos: { viewCount: number; publishedAt: Date }[]): number`
  — median view count among videos published in the last 90 days; 0 if none
  qualify. Recency-filtered so a single old viral video can't prop up a
  currently-dead niche.
- `isHighRiskCandidate(candidate: { name, description, query }, keywords: string[]): boolean`
  — case-insensitive substring match of any keyword against the combined
  candidate text. Same shape of check as the existing claim-risk keyword
  safety net, just applied to a topic candidate instead of a claim.
- `mergeTopicSeeds(seeds: TopicSeed[], approved: TopicSeed[]): TopicSeed[]` —
  dedupes by slug (static seed wins on conflict), used by both apps'
  `getAllTopicSeeds()`.

These are exported from `packages/core-youtube/src/index.ts` alongside the
existing exports.

### Per-app additions (`hype-check` first, then `menhealth`)

Identical in both apps, since both already share the `TOPIC_SEEDS` /
`db.topic` / `sync-youtube` / admin-topics-page structure:

1. **Prisma**: `TopicSuggestion` model + `SuggestionStatus` enum
   (`PENDING`/`APPROVED`/`REJECTED`):
   ```
   model TopicSuggestion {
     id                 String           @id @default(cuid())
     slug               String           @unique
     name               String
     query              String
     description        String
     suggestedIsHighRisk Boolean         @default(false)
     popularityScore    Int
     evidence           Json             // top sample videos: title + viewCount
     status             SuggestionStatus @default(PENDING)
     createdAt          DateTime         @default(now())
     reviewedAt         DateTime?
   }
   enum SuggestionStatus {
     PENDING
     APPROVED
     REJECTED
   }
   ```
2. **`jobs/discover-topics.ts`** — orchestrates the flow above using that
   site's own `aiClient`, `createYouTubeClient`, `db`, and `siteConfig`.
3. **`app/api/cron/discover-topics/route.ts`** — same
   `authorization: Bearer ${env.CRON_SECRET}` guard as the sibling cron
   routes in that app.
4. **`vercel.json`** — new cron entry, monthly (`0 6 1 * *`): frequent enough
   to catch shifting trends, infrequent enough to keep AI/YouTube-quota cost
   low, matching "now and then" from the original ask.
5. **`lib/youtube/topics.ts`** — add `getAllTopicSeeds()`, a thin async
   wrapper: read `APPROVED` `TopicSuggestion` rows, map to `TopicSeed` shape,
   call the shared `mergeTopicSeeds`.
6. **`jobs/sync-youtube.ts`** — swap the `TOPIC_SEEDS` import for
   `await getAllTopicSeeds()`.
7. **Admin `app/admin/(protected)/topics/`**:
   - `page.tsx`: switch its topic table to `getAllTopicSeeds()`; add a
     "Suggested topics" section below listing `PENDING` `TopicSuggestion`
     rows (including their AI-written description) with their popularity
     score and sample evidence.
   - `app/api/admin/topic-suggestions/[id]/route.ts` (new PATCH route
     handler, not a server action): gated by the same admin session check
     the rest of `/admin` relies on (inherited from the protected layout).
     Takes `{ action: "approve" | "reject" }` and only flips the
     suggestion's `status` to `APPROVED`/`REJECTED` and sets `reviewedAt` —
     it does not touch the `Topic` table. The `Topic` row for a
     newly-approved suggestion is created lazily by the next
     `sync-youtube` run, which already upserts a `Topic` row for every
     seed `getAllTopicSeeds()` returns. A client component
     (`TopicSuggestionActions.tsx`) calls this route and refreshes the
     page on success.

### Compliance

- `isHighRisk` on an approved topic still only changes the *topic-level*
  gate input — every individual video still goes through the existing
  per-video risk scoring and, for high-risk categories, the same admin
  approval-before-publish gate. This feature adds a source of topics, not a
  new publishing path.
- Suggestions are inert until approved: `sync-youtube` never sees a `PENDING`
  or `REJECTED` row.

### Testing

Following the existing convention (pure package functions tested from each
app's `__tests__/`, e.g. `__tests__/scoring.test.ts` already does this for
`core-youtube`):

- `apps/hype-check/__tests__/topic-discovery.test.ts` (and same for
  `menhealth`): `scoreTopicPopularity` (empty input, recency filtering,
  median calculation), `isHighRiskCandidate` (match/no-match, case
  insensitivity, multi-field), `mergeTopicSeeds` (dedupe-by-slug, static wins
  on conflict), `parseTopicCandidates` (valid JSON, malformed JSON rejected).
- No test coverage needed for the cron route itself (thin auth-check +
  delegate, matches how sibling cron routes are already left untested) or
  the admin PATCH route handler (thin DB mutation, same reasoning).

## Notes on process

The user asked to skip clarifying-question and review-gate pauses for this
task and go straight through to an open PR, so this spec was written from
codebase inspection (both apps' `site.config.ts`, Prisma schemas, jobs,
cron routes, admin pages, and `packages/core-youtube`) rather than iterative
Q&A. Decisions that would normally be confirmed with the user — monthly
cadence, view-count-median popularity signal, reject-is-permanent, static
seeds win merge conflicts — are documented above with their rationale so
they're easy to revisit.
