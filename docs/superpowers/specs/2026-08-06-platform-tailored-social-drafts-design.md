# Platform-tailored social draft generation

Scope: `apps/menhealth` and `packages/core-social`. `apps/hype-check` has a
parallel, near-identical copy of the affected admin UI (`GenerateSocialButton`,
`DraftActions`, `drafts/[id]/page.tsx`) but is explicitly out of scope — see
"Out of scope" below.

## Problem

[generate-social-post.ts](../../../packages/core-social/src/generate-social-post.ts)
has a single `buildPrompt()` that generates the same shape of content —
hook + script + caption + hashtags — for all four platforms
(`X`, `REDDIT`, `YOUTUBE_COMMUNITY`, `TIKTOK`), only swapping the numeric
limits from `PLATFORM_CONSTRAINTS`. In practice the platforms don't want the
same shape of content: X wants one punchy post, Reddit wants
discussion-post voice, YouTube Community wants a casual question-style post,
TikTok wants a hook + on-camera script for a human to film.

This causes two concrete bugs:

- **X generation routinely fails validation.** The prompt tells the AI to
  keep the caption under `PLATFORM_CONSTRAINTS.X.maxCaptionChars` (280)
  *and* to embed the full UTM link inside that same caption *and* to
  include the evidence label, risk level, and disclaimer line — all within
  a flat 280-character budget that never subtracts the link's own length.
  `generateSocialPost()` already knows to route around this: it explicitly
  filters `"Caption exceeds"` errors out of the post-generation
  `validatePlatformConstraints` check for `X`
  ([generate-social-post.ts:233-245](../../../packages/core-social/src/generate-social-post.ts#L233-L245)),
  with a comment noting `XAdapter.validate()` re-checks it correctly later.
  That filter is a symptom, not a fix — it exists because the prompt's
  budget math is wrong, not because the check is redundant.
- **TikTok has no way to generate a draft at all.** `GeneratePostSchema` and
  `PLATFORM_CONSTRAINTS` already include `TIKTOK`, and `TikTokAdapter`
  exists (intentionally a stub — see
  [adapters/tiktok.ts](../../../packages/core-social/src/adapters/tiktok.ts)),
  but
  [GenerateSocialButton.tsx](../../../apps/menhealth/app/admin/(protected)/videos/[id]/GenerateSocialButton.tsx)'s
  `PLATFORMS` list only offers `YOUTUBE_COMMUNITY`, `REDDIT`, `X`. There's
  no entry point to generate a TikTok script at all.

Separately, there's no way to regenerate a bad draft or hand-edit one —
today the only path is delete-and-recreate isn't even available; a bad
draft just sits there.

## Goal

- Each platform gets a prompt builder shaped for how that platform is
  actually used, instead of one generic shape reused four ways.
- The X character-budget bug is fixed at the source: the prompt receives a
  budget computed from the real UTM URL length, not a flat 280.
- TikTok gets a real entry point alongside the other three platforms.
- Admins can regenerate a draft or hand-edit it inline, both re-validated
  through the same safety pipeline as generation.

## Design

### Platform-specific prompt builders

New file `packages/core-social/src/prompts.ts` exports one pure builder per
platform plus a dispatcher:

```ts
export function buildXPrompt(ctx: VideoContext, utmUrl: string, config: PromptConfig): string
export function buildRedditPrompt(ctx: VideoContext, utmUrl: string, config: PromptConfig): string
export function buildYouTubeCommunityPrompt(ctx: VideoContext, utmUrl: string, config: PromptConfig): string
export function buildTikTokPrompt(ctx: VideoContext, utmUrl: string, config: PromptConfig): string
export function buildSocialPrompt(platform: Platform, ctx: VideoContext, utmUrl: string, config: PromptConfig): string
```

`PromptConfig` is the subset of `SocialPostGeneratorConfig` the prompts
actually read today (`siteName`, `contentTypeLabel`, `disclaimerLine`,
`highRiskKeywords`) — pulled out as its own type so `prompts.ts` doesn't
need to import the full generator config shape.

`generate-social-post.ts` drops its local `buildPrompt()` and calls
`buildSocialPrompt(input.platform, ctx, utmUrl, config)` instead. Nothing
else in `generateSocialPost()` changes — same AI call, same
`SocialPostAiOutputSchema` validation, same safety pipeline below.

Per-builder differences (all four still return the same
`{hook, script, caption, hashtags, requiresReview}` JSON shape the schema
expects — only the *instructions* inside the prompt change):

- **`buildXPrompt`** — single punchy post, no hashtags (`Hashtags: 0 max`
  already comes from `PLATFORM_CONSTRAINTS.X.maxHashtags`), hook *is* the
  post rather than a separate lead-in. Caption budget passed to the prompt
  is `280 - utmUrl.length - 1` (the `-1` is the space before the link),
  computed from the real `utmUrl` already built earlier in
  `generateSocialPost()` — this is the fix for the always-fails bug. The
  instruction still tells the AI to embed the link in the caption (matching
  `XAdapter`'s `getUrlSuffix()`, which appends nothing when the caption
  already contains `utmUrl`), so the tightened budget is what makes the
  whole thing — link, evidence label, risk level, disclaimer — actually fit
  in 280 chars.
- **`buildRedditPrompt`** — discussion-post voice, no hashtags, explicitly
  no salesy CTA. Matches the subreddit checklist already shown in
  [DraftActions.tsx](../../../apps/menhealth/app/admin/(protected)/social/drafts/[id]/DraftActions.tsx)
  ("Post is valuable without any links", "Does not directly promote the
  site").
- **`buildYouTubeCommunityPrompt`** — short, casual, engagement/question
  style.
- **`buildTikTokPrompt`** — hook + on-camera script, written for a human to
  film from. This stays draft-only: `TikTokAdapter.publish()` returns
  `NOT_IMPLEMENTED` by design (per its own file-header TODO), and this spec
  doesn't touch that adapter.

The existing post-generation `validatePlatformConstraints` filter for X
([generate-social-post.ts:244](../../../packages/core-social/src/generate-social-post.ts#L244))
and `XAdapter`'s own combined-length check stay exactly as they are — they
're an independent safety net for whatever the AI actually returns, not the
source of the budget bug, so there's no reason to touch them.

All four builders flow through the same unchanged safety pipeline:
`checkForbiddenPatterns`, `detectHighRiskTopic`,
`validatePlatformConstraints`, and the high-risk → `PENDING_REVIEW` gate.
Nothing about approval/compliance changes.

### Regenerate and inline edit

Two new functions returned from `createSocialPostGenerator()` alongside
`generateSocialPost`, in the same file:

```ts
regenerateSocialPost(postId: string): Promise<Result<{ postId: string }>>
updateSocialPostDraft(postId: string, edits: {
  hook?: string; script?: string; caption?: string; hashtags?: string[];
}): Promise<Result<{ postId: string }>>
```

**`regenerateSocialPost`**: loads the post by id, rejects
(`Result.ok: false`) unless `status` is `DRAFT` or `PENDING_REVIEW` — an
`APPROVED`+ post is not touched. Re-fetches `VideoContext` via
`config.fetchContext(post.sourceId)`, rebuilds the UTM URL with the
default `"social"` campaign (campaign was never persisted on `SocialPost`,
so there's nothing to preserve from the original generation), reruns
`buildSocialPrompt` → AI call → the same safety pipeline used by
`generateSocialPost`, and overwrites `hook`/`script`/`caption`/`hashtags`/
`requiresReview`/`status` on the same row (`db.socialPost.update`, not
`create`).

**`updateSocialPostDraft`**: loads the post by id, rejects unless `status`
is not `PUBLISHED`. Merges the provided fields onto the existing row's
values, normalizes hashtags the same way `generateSocialPost` does (adds
`#` if missing), and re-runs `checkForbiddenPatterns` +
`validatePlatformConstraints` (same X-filter behavior as generation) on the
merged content before saving. It does **not** rerun
`detectHighRiskTopic`/the `requiresReview` gate — that classification was
made at generation time from the source video, edits don't change what the
video is about, and the person making the edit is already the admin the
gate exists to route the post to. Rejects with the validation errors
(mirroring `generateSocialPost`'s own error shape) if the edited content
fails either check; otherwise updates the row and returns `{ postId }`.

**Routes** (both admin-session-gated, same pattern as the existing
`approve`/`reject`/`schedule` routes in
`apps/menhealth/app/api/social/drafts/[id]/`):

- `POST /api/social/drafts/[id]/regenerate` → calls `regenerateSocialPost`.
- `PATCH /api/social/drafts/[id]` → validates body against a new
  `UpdateDraftSchema` (all fields optional, same per-field limits as
  `SocialPostAiOutputSchema`) exported from `packages/core-social/src/validation.ts`
  and re-exported from `apps/menhealth/lib/social/validation.ts` (matching
  how `ApprovePostSchema` etc. are re-exported today), then calls
  `updateSocialPostDraft`.

### New page: per-platform generate/regenerate

`apps/menhealth/app/admin/(protected)/social/generate/[platform]/page.tsx`
— a Server Component reached as `?videoId=…`. Same direct-DB-query pattern
as today's `drafts/[id]/page.tsx`: looks up the video by `videoId`, then
`db.socialPost.findFirst({ where: { sourceId: videoId, platform },
orderBy: { createdAt: "desc" } })`.

- If a matching post exists and its `status` is `DRAFT`, `PENDING_REVIEW`,
  `APPROVED`, or `SCHEDULED` (non-terminal), the page renders that post's
  current content in a platform-styled preview card, the inline-editable
  fields (hook/script/caption/hashtags, wired to the new `PATCH` route),
  the existing `DraftActions` component unchanged, and a **Regenerate**
  button — shown only when `status` is `DRAFT` or `PENDING_REVIEW`, matching
  `regenerateSocialPost`'s own guard, so the button is never shown in a
  state where clicking it would just 409.
- If no post exists, or the only ones found are terminal (`PUBLISHED`,
  `REJECTED`, `FAILED`), the page renders an empty preview card and a
  **Generate** button that `POST`s to the existing `/api/social/generate`
  route — identical to what `GenerateSocialButton` does today, just for one
  platform instead of a checkbox batch. This can create an additional row
  for the same `(videoId, platform)` pair, same as re-clicking the existing
  bulk button today — not a new behavior.

The preview card is one small component per platform
(`XPreview.tsx`, `RedditPreview.tsx`, `YouTubeCommunityPreview.tsx`,
`TikTokPreview.tsx`, colocated in the same route folder), loosely styled to
resemble the real surface (character count for X, subreddit-style layout
for Reddit, etc.) — not pixel-perfect, just recognizable enough that an
admin can tell which platform they're looking at without reading the
badge.

### Entry point

`GenerateSocialButton.tsx` stops being a checkbox-and-fire form. It becomes
four links, one per platform ("Generate for X", "Generate for Reddit",
"Generate for YouTube Community", "Generate for TikTok"), each pointing to
`/admin/social/generate/[platform]?videoId=…`. This is also the fix for
TikTok's missing entry point — no separate change needed beyond adding it
to this link list.

While touching this: `DraftActions.tsx`'s `isManualPlatform` check
(currently `platform === "YOUTUBE_COMMUNITY" || isReddit`) gets `TIKTOK`
added, so a TikTok draft gets the same copy-script + mark-published flow
Reddit and YouTube Community already have, instead of dead-ending after
generation with no way to move it past `DRAFT`.

### Testing

Per `AGENTS.md`'s standard (unit tests for scoring/parsing/AI-output-shaped
functions):

- One unit test per prompt builder confirming the platform-specific
  instructions appear (no-hashtags language for X/Reddit, script
  instructions for TikTok, etc.).
- A focused test for the X char-budget math:
  `buildXPrompt` with a known `utmUrl` produces a prompt whose stated
  caption budget equals `280 - utmUrl.length - 1`, across a couple of UTM
  URL lengths.
- `regenerateSocialPost`: rejects for `APPROVED`/`SCHEDULED`/`PUBLISHED`/
  `REJECTED`/`FAILED` posts, succeeds and overwrites the row for `DRAFT`/
  `PENDING_REVIEW`.
- `updateSocialPostDraft`: rejects for `PUBLISHED`, rejects when merged
  content fails `checkForbiddenPatterns` or `validatePlatformConstraints`,
  succeeds and persists otherwise.
- Basic rendering test per preview component (renders given hook/caption/
  hashtags props without throwing).

## Out of scope

- `apps/hype-check` — has its own copy of `GenerateSocialButton`,
  `DraftActions`, and `drafts/[id]/page.tsx` (confirmed near-identical
  today, modulo an in-progress theming pass on another branch), but this
  spec only covers `apps/menhealth`. Porting this to hype-check is a
  separate follow-up.
- TikTok auto-publish / video rendering — `TikTokAdapter` remains a stub;
  this spec only adds a way to generate and edit the draft script.
- SEO, newsletter — untouched.
- Changing `checkForbiddenPatterns`, `detectHighRiskTopic`,
  `validatePlatformConstraints`, or the `PENDING_REVIEW` gate itself — all
  reused as-is by generate, regenerate, and edit.
