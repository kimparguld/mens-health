# Port social video-generation + TikTok auto-publish to hype-check

## Context

`apps/menhealth`'s admin social area grew a full video-generation and
TikTok-publish pipeline across ~20 commits: an AI video plan step, TTS
narration synthesis (currently feature-flagged off), an ffmpeg vertical-video
renderer, Vercel Blob upload, a "Generate video" / "Download video" UI, and a
direct TikTok publish route using the Content Posting API (`packages/core-social`'s
`TikTokAdapter`). `apps/hype-check` has the base draft/generate/schedule/reject
flow but none of the above — this was never ported over when it was built.

`apps/hype-check` already has its own theme applied to the admin social pages
(`bg-muted`, `text-emerald-600`, `text-accent`, etc., vs. menhealth's
hardcoded `indigo`/`emerald`/`gray-800` classes). Ported UI must be merged
into hype-check's existing markup, not copy-pasted wholesale, so the new
sections pick up hype-check's theme instead of menhealth's.

`packages/core-social` (the shared workspace package, including the `TikTokAdapter`
publish implementation) is out of scope — it's already shared across both
apps, so hype-check picks up its exports automatically once the package is
built. Nothing to copy there.

Narration audio stays disabled (`NARRATION_AUDIO_ENABLED = false` in
`generate-social-video.ts`), matching menhealth — videos render as a silent
caption slideshow.

## Goals

- hype-check admin can generate a vertical video for a TikTok / YouTube
  Community draft, same as menhealth.
- hype-check admin can connect a TikTok account (OAuth) and publish a draft
  directly to TikTok via the Content Posting API, same as menhealth.
- hype-check's existing visual theme is preserved in the merged UI.
- No behavior changes to menhealth; no changes to `packages/core-social`.

## New files (copied verbatim, restyled to hype-check's existing single-quote /
no-semicolon convention where the source file uses double quotes)

All of these are site-agnostic: they import `@/lib/auth`, `@/lib/db/prisma`,
`@/env`, `@menhealth/core-social` — all present identically in hype-check.

- `apps/hype-check/lib/social/video-plan.ts`
- `apps/hype-check/lib/social/video-narration-audio.ts`
- `apps/hype-check/lib/social/video-render.ts`
- `apps/hype-check/lib/social/generate-social-video.ts`
- `apps/hype-check/lib/social/blob-storage.ts`
- `apps/hype-check/app/api/social/drafts/[id]/video/route.ts`
- `apps/hype-check/app/api/social/drafts/[id]/publish/route.ts`
- `apps/hype-check/assets/fonts/social-video-caption.ttf` (binary copy — used
  by `video-render.ts` for burned-in captions)

## Existing files — merged, not replaced

- `lib/social/platform-rules.ts` — add `VIDEO_CAPABLE_PLATFORMS` (`TIKTOK`,
  `YOUTUBE_COMMUNITY`) and `supportsVideoGeneration(platform)`.
- `lib/social/adapters/tiktok.ts` — add the missing
  `export type { TikTokAdapterConfig } from "@menhealth/core-social"` (hype-check
  currently only re-exports the class, not the config type the publish route
  needs).
- `app/admin/(protected)/social/drafts/[id]/DraftActions.tsx` — add the
  "Video" section (generate/regenerate, preview, download link, error
  display) and the "Publish to TikTok" section from menhealth's version.
  Keep hype-check's existing button/badge/link classes (`bg-muted`,
  `text-emerald-600`, etc.) instead of menhealth's hardcoded `indigo`.
- `app/admin/(protected)/social/accounts/page.tsx` — generalize from the
  current X-only `X_CONFIG` constant to menhealth's `PLATFORM_CONFIGS` array
  (X + TikTok) and the corresponding `findMany`/`Map` lookup, keeping
  hype-check's card styling and quote/formatting convention.
- `app/admin/(protected)/social/generate/[platform]/page.tsx` — thread
  `videoUrl` / `videoStatus` / `videoError` from the fetched post into the
  `<DraftActions>` props. Keep hype-check's `db.sourceVideo` model name (not
  menhealth's `db.video` — a pre-existing, unrelated naming difference
  between the two apps' schemas).

## Config plumbing

- `apps/hype-check/env.ts` — add `BLOB_READ_WRITE_TOKEN: z.string().min(1).optional()`
  to both the schema and the `process.env` mapping, matching menhealth. Left
  unset in actual env for now — the user will provision the real Vercel Blob
  token later.
- `apps/hype-check/package.json` — add `"ffmpeg-static": "^5.3.0"` (match
  menhealth's version).
- `apps/hype-check/next.config.ts` — add `serverExternalPackages: ['ffmpeg-static']`
  and an `outputFileTracingIncludes` entry for the video route covering
  `./node_modules/ffmpeg-static/**/*` and `./assets/fonts/**/*`, with the same
  explanatory comments as menhealth's config (the `__dirname` rewrite issue
  and filesystem-path-not-import-graph issue).

## Prisma schema

Add to `apps/hype-check/prisma/schema.prisma`:

- `enum VideoGenerationStatus { GENERATING READY FAILED }`
- On `model SocialPost`: `videoUrl String?`, `videoStatus VideoGenerationStatus?`,
  `videoError String?`

`Platform` already includes `TIKTOK` in both apps — no enum change needed
there. After the schema edit, generate a Prisma migration for hype-check's
database.

## Tests

Port the new TikTok-publish and video-field test cases (added in menhealth's
`41754f5` and preceding commits) from `apps/menhealth/__tests__/social-adapters.test.ts`
into hype-check's existing `apps/hype-check/__tests__/social-adapters.test.ts`
— including the `videoUrl`/`videoStatus` fields on the `PartialPost` factory
type and the `TikTokAdapter` import.

## Out of scope

- `packages/core-social` — shared package, already applies to both apps.
- Turning narration audio on.
- Provisioning the actual `BLOB_READ_WRITE_TOKEN` value or TikTok API
  credentials for hype-check.
- Any menhealth-side changes.

## Verification

- `pnpm --filter hype-check typecheck` (or repo-equivalent) passes.
- `pnpm --filter hype-check test` passes, including the ported adapter tests.
- Manual check: admin social drafts page for a TikTok/YouTube Community draft
  shows a working "Generate video" button; accounts page shows both X and
  TikTok connect cards in hype-check's existing visual style.
