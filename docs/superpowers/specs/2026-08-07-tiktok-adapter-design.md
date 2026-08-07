# TikTok adapter — real automated publishing

Scope: `packages/core-social` (adapter, refresh-token config, schema) and
`apps/menhealth` (OAuth routes, new publish route, `DraftActions.tsx`).

## Problem

[tiktok.ts](../../../packages/core-social/src/adapters/tiktok.ts) is a
documented stub — `validate()`, `publish()`, and `createDraft()` all return
`NOT_IMPLEMENTED`. The user now has an approved TikTok Developer Portal app
(audited for `video.publish` with public privacy levels — Direct Post) and
wants real automated publishing, not just parity with the other manual-only
adapters (`youtube.ts`, `reddit.ts`), which generate text for an admin to
copy-paste and then mark as manually published.

The Admin Portal's ad video package feature
([generate-ad-video-package.ts](../../../packages/core-social/src/generate-ad-video-package.ts))
now gives us a source of real, admin-approved, TikTok-shaped video: each
`AdVideoPackage` is AI-scripted, Creatomate-rendered into landscape/vertical/
square variants, and goes through its own admin review before reaching
`APPROVED`. Its `verticalUrl` (1080×1920) is exactly the video this adapter
needs, and it already lives at a stable blob-storage URL rather than on some
admin's local machine — this spec sources TikTok's video from there instead
of an ad-hoc file upload.

Two supporting gaps block this even before the adapter itself:

- The existing TikTok OAuth routes
  ([oauth/route.ts](../../../apps/menhealth/app/api/social/tiktok/oauth/route.ts),
  [oauth/callback/route.ts](../../../apps/menhealth/app/api/social/tiktok/oauth/callback/route.ts))
  don't implement PKCE. TikTok Login Kit v2 requires PKCE for all clients, so
  token exchange fails against TikTok's real endpoint as the routes stand
  today.
- `DraftActions.tsx` currently classifies TikTok as `isManualPlatform`
  alongside YouTube Community and Reddit — that assumption no longer holds
  and the publish UI needs a real form (pick an `AdVideoPackage` + privacy
  level) instead of a copy-paste box.

## Goal

- Admin can pick an `APPROVED` `AdVideoPackage` for an `APPROVED` TikTok
  draft and publish it live to TikTok directly from the admin dashboard,
  with no further manual step inside the TikTok app and no local file
  handling by the admin at all.
- The publish trigger is always an explicit admin action (pick a package +
  button click) — satisfies the non-negotiable "no AI output published
  without admin approval" rule even though TikTok itself processes Direct
  Post publishes automatically once triggered.
- TikTok OAuth actually works against TikTok's real API (PKCE fixed).
- Server-side secrets (client secret, access/refresh tokens) never reach the
  browser; the video bytes are fetched from our own blob storage and relayed
  to TikTok entirely server-side, so no video ever transits the admin's
  browser in either direction.

## Non-goals

- No `PULL_FROM_URL` publish path. The `AdVideoPackage`'s `verticalUrl`
  already lives at a stable blob-storage URL, so TikTok's `PULL_FROM_URL`
  source is tempting, but it requires verifying that storage domain with
  TikTok ahead of time and trusting their fetch timing. We instead keep
  `FILE_UPLOAD`: our server fetches the bytes itself and relays them to
  TikTok's pre-signed `upload_url` — same request shape this spec already
  relies on, just with the admin's browser removed from the loop.
- No admin-uploaded local file as a fallback video source — the picker only
  offers `APPROVED` `AdVideoPackage` rows. Simpler form, one video pipeline.
- No borrowing of the `AdVideoPackage`'s own `caption`/`hashtags`/
  `disclaimerLine`/`utmUrl` for the TikTok post — those stay scoped to that
  package's own zip-download flow. The `SocialPost`'s existing caption
  (from `buildTikTokPrompt`) is what gets posted; the package supplies the
  video file only. Video and copy stay decoupled.
- No consumption/locking of a used `AdVideoPackage` — it's generic ad
  creative, reusable across as many TikTok publishes as the admin wants, no
  new usage-tracking fields.
- No new "pending" post status on `SocialPost` — TikTok's async processing
  is handled by polling inside `publish()`, bounded to ~90s (see Error
  handling below), not by introducing a new state machine.
