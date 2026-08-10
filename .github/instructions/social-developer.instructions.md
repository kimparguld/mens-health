---
applyTo: "packages/core-social/**,apps/*/lib/social/**,apps/*/app/admin/(protected)/social/**,apps/*/app/api/social/**,apps/*/__tests__/social*"
---

# Copilot Agent: Social Content Engine — Developer

## Role

You are the Developer agent implementing the Social Content Engine for MenHealth Digest. Build in small, reviewable PRs.

**This engine is largely built already, across two layers — read this whole file before assuming something is a stub.** The original "implementation sequence" this file used to describe is done; TikTok in particular is *not* a stub anymore.

## Where things actually live

- **`packages/core-social/src/`** — the shared surface both apps get: `adapters/{publisher,x,tiktok,reddit,youtube,refresh-token}.ts`, `platform-constraints.ts`, `prompts.ts`, `utm.ts`, `validation.ts`, `generate-social-post.ts`.
- **`apps/<site>/lib/social/`** — the app-local layer: `platform-rules.ts` (wires the shared constraints/prompts to *this site's* `site.config.ts` forbidden-pattern/high-risk data via `packages/core-compliance`), `templates.ts` (seed templates), `generate-social-post.ts`, `utm.ts`, and adapter re-exports.
- **`apps/menhealth/lib/social/`** additionally has an app-local AI video-generation pipeline — `generate-social-video.ts`, `video-plan.ts`, `video-render.ts` (ffmpeg), `video-narration-audio.ts` (OpenAI TTS, currently **disabled** — `NARRATION_AUDIO_ENABLED = false`, videos render as a silent caption slideshow), `blob-storage.ts` (Vercel Blob). `apps/hype-check` does not have this yet — see `docs/superpowers/specs/2026-08-07-hype-check-social-video-port-design.md` before assuming parity.
- **Admin UI**: `app/admin/(protected)/social/{drafts,calendar,accounts,generate}`.
- **API routes**: `app/api/social/{generate,drafts/[id]/{approve,reject,schedule,mark-published,regenerate,video,publish},tiktok/oauth[/callback],x/oauth[/callback]}`.
- **Scheduled publish job**: `jobs/publish-scheduled-social.ts`, invoked by `app/api/cron/publish-scheduled-social`.

## Technical constraints

- Next.js App Router — no Pages Router.
- TypeScript strict mode. No `any`.
- Server Components by default. `"use client"` only for interactive UI.
- Route handlers in `app/api/`. Server actions for form mutations.
- All env vars accessed through that app's `env.ts`. No secrets in client code.
- All external API responses (AI, YouTube, platform APIs) Zod-validated before use.
- AI generation functions return `Result<T, E>` — never throw from domain logic.
- Platform OAuth tokens (`SocialAccount.accessToken`/`refreshToken`) are stored server-only and never sent to the client — but note they are **not actually encrypted at the app layer today**, despite the schema's `/// Encrypted access token` comment. Don't assume encryption exists elsewhere in the stack; if your PR is a natural place to add it, flag that to the reviewer rather than silently relying on the comment being true.

## Data model (Prisma) — current shape

```prisma
enum Platform { YOUTUBE_COMMUNITY TIKTOK REDDIT X }   // no Instagram, no LinkedIn — dropped from the original plan
enum PostStatus { DRAFT PENDING_REVIEW APPROVED SCHEDULED PUBLISHED REJECTED FAILED }
enum SourceType { VIDEO_SUMMARY CLAIM TOPIC_PAGE WEEKLY_DIGEST }
enum MediaType { VIDEO TEXT IMAGE }
enum RiskLevel { LOW MEDIUM HIGH }
enum VideoGenerationStatus { GENERATING READY FAILED }

model SocialPost {
  platform, status, sourceType, sourceId
  hook, script, caption, hashtags, utmUrl
  riskLevel, requiresReview
  scheduledAt, publishedAt, platformPostId, platformUrl
  videoUrl, videoStatus, videoError        // populated by the app-local video pipeline (menhealth only so far)
  templateId -> SocialTemplate
  attempts   -> SocialPublishAttempt[]
  metrics    -> SocialMetric[]
}
// SocialTemplate, SocialAccount, SocialPublishAttempt, SocialMetric — see prisma/schema.prisma directly, don't
// assume this doc's shape stays exact; the schema is the source of truth.
```

## Seed templates (`apps/<site>/lib/social/templates.ts`)

Four templates seeded per site: **Claim Check**, **3 Takeaways**, **Useful but Incomplete**, **Weekly Roundup** — each with its own hook/script variable set. Check the file directly for current variable names before writing a new one; don't invent a fifth without checking whether the PM actually asked for it.

## Caption shape (AI-generated, not a fixed literal template)

`packages/core-social/src/prompts.ts` builds the generation prompt from a `PromptConfig` that's now genuinely site-generic — `contentTypeLabel` (e.g. "product/course review" for hype-check vs. a video-summary framing for menhealth) and `disclaimerLine` (menhealth's is "Educational only. Not medical advice."; a non-health site would use something else) are passed in per-site, not hardcoded. The AI is asked to include an evidence label (Strong/Moderate/Mixed/Weak/Not checked), a risk label, the site's disclaimer line, and the UTM link — but `validation.ts`'s Zod schema only checks the caption is a non-empty string in range, it doesn't regex-enforce this exact structure. Don't assume changing the wording breaks validation; do make sure the disclaimer line still ends up in the output for high-risk content.

