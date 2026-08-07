# TikTok adapter — real automated publishing

Scope: `packages/core-social` (adapter, refresh-token config) and
`apps/menhealth` (OAuth routes, new publish routes, `DraftActions.tsx`).

## Problem

[tiktok.ts](../../../packages/core-social/src/adapters/tiktok.ts) is a
documented stub — `validate()`, `publish()`, and `createDraft()` all return
`NOT_IMPLEMENTED`. The user now has an approved TikTok Developer Portal app
(audited for `video.publish` with public privacy levels — Direct Post) and
wants real automated publishing, not just parity with the other manual-only
adapters (`youtube.ts`, `reddit.ts`), which generate text for an admin to
copy-paste and then mark as manually published.

Two supporting gaps block this even before the adapter itself:

- The existing TikTok OAuth routes
  ([oauth/route.ts](../../../apps/menhealth/app/api/social/tiktok/oauth/route.ts),
  [oauth/callback/route.ts](../../../apps/menhealth/app/api/social/tiktok/oauth/callback/route.ts))
  don't implement PKCE. TikTok Login Kit v2 requires PKCE for all clients, so
  token exchange fails against TikTok's real endpoint as the routes stand
  today.
- `DraftActions.tsx` currently classifies TikTok as `isManualPlatform`
  alongside YouTube Community and Reddit — that assumption no longer holds
  and the publish UI needs a real form (file upload + privacy level) instead
  of a copy-paste box.

## Goal

- Admin can upload a video file for an APPROVED TikTok draft and publish it
  live to TikTok directly from the admin dashboard, with no further manual
  step inside the TikTok app.
- The publish trigger is always an explicit admin action (file upload +
  button click) — satisfies the non-negotiable "no AI output published
  without admin approval" rule even though TikTok itself processes Direct
  Post publishes automatically once triggered.
- TikTok OAuth actually works against TikTok's real API (PKCE fixed).
- Server-side secrets (client secret, access/refresh tokens) never reach the
  browser; the video file itself bypasses our server to avoid route-handler
  body-size limits.

## Non-goals

- No hosted-URL / `PULL_FROM_URL` publish path — file upload only, per
  the user's confirmed video source.
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

```
Admin clicks "Publish" on an APPROVED TikTok draft
  -> Browser: GET creator_info options, select privacy level + video file
  -> POST /api/social/tiktok/publish/init
       (server: creator_info query, then TikTok init call; returns
        { publishId, uploadUrl })
  -> Browser: PUT video bytes directly to uploadUrl (pre-signed, no
        access token needed — file never passes through our server)
  -> POST /api/social/drafts/[id]/publish
       (server: TikTokAdapter.publish() polls status, logs a
        SocialPublishAttempt, marks SocialPost PUBLISHED on success)
```

**Creator info.** `TikTokAdapter` calls
`GET /v2/post/publish/creator_info/query/` with the stored access token
before every publish (TikTok requires this call preceding `init`, not just
recommends it). Returns `privacy_level_options`, max video duration, and
whether the creator's TikTok account itself has comment/duet/stitch
disabled. The admin UI populates the privacy-level select from this
response rather than hardcoding `PUBLIC_TO_EVERYONE` — audit status/options
can change on TikTok's side independent of this codebase.

**Init.** `POST /v2/post/publish/video/init/` with
`source_info: { source: "FILE_UPLOAD", video_size, chunk_size,
total_chunk_count }` (single chunk for the file sizes this admin tool
handles) and `post_info: { title: caption, privacy_level, disable_comment,
disable_duet, disable_stitch }` sourced from the admin's selection. Returns
`{ publish_id, upload_url }`.

**Upload.** Browser `PUT`s the video file directly to `upload_url` with
`Content-Type: video/mp4` and `Content-Range: bytes 0-<size-1>/<size>`. No
`Authorization` header — the URL is pre-signed and time-limited by TikTok.
This keeps the (potentially tens-of-MB) file off our own server entirely.

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

### 3. Admin UI & routes

**New route `app/api/social/tiktok/publish/init/route.ts`** (admin-session
gated, matching every other admin route). `GET` returns creator_info
options for the UI to populate the privacy-level select. `POST` accepts
`{ draftId, videoSize, privacyLevel, disableComment, disableDuet,
disableStitch }`, calls creator_info + init server-side (this is where the
access token is used — never sent to the browser), returns
`{ publishId, uploadUrl }`.

**New route `app/api/social/drafts/[id]/publish/route.ts`** — the generic
publish trigger (parallel to the existing `mark-published` route). Calls
`TikTokAdapter.publish()` with the `publishId` from init, updates the
`SocialPost` on success. Mirrors what the X cron job already does after
`XAdapter.publish()` succeeds, just admin-triggered instead of scheduled.

**`DraftActions.tsx`.** TikTok stops being lumped into `isManualPlatform`:

```ts
const isTikTok = platform === "TIKTOK";
const isManualPlatform =
  platform === "YOUTUBE_COMMUNITY" || isReddit; // TikTok removed
```

For TikTok, "Publish" opens a form instead of the copy-paste box: a file
input (client-side validated against the real limits returned by
creator_info, not a hardcoded guess) and a privacy-level select populated
from creator_info. Submitting runs the three-step flow above. The admin
clicking "Publish" and choosing the file **is** the human-approval gate —
nothing publishes on a schedule or without that click. `tiktok.ts`'s header
comment is updated to document this (replacing the current "draft-only, see
prompts.ts" note) and to note it now performs real automated publishing,
still gated on an explicit admin action.

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
- If `init` succeeds but the browser's direct upload to `upload_url` fails
  mid-transfer, the publish route returns `errorCode: 'TIKTOK_UPLOAD_FAILED'`
  before ever polling status — avoids an ambiguous `SocialPublishAttempt`
  that can't distinguish "never uploaded" from "TikTok rejected it."
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
- File validation (type/size/duration) happens client-side against the real
  limits returned by creator_info, and again server-side in the init route
  before calling TikTok — never trust client-side checks alone.

### 5. Testing

- Unit tests for `TikTokAdapter.validate()`, following the existing
  `youtube.ts`/`x.ts` adapter test patterns.
- Unit tests for the status-polling/mapping logic in `publish()`, mocking
  fetch responses for the `PUBLISH_COMPLETE` / `FAILED` / timeout paths.
- No integration test against TikTok's real API (no sandbox credentials);
  manual verification against the real approved app is the acceptance test.

## Compliance notes

- No third-party footage: the uploaded file is whatever the admin uploads;
  this spec doesn't add any mechanism to source video from anywhere else
  (YouTube videos, other creators' content, etc.), consistent with the
  "no third-party footage reuse" rule.
- No auto-commenting/DMs: out of scope, untouched.
- High-risk category approval: unchanged — enforced upstream at the
  `APPROVED` status gate, same as every other platform.
