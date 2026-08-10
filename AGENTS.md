<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:menhealth-digest-project-rules -->
# MenHealth Digest

Next.js App Router monorepo that discovers, summarizes, ranks, and fact-checks men's-health-style videos from YouTube. Also runs a social content engine (with real automated publishing to some platforms), a newsletter, and monetization (affiliate/sponsor/Stripe). Two sites currently run on this machinery: `apps/menhealth` (the reference site, most mature) and `apps/hype-check` (a second topic vertical — AI tools / side-hustle reviews). See `docs/adding-a-new-site.md` for how a new vertical is stood up on the shared `packages/*`.

`.github/copilot-instructions.md` and `.github/instructions/*.instructions.md` predate the `apps/*`+`packages/*` split and describe an old flat, single-app repo (root-level `lib/social/`, `middleware.ts`, no mention of `packages/core-*`). **Do not trust their file paths or "not yet built" claims** — treat this file as authoritative for structure, and check `docs/superpowers/specs/*-design.md` / `docs/superpowers/plans/*.md` for the actual design history of a given feature before assuming an instructions file's "implementation sequence" reflects current reality.

## Non-negotiable rules

- Never download, proxy, rehost, or restream YouTube videos. Official embeds only.
- Never let AI output publish health/claim content automatically. High-risk categories (TRT/testosterone, medications, supplements, cancer, mental health, ED) require admin approval before publishing.
- Never present AI-generated output as medical advice — every video/topic page needs the disclaimer component.
- Never expose server-side API keys to client components. All env access goes through each app's `env.ts` (`@t3-oss/env-nextjs`, Zod-validated), not raw `process.env`.
- All affiliate/sponsor content must include the disclosure component.
- Social engine specifics (`packages/core-social/**`, `apps/*/lib/social/**`): no Reddit auto-posting, no auto-commenting/DMs, no third-party footage reuse. **X and TikTok publishing are real and automated** (OAuth-connected, `SocialPublisher.publish()` actually calls the platform API) — but always triggered by an explicit admin action (a click, or a scheduled post the admin already approved), never a fully unattended pipeline. Reddit and YouTube Community stay manual/copy-paste (`isManualPlatform` in `DraftActions.tsx`). Don't assume "adapter" means "stub" — check the adapter file itself.

## Stack and architecture