- No sandbox/CI integration test against TikTok's real API — no sandbox
  credentials available; manual verification against the real approved app
  is the acceptance test.
- No changes to the AI generation side (`prompts.ts`, `buildTikTokPrompt`) —
  it already produces hook/script/caption; this spec only wires up
  `publish()`.

## Design

### 1. OAuth PKCE fix

`oauth/route.ts`: generate a `code_verifier`, derive `code_challenge`
(SHA256, base64url) using the same helper pattern already used in
[x/oauth/route.ts](../../../apps/menhealth/app/api/social/x/oauth/route.ts).
Store the verifier in a new `tiktok_code_verifier` httpOnly cookie alongside
the existing `oauth_state_tiktok` CSRF cookie. Add `code_challenge` and
`code_challenge_method=S256` to the TikTok authorize URL.

`oauth/callback/route.ts`: read the verifier cookie, send it as
`code_verifier` in the `POST https://open.tiktokapis.com/v2/oauth/token/`
body alongside the existing `code`/`grant_type` params. No change to the
Zod-validated `TokenResponse` shape or the `SocialAccount` upsert.

This only touches the two existing TikTok OAuth files and mirrors a pattern
already proven working for X in this codebase.

### 2. Publish flow

**Schema.** Add `adVideoPackageId String?` to `SocialPost` (+
`adVideoPackage AdVideoPackage? @relation(fields: [adVideoPackageId],
references: [id])`), mirroring the existing `templateId`/`template` pattern
already on the model. Set when the admin submits the publish form; lets
`TikTokAdapter.publish(post)` — which, per the `SocialPublisher` interface,
only ever receives `post` — know which package's video to source. No
back-reference needed on `AdVideoPackage` (packages are reusable across
posts, not owned by one).

```
Admin opens an APPROVED TikTok draft
  -> Page (server component): fetch creator_info directly (server-side,
       access token never leaves the server) + query APPROVED
       AdVideoPackage rows; pass both as props into DraftActions
  -> Admin picks a package (thumbnail + caption shown) + privacy level,
       clicks "Publish"
  -> POST /api/social/drafts/[id]/publish
       { adVideoPackageId, privacyLevel, disableComment, disableDuet,
         disableStitch }
       (server: persists adVideoPackageId on the post, then
        TikTokAdapter.publish() fetches the package's verticalUrl bytes,
        calls creator_info + init, PUTs the bytes to TikTok's upload_url,
        polls status, logs a SocialPublishAttempt, marks SocialPost
        PUBLISHED on success)
```

No video ever touches the admin's browser in either direction — the whole
exchange (fetch from blob storage, TikTok API calls, upload) happens
server-side inside this one route.

**Fetch the video.** Before calling TikTok at all, `TikTokAdapter.publish()`
loads the `AdVideoPackage` referenced by `post.adVideoPackageId`, confirms
it's still `status === 'APPROVED'` and has a `verticalUrl`, then downloads
those bytes (same `fetch` + buffer pattern `generate-ad-video-package.ts`
already uses for its zip-download assets). `video_size` for `init` is
computed from the downloaded bytes' length — never client-reported. Doing
this first, before any TikTok API call, means a bad/missing package fails
fast without spending a `creator_info`/`init` call on it.

**Creator info.** `TikTokAdapter` calls
`GET /v2/post/publish/creator_info/query/` with the stored access token
before every publish (TikTok requires this call preceding `init`, not just
recommends it). Returns `privacy_level_options`, max video duration, and
whether the creator's TikTok account itself has comment/duet/stitch
disabled. Factored into a small shared helper (e.g.
`TikTokAdapter.getCreatorInfo()`) so both the draft page (populating the
privacy-level select) and `publish()` itself (the pre-`init` call TikTok
requires) call the same Zod-validated fetch rather than duplicating it. The
admin UI populates the privacy-level select from this response rather than
hardcoding `PUBLIC_TO_EVERYONE` — audit status/options can change on
TikTok's side independent of this codebase.

