# AI-generated ad video package

Scope: `apps/menhealth` (new Prisma model, admin UI, API routes, cron job)
and `packages/core-social` (new generator module, alongside the existing
`generate-social-post.ts`).

## Problem

The admin can already generate text-only social drafts per platform
(`X`, `REDDIT`, `YOUTUBE_COMMUNITY`, `TIKTOK`) via
[generate-social-post.ts](../../../packages/core-social/src/generate-social-post.ts).
There's no way to produce an actual ad *video* — a short voiceover-narrated
clip with captions and a CTA, exported in the aspect ratios different ad
placements need (landscape for YouTube, vertical for TikTok/Reels/Shorts,
square for feed placements), plus the thumbnail and subtitle file that go
with it.

This is a general site-promotion ad (not tied to any single video/topic —
the pitch is the site's aggregate offer: five summarized videos, checked
claims, a practical takeaway, free access, easy unsubscribe), so it doesn't
fit `SocialPost`'s one-row-per-`(sourceId, platform)` shape, and it needs
capabilities the repo doesn't have today: no TTS, no video rendering, no
blob storage, and the AI client wrapper
([client.ts](../../../apps/menhealth/lib/ai/client.ts)) is text-only.

## Goal

- Admin can generate an AI-scripted ad (voiceover script + caption +
  hashtags), have it rendered into three video files (1920×1080, 1080×1920,
  1080×1080) plus a thumbnail and `.srt` subtitle file, review it, and — only
  after explicit approval — download the complete package as a zip to
  upload manually wherever they choose.
- The same compliance gate the rest of the social engine uses
  (`checkForbiddenPatterns` / high-risk keyword detection) runs on the
  generated script and caption before anything is rendered.
- Nothing in this flow ever calls a platform's publish API. This only ever
  produces a downloadable file bundle — consistent with the existing
  no-auto-publish rule for every platform adapter.
- Rendering is async (typical turnaround for a ~30s templated ad is
  10s–2min) and picked up by a cron job, not held open in a request.

## Design

### Providers

- **Creatomate** — template-based video rendering API. One ad template is
  defined once (captions, animated typography, CTA slot, background-music
  bed) in the Creatomate dashboard; generation fills in script text +
  voiceover audio and gets back rendered MP4s for all three aspect ratios
  plus a still frame for the thumbnail, from a single render job.
- **ElevenLabs** — synthesizes the voiceover from the AI-generated script
  and returns word-level timestamps, which drive `.srt` generation. Chosen
  over the OpenAI TTS already reachable through the AI client fallback
  chain because voice quality is the point of this deliverable.
- **Vercel Blob** — first-party storage for the finished assets. Creatomate
  and ElevenLabs both return temporary provider-hosted URLs; the poll job
  downloads and re-uploads each asset to Blob so the site owns a permanent
  copy.
- No separate music-generation provider — the Creatomate template carries a
  fixed licensed royalty-free track. Swapping tracks later is a template
  edit, not a code change.

New env vars, added to [env.ts](../../../apps/menhealth/env.ts)'s `server`
block next to the existing `OPENAI_API_KEY`/`GEMINI_API_KEY` optional keys:

```ts
CREATOMATE_API_KEY: z.string().min(1),
ELEVENLABS_API_KEY: z.string().min(1),
BLOB_READ_WRITE_TOKEN: z.string().min(1),
```

### Data model

New Prisma model in
[schema.prisma](../../../apps/menhealth/prisma/schema.prisma), added near
the existing `SocialPost`/`Platform`/`PostStatus` block (~line 391) but
intentionally **not** a variant of `SocialPost`: this package is one script
rendered into three simultaneous formats and isn't tied to a platform
adapter or a `sourceId` — it doesn't fit that model's per-platform-post
shape without duplicating rows or adding nullable fields that only apply to
one kind of row.

```prisma
enum AdPackageStatus {
  DRAFT
  RENDERING
  PENDING_REVIEW
  APPROVED
  REJECTED
  FAILED
}

model AdVideoPackage {
  id               String          @id @default(cuid())
  status           AdPackageStatus @default(DRAFT)
  script           String          // voiceover script
  caption          String          // publishing caption / CTA copy
  hashtags         String[]
  disclaimerLine   String          // "Educational only. Not medical advice."
  utmUrl           String
  requiresReview   Boolean         @default(true)
  renderProviderId String?         // Creatomate render ID, used for polling
  landscapeUrl     String?         // Vercel Blob URL, 1920x1080
  verticalUrl      String?         // 1080x1920
  squareUrl        String?         // 1080x1080
  thumbnailUrl     String?
  subtitleUrl      String?         // .srt
  voiceoverUrl     String?         // raw ElevenLabs audio, kept for reference
  errorMessage     String?
  approvedAt       DateTime?
  approvedBy       String?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
}
```