## Forbidden patterns and high-risk detection

These are **not** hardcoded in `platform-rules.ts`. Each site defines its own `forbiddenContentPatterns`, `highRiskTextPatterns`, and `highRiskTopicKeywords` in its `site.config.ts`; `packages/core-compliance`'s `checkForbiddenPatterns()`/`detectHighRiskTopic()` do the actual matching, and each app's `lib/social/platform-rules.ts` wires the two together. If you need to check or add a forbidden pattern, edit that site's `site.config.ts`, not a regex list in the social package. menhealth's list today includes things like "fix your testosterone/energy/hormones", "this cures", "doctors don't want you to know", "every man needs this" — read the file for the current, exact set rather than copying this list elsewhere, since it can change.

## UTM format

Built by `packages/core-social`'s `buildUtmUrl()` (`apps/<site>/lib/social/utm.ts` re-exports it), keyed off `PLATFORM_UTM` in `utm.ts`:

- YouTube Community → `utm_source=youtube&utm_medium=community`
- TikTok → `utm_source=tiktok&utm_medium=video`
- Reddit → `utm_source=reddit&utm_medium=post`
- X → `utm_source=x&utm_medium=post`

`utm_campaign` is always the caller-supplied campaign string, lowercased with spaces replaced by underscores — check `PLATFORM_UTM` directly before changing any of this, since campaign is currently the same shape across all four platforms.

## Publishing reality per platform — read this before touching an adapter

- **X (`adapters/x.ts`)** — real, automated publish via the X API. Runs both from an explicit admin "Publish" click and from the `SCHEDULED`-post cron (`jobs/publish-scheduled-social.ts`), which only has an adapter wired up for X.
- **TikTok (`adapters/tiktok.ts`)** — real, automated publish via TikTok's Content Posting API v2 (Direct Post, `FILE_UPLOAD`). **Not** a stub — don't reintroduce a `NOT_IMPLEMENTED` return. Requires the post to already have `videoStatus === 'READY'` and a `videoUrl` (i.e. it must have gone through the app-local video-generation pipeline first) — `validate()` rejects posts without one. Only reachable via the admin-triggered `/api/social/drafts/[id]/publish` route today; it is **not** wired into the `SCHEDULED`-cron's adapter map, so a TikTok post that reaches `SCHEDULED` will currently fail there rather than publish — don't assume scheduling a TikTok post does anything useful until that gap is closed.
- **YouTube Community and Reddit** — manual/copy-paste only (`isManualPlatform` in `DraftActions.tsx`). Generate the draft, admin posts it manually elsewhere, then clicks "mark published." **No auto-posting code for either, ever** — this is a hard rule, not just current scope.
- Every publish path — automated or manual — requires the post to already be `APPROVED`, which itself requires passing the risk-level review gate. That admin approval step, not the publish call itself, is what satisfies "no AI output published without human approval," even for the platforms that publish automatically once approved.

## Reddit draft rules

- Generate subreddit-specific draft with community-value framing.
- Avoid CTA-first language; link is optional.
- Render manual posting checklist alongside draft (check subreddit rules, avoid link-only posts, participate in comments, disclose affiliation, don't repost identical text across subreddits).
- No auto-posting code. Admin manually posts and then marks the post as published.

## Do not implement

- Auto-commenting or auto-DMs, on any platform
- Reddit auto-posting, at any level
- Downloading or re-encoding third-party YouTube video footage
- Auto-publishing without human approval — including for X and TikTok, which publish automatically only after that approval, never before
- Paid ads API integration
- Client-side access to platform OAuth tokens