**Init.** `POST /v2/post/publish/video/init/` with
`source_info: { source: "FILE_UPLOAD", video_size, chunk_size,
total_chunk_count }` (single chunk — `AdVideoPackage` videos are short-form
ad creative, well within TikTok's single-chunk limit) and `post_info: {
title: caption, privacy_level, disable_comment, disable_duet,
disable_stitch }` sourced from the admin's selection (`caption` here is the
`SocialPost`'s own caption, not the `AdVideoPackage`'s — see Non-goals).
Returns `{ publish_id, upload_url }`.

**Upload.** Our server `PUT`s the downloaded video bytes to `upload_url`
with `Content-Type: video/mp4` and `Content-Range: bytes
0-<size-1>/<size>`. No `Authorization` header — the URL is pre-signed and
time-limited by TikTok. This is now a server-to-server transfer; the
admin's browser was never involved.

**Status poll.** `SocialPublisher.publish()` is a synchronous
request/response contract (`PublishResult` has no "pending" variant), but
TikTok processes Direct Post publishes asynchronously. `TikTokAdapter.publish()`
polls `GET /v2/post/publish/status/fetch/` every few seconds, bounded to
~90 seconds total:

- `PUBLISH_COMPLETE` -> `{ ok: true, platformPostId: publish_id, platformUrl }`.
  `platformUrl` is best-effort: TikTok doesn't always return a direct post
  URL for public Direct Post; when `publicaly_available_post_id` is absent,
  fall back to the creator's TikTok profile URL (matches the placeholder-URL
  pattern `youtube.ts` already uses for its manual flow).
- `FAILED` -> `{ ok: false, errorCode: 'TIKTOK_PUBLISH_FAILED', errorMsg: <TikTok's fail_reason> }`.
- Still processing after ~90s -> `{ ok: false, errorCode: 'TIKTOK_PUBLISH_PENDING', errorMsg: '...' }`.
  The `SocialPublishAttempt` row is still logged; if the post actually
  completes on TikTok's side after our timeout, the admin can use the
  existing manual "mark published" fallback to reconcile it.

The ~90s budget above is poll time only — the video-fetch-and-relay step
now happens first, inside the same request, adding the blob-storage
download and TikTok upload time on top. Same accepted trade-off the
original design already made (a synchronous route handler carrying a
multi-second TikTok round-trip); this just adds one more network hop to
the same request rather than introducing a new async job.

### 3. Admin UI & routes

**New route `app/api/social/drafts/[id]/publish/route.ts`** — the generic
publish trigger (parallel to the existing `mark-published` route),
admin-session gated. Accepts `{ adVideoPackageId, privacyLevel,
disableComment, disableDuet, disableStitch }`. Loads the post (must be
`platform === 'TIKTOK'` and `status === 'APPROVED'`) and the referenced
`AdVideoPackage` (must be `status === 'APPROVED'`), persists
`adVideoPackageId` onto the post, then constructs
`new TikTokAdapter({ db, clientId, clientSecret, publishOptions: {
privacyLevel, disableComment, disableDuet, disableStitch } })` and calls
`.publish(post)` — the privacy/disable options travel through
per-request adapter config (same shape `XAdapterConfig` already uses for
`db`/`clientId`/`clientSecret`), not through new columns on the shared
`SocialPost` model. Updates the `SocialPost` on success, mirroring what the
X cron job already does after `XAdapter.publish()` succeeds — just
admin-triggered instead of scheduled.

No separate `init` route or creator-info API endpoint is needed anymore:
creator_info is fetched directly inside the TikTok draft's page.tsx server
component (to populate the privacy-level select) and again inside
`publish()` itself (TikTok requires the call precede every `init`) — both
through the shared `getCreatorInfo()` helper, no client-facing route
required for either.

**`DraftActions.tsx`.** TikTok stops being lumped into `isManualPlatform`:

```ts
const isTikTok = platform === "TIKTOK";
const isManualPlatform =
  platform === "YOUTUBE_COMMUNITY" || isReddit; // TikTok removed
```

For TikTok, "Publish" opens a form instead of the copy-paste box: a select
of `APPROVED` `AdVideoPackage` rows (thumbnail + caption preview, so the
admin can tell packages apart) and a privacy-level select populated from
creator_info. If no `APPROVED` package exists yet, the picker shows an
empty state linking to `/admin/social/video-ads/generate`. Submitting runs
the flow above. The admin clicking "Publish" and picking a package **is**
the human-approval gate — nothing publishes on a schedule or without that
click. `tiktok.ts`'s header comment is updated to document this (replacing
the current "draft-only, see prompts.ts" note) and to note it now performs
real automated publishing, still gated on an explicit admin action.