`requiresReview` defaults to `true` and is never set to `false` by
generation code — every package requires explicit admin approval before
download, regardless of what the compliance scan finds. That scan gates
*generation* (whether a render is attempted at all); it isn't a substitute
for human approval of the result.

### Generator module

New file `packages/core-social/src/generate-ad-video-package.ts`, following
the same `createXGenerator(config)` factory + `Result<T, E>` pattern as
`createSocialPostGenerator` in
[generate-social-post.ts](../../../packages/core-social/src/generate-social-post.ts):

```ts
export type AdVideoPackageGeneratorConfig = {
  db: PrismaClient;
  aiClient: AiClient;
  siteName: string;
  offerCopy: string;        // from site.config.ts, the site's promo pitch
  disclaimerLine: string;
  utmUrl: string;
  forbiddenPatterns: ForbiddenContentPattern[];
  highRiskKeywords: string[];
  creatomateApiKey: string;
  creatomateTemplateId: string;
  elevenLabsApiKey: string;
};

export function createAdVideoPackageGenerator(
  config: AdVideoPackageGeneratorConfig,
): {
  generateAdVideoPackage(): Promise<Result<{ packageId: string }>>;
  pollRenderingPackages(): Promise<Result<{ checked: number; completed: number; failed: number }>>;
};
```

**`generateAdVideoPackage()`**:

1. Calls `aiClient` with a prompt built from `siteName` + `offerCopy`,
   asking for `{ script, caption, hashtags }` (Zod-validated output schema,
   sibling to `SocialPostAiOutputSchema` in
   [validation.ts](../../../packages/core-social/src/validation.ts)) — a
   ~30-second voiceover script, a short caption/CTA, and hashtags.