- pnpm/Turborepo monorepo, Node ≥24, pnpm ≥10. Next.js **16** (this fork deprecates `middleware.ts` in favor of `proxy.ts` — see the root `AGENTS.md` warning above; `apps/hype-check/proxy.ts` is the live example, e.g. canonical-domain redirects). TypeScript strict, Tailwind + shadcn/ui, PostgreSQL + Prisma (one DB per app, no shared `core-db` package — Prisma Client generation is inherently per-app), Auth.js v5.
- AI calls go through `packages/core-ai`'s `createAiClient()`, instantiated per-app (e.g. `apps/menhealth/lib/ai/client.ts`) with that site's env. Fallback order is **Groq → OpenRouter (free-tier models) → OpenAI → Gemini**, each branch skipped if its key is unset; callers only ever see the `anthropic.messages.create()`-shaped wrapper regardless of which provider actually answered — that shape is a naming convention kept for caller compatibility, not a sign Anthropic is in the chain (it isn't; `ANTHROPIC_API_KEY` still exists in `env.ts` but `createAiClient()` doesn't accept or use it).
- Admin routes are gated by a session check in `app/admin/(protected)/layout.tsx` (via `lib/auth`, checking `session.user.isAdmin`) — not `middleware.ts`/`proxy.ts`. No app in this repo currently uses `proxy.ts` for auth, only for things like canonical-host redirects.
- Cron/internal routes are protected by an `x-cron-secret` header check, not session auth.
- Server Components by default; `"use client"` only for interactivity. Route handlers in `app/api/`. All external API I/O validated with Zod at the boundary. AI/domain functions return `Result<T, E>` rather than throwing.
- Topics, creators, brand strings, and compliance keyword lists live in each app's `site.config.ts` (validated by `@menhealth/site-kit` at import time). `CATEGORY_RISK_FLOOR` (per-app `lib/ai/claim-risk.ts`, wrapping `packages/core-compliance`'s `claim-risk.ts`/`auto-publish-gate.ts`) is deliberately *not* in `site.config.ts` — it's keyed to the Prisma `ClaimCategory` enum, not generic site data.
- **`packages/core-social` vs `apps/<site>/lib/social`**: the shared package holds the adapters, prompt builders, UTM/validation helpers — the stable surface every site gets. App-local `lib/social/` can and does grow beyond that (menhealth has an ffmpeg + OpenAI-TTS video-generation pipeline — `generate-social-video.ts`, `video-plan.ts`, `video-render.ts`, `video-narration-audio.ts`, `blob-storage.ts` — that hype-check doesn't have yet). When adding a social feature, decide deliberately whether it belongs in the shared package or is genuinely app-specific; check `docs/superpowers/specs/2026-08-07-hype-check-social-video-port-design.md` before assuming parity between the two apps.
- This repo uses a spec → plan → implementation workflow (Superpowers skills): non-trivial features have a design doc in `docs/superpowers/specs/*-design.md`, an implementation plan in `docs/superpowers/plans/*.md`, and sometimes per-task briefs/reports under `.superpowers/sdd/<feature>/`. Check these before re-deriving a design from scratch — the reasoning behind non-obvious choices (e.g. why TikTok publish uses `FILE_UPLOAD` instead of `PULL_FROM_URL`) is usually already written down. Isolated feature branches sometimes exist as git worktrees under `.claude/worktrees/<name>/` — check `git worktree list` before assuming a stale-looking directory is dead.

## Repository structure

```
apps/
  menhealth/                  # Reference site
  hype-check/                 # Second topic vertical (AI tools / side-hustle reviews)
    app/(public)/               # Public-facing pages
    app/admin/(protected)/      # Admin dashboard (session-gated in its layout, not middleware/proxy)
    app/api/                    # Route handlers (admin/, social/, cron/, stripe/, newsletter/, youtube/, ai/, seo/)
    components/                 # Site-only components (BrandLogotype, SiteHeader) + growth-plan/, topic/
    lib/                        # Thin per-concern wrappers instantiating packages/core-* with this site's env/data
                                 # (but see note above — some, like lib/social/video-*, aren't thin at all)
    jobs/                       # Background job functions (invoked by cron API routes)
    prisma/                     # Schema and migrations (this app's own DB — not shared)
    site.config.ts              # Topics, creators, brand, compliance keyword lists
    proxy.ts                    # Optional — Next 16's middleware.ts replacement (not used for auth here)
packages/
  ui/                          # Shared presentational components
  core-youtube/                # YouTube API client + scoring
  core-ai/                     # Provider-fallback AI client + summarize/fact-check pipeline
  core-compliance/             # claim-risk.ts, auto-publish-gate.ts, content-safety.ts
  core-social/                 # Adapters (X, TikTok, Reddit, YouTube Community), prompts, UTM, validation
  core-seo/, core-monetization/, core-newsletter/, core-auth/
  site-kit/                    # SiteConfig type + validateSiteConfig() used by each site.config.ts
docs/
  adding-a-new-site.md         # Shared-vs-yours checklist for standing up a new vertical
  superpowers/{specs,plans}/   # Design docs and implementation plans, one pair per feature
.superpowers/sdd/               # Per-task briefs/reports for subagent-driven-development runs
```

## Quality standards

- Add unit tests for scoring, parsing, and AI-output-validation functions.
- Small, single-concern PRs. No magic strings — named constants. Early returns over deep nesting.
- `README.md` documents real getting-started steps (env vars, `prisma migrate dev`, triggering the YouTube sync cron locally) — it's a reasonable onboarding start, unlike the stale `.github/` instructions files.
<!-- END:menhealth-digest-project-rules -->