Existing risk-level gating is untouched: `validate()` still requires
`post.status === 'APPROVED'`, and posts only reach `APPROVED` through the
existing admin-review flow (including the high-risk-category approval
gate), so TikTok gets the same protection X already has — no new gate
needed in the adapter itself.

### 4. Error handling & validation

- Every TikTok API response (`creator_info`, `init`, `status fetch`) is
  Zod-validated, matching `TweetResponse` in `x.ts` — a schema mismatch
  returns `errorCode: 'TIKTOK_INVALID_RESPONSE'` rather than trusting the
  shape.
- Network/HTTP failures map to `errorCode: 'TIKTOK_' + status` /
  `'TIKTOK_ERROR'`, following `x.ts`'s existing convention exactly.
- If the referenced `AdVideoPackage` can't be fetched — missing, not
  `APPROVED`, or the `verticalUrl` download itself fails — `publish()`
  returns `errorCode: 'TIKTOK_VIDEO_FETCH_FAILED'` before ever calling
  `creator_info` or `init`. Fails fast without burning a TikTok API call for
  a package we can't actually source video bytes for.
- If `init` succeeds but our server's `PUT` of the downloaded bytes to
  `upload_url` fails mid-transfer, `publish()` returns `errorCode:
  'TIKTOK_UPLOAD_FAILED'` before ever polling status — avoids an ambiguous
  `SocialPublishAttempt` that can't distinguish "never uploaded" from
  "TikTok rejected it."
- Token refresh reuses `getValidAccessToken` from `refresh-token.ts` with
  one small addition: TikTok's token endpoint takes `client_key` (not
  `client_id`) as the body param name — confirmed by the existing
  [oauth/callback/route.ts:49](../../../apps/menhealth/app/api/social/tiktok/oauth/callback/route.ts#L49),
  which already sends `client_key`. `refresh-token.ts`'s `authStyle: 'body'`
  branch currently hardcodes `bodyParams['client_id'] = config.clientId`,
  which would send the wrong field name for TikTok and silently break
  refresh. Fix: add an optional `clientIdParamName` to `RefreshConfig`
  (default `'client_id'`), and pass `clientIdParamName: 'client_key'` from
  `TikTokAdapter`. One-line, backward-compatible change — every other
  adapter keeps the default.
- Duration/size limits are enforced against the real values returned by
  creator_info, checked server-side in `publish()` right after the video is
  downloaded and before `init` is called — never trust the `AdVideoPackage`
  row's assumed shape alone.

### 5. Testing

- Unit tests for `TikTokAdapter.validate()`, following the existing
  `youtube.ts`/`x.ts` adapter test patterns.
- Unit tests for the video-fetch step in `publish()`: missing package,
  non-`APPROVED` package, and `verticalUrl` download failure all map to
  `TIKTOK_VIDEO_FETCH_FAILED` before any TikTok API call is made (assert via
  mock — no `creator_info`/`init` fetch should fire).
- Unit tests for the status-polling/mapping logic in `publish()`, mocking
  fetch responses for the `PUBLISH_COMPLETE` / `FAILED` / timeout paths.
- No integration test against TikTok's real API (no sandbox credentials);
  manual verification against the real approved app is the acceptance test.

## Compliance notes

- No third-party footage: the video comes from an `AdVideoPackage` that
  already went through its own separate admin review and reached
  `APPROVED` via the video-ads review flow — AI-scripted, Creatomate-
  rendered, first-party ad creative, not sourced from YouTube videos or
  other creators' content. That approval is checked independently of the
  TikTok draft's own `APPROVED` status — both gates must pass before
  publish is possible.
- No auto-commenting/DMs: out of scope, untouched.
- High-risk category approval: unchanged — enforced upstream at the
  `APPROVED` status gate, same as every other platform. The
  `AdVideoPackage` generator runs its own separate compliance/high-risk
  checks before it ever reaches `PENDING_REVIEW`, so a TikTok publish is
  now protected by two independent review gates instead of one.