2. Runs `script` and `caption` through the existing
   `checkForbiddenPatterns` + `detectHighRiskTopic` functions (reused
   as-is from `packages/core-compliance`). If either trips, returns
   `Result.ok: false` with the violation — no row is created, no render is
   attempted. (Unlike `generateSocialPost`, there's no video `riskLevel` to
   additionally gate on here since this isn't about a specific video.)
3. Calls ElevenLabs to synthesize the voiceover audio from `script`,
   requesting word-level timestamp alignment.
4. Calls Creatomate to start a render using `creatomateTemplateId`, passing
   the script text (for on-screen captions/typography) and the voiceover
   audio. Gets back a render/job ID.
5. Creates the `AdVideoPackage` row: `status=RENDERING`, script/caption/
   hashtags/disclaimerLine/utmUrl saved, `renderProviderId` set.
6. Returns `{ packageId }`. No polling happens inline — this is a fire-and
   return call, avoiding any serverless function timeout risk from waiting
   on a render that can take up to ~2 minutes.

**`pollRenderingPackages()`** (called by the cron job below):

1. Loads all `AdVideoPackage` rows with `status=RENDERING`.
2. For each, checks Creatomate render status by `renderProviderId`.
3. On completion: downloads the landscape/vertical/square MP4s and the
   thumbnail still from Creatomate's (temporary) URLs, uploads each to
   Vercel Blob, builds the `.srt` from the ElevenLabs word-timestamps
   captured at generation time, uploads that too, sets all the `*Url`
   fields and `status=PENDING_REVIEW`.
4. On provider-reported failure: `status=FAILED`, `errorMessage` set from
   the provider's error.
5. Still-rendering packages are left untouched for the next poll.
6. Returns a summary count; never throws — provider/network errors for one
   package are caught and recorded on that package's `errorMessage`
   without aborting the batch.

### Approve / reject / download routes

Same admin-session-gated pattern as the existing
`apps/menhealth/app/api/social/drafts/[id]/{approve,reject}/route.ts`:

- `POST /api/social/video-ads/generate` → calls `generateAdVideoPackage()`.
- `POST /api/social/video-ads/[id]/approve` → only valid from
  `PENDING_REVIEW`; sets `status=APPROVED`, `approvedAt`,
  `approvedBy` (from the session).
- `POST /api/social/video-ads/[id]/reject` → only valid from
  `PENDING_REVIEW`; sets `status=REJECTED`.
- `GET /api/social/video-ads/[id]/download` → 404s unless
  `status=APPROVED`; streams a zip containing the three MP4s, thumbnail.png,
  subtitles.srt, and a generated `publishing_copy.txt` (caption + hashtags +
  disclaimer line), built on the fly from the Blob-hosted assets and DB
  fields — this is the same deliverable shape as the ChatGPT-produced
  package, just assembled from our own generated content.

### Cron job

New `apps/menhealth/jobs/poll-ad-video-renders.ts` exporting
`pollAdVideoRenders()`, and
`apps/menhealth/app/api/cron/poll-ad-video-renders/route.ts`, matching the
existing
[publish-scheduled-social/route.ts](../../../apps/menhealth/app/api/cron/publish-scheduled-social/route.ts)
pattern exactly:

```ts
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await pollAdVideoRenders();
  return NextResponse.json(result);
}
```

Scheduled every few minutes at the hosting layer (same place the other cron
routes are scheduled — outside this repo's code, e.g. Vercel Cron config).

### Admin UI

- `apps/menhealth/app/admin/(protected)/social/video-ads/page.tsx` —
  package list with status badges, same list/filter shell as
  [drafts/page.tsx](../../../apps/menhealth/app/admin/(protected)/social/drafts/page.tsx).
- `video-ads/generate/page.tsx` — one "Generate ad package" button (no
  per-video picker, since this is site-wide promo copy, not sourced from a
  specific video). No hand-edit capability in v1: unlike text drafts, an
  edited script can't retroactively change a voiceover that's already been
  synthesized and baked into a render, so there's no `updateAdVideoPackage`
  equivalent to `updateSocialPostDraft`. The only way to change the script
  is to generate a new package (fresh `AdVideoPackage` row, fresh AI call).
- `video-ads/[id]/page.tsx` — detail view: script/caption/hashtags shown
  read-only, tabbed `<video>` preview for the three aspect ratios, thumbnail
  image, subtitle text, Approve/Reject buttons (only shown when
  `PENDING_REVIEW`), Download button (only shown when `APPROVED`), and a
  "Generate new package" button (calls `generateAdVideoPackage()` again,
  same as the list page's button — offered here too so a rejected/failed
  package can be retried without navigating away).
- Added as a fifth entry-point link alongside the existing YouTube
  Community/TikTok/Reddit/X links added in the platform-tailored social
  drafts work
  ([2026-08-06-platform-tailored-social-drafts-design.md](2026-08-06-platform-tailored-social-drafts-design.md)).

### Testing

Per `AGENTS.md`'s standard (unit tests for scoring/parsing/AI-output-shaped
functions), all with Creatomate/ElevenLabs/Blob calls mocked — no real
network calls in tests:

- `generateAdVideoPackage`: rejects and creates no row when
  `checkForbiddenPatterns`/`detectHighRiskTopic` trips on the generated
  script or caption; on success, creates a `RENDERING` row with
  `renderProviderId` set.
- `pollRenderingPackages`: transitions a mocked-complete render to
  `PENDING_REVIEW` with all `*Url` fields set; transitions a
  mocked-failed render to `FAILED` with `errorMessage` set; leaves a
  still-rendering package untouched; one package's provider error doesn't
  abort processing of the others in the same batch.
- `.srt`-from-timestamps generation: given a known set of word timestamps,
  produces correctly-numbered, correctly-timed subtitle cues.
- Approve/reject routes: 404/409 outside `PENDING_REVIEW`, succeed and set
  fields correctly from `PENDING_REVIEW`.
- Download route: 404s unless `APPROVED`; zip contents match the five
  expected files.

## Out of scope

- Any change to `SocialPost`, its adapters, or the four existing
  platforms — this is a fully separate model and generator module.
- Publishing/uploading the rendered video anywhere — the flow ends at
  "download the approved package"; admin uploads it manually, same as
  every other platform's manual-publish steps.
- Per-video ad packages (tied to a specific video's `VideoContext`) — this
  spec only covers the general site-promo ad. A per-video variant, if
  wanted later, is a separate follow-up (`sourceType`/`sourceId` would need
  adding to `AdVideoPackage`).
- Editing the Creatomate template itself (typography, CTA layout, music
  track) — done in Creatomate's dashboard, not in this repo.
- `apps/hype-check` — this spec only covers `apps/menhealth`.
- Regenerating a *single* rendition (e.g. re-rendering just the square
  export) — a regenerate always re-runs the whole pipeline (script → voice
  → all three renditions) since the aspect ratios all come from one
  Creatomate render job.
