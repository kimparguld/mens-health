# MenHealth Digest — Copilot Project Instructions

You are working in a pnpm/Turborepo monorepo that discovers, summarizes, ranks, and fact-checks men's-health-style videos from YouTube, then runs a social content engine, newsletter, and monetization (affiliate/sponsor/Stripe) around them. Two sites currently run on this machinery: **`apps/menhealth`** (the reference site, most mature) and **`apps/hype-check`** (a second topic vertical — AI tools / side-hustle reviews). `AGENTS.md` at the repo root is the canonical summary auto-loaded by AI coding tools; this file is the fuller version. If the two ever disagree, trust `AGENTS.md` and fix this file.

Role-specific detail lives in `.github/instructions/*.instructions.md` — developer, code-reviewer, and project-manager playbooks, plus a `social-*` variant of each scoped to the social content engine. Read the scoped one before touching `packages/core-social/**` or `apps/*/lib/social/**`.

## Non-negotiable rules

- **Never download, proxy, rehost, or restream YouTube videos.** Official embeds only.
- **Never let AI output publish health/claim content automatically.** High-risk categories require admin approval before publishing.
- **Never present AI-generated output as medical advice.** Every video and topic page must include the health disclaimer component.
- **Never expose server-side API keys to client components.** All secrets are validated in each app's `env.ts` (`@t3-oss/env-nextjs`) and server-only.
- **All affiliate and sponsor content must include the disclosure component.**
- **Social engine:** no Reddit auto-posting, no auto-commenting/DMs, no third-party footage reuse. X and TikTok publishing *are* real and automated (see the social instructions), but always behind an explicit admin action.

## Technical stack

- Next.js **16** App Router — TypeScript strict mode. This fork deprecates `middleware.ts` in favor of `proxy.ts` (same behavior, new file/export name) — check `node_modules/next/dist/docs/` before assuming Pages-Router-era or pre-v16 conventions still apply.
- Tailwind CSS + shadcn/ui
- PostgreSQL + Prisma — one database per app, no shared `core-db` package
- Auth.js v5 (NextAuth)
- AI: `packages/core-ai`'s `createAiClient()` — provider fallback chain **Groq → OpenRouter (free-tier models) → OpenAI → Gemini**, each skipped if unconfigured. Callers use a `client.anthropic.messages.create({...})`-shaped wrapper purely as an interface convention; no branch actually calls Anthropic (`ANTHROPIC_API_KEY` still exists in `env.ts` but isn't read by this chain).
- YouTube Data API v3 + YouTube IFrame Player API
- Resend (newsletter) · Stripe (premium subscriptions) · Vercel Cron (scheduled jobs) · Vercel Blob (generated video assets) · Vitest (testing)

## Architecture rules

- Server Components by default. Client Components only for interactivity (`"use client"`).
- Route handlers in `app/api/`. Cron routes protected by an `x-cron-secret` header, not session auth.
- Admin routes are gated by a session check in `app/admin/(protected)/layout.tsx` (checking `session.user.isAdmin`), **not** `middleware.ts`/`proxy.ts`.
- All external API inputs/outputs validated with Zod at the boundary.
- AI/domain functions return `Result<T, E>` — never throw from domain logic.
- High-risk claims: content stays out of a publishable state until admin explicitly approves it.
- Site-specific data (topics, creators, brand, compliance keyword lists) lives in each app's `site.config.ts`, validated by `@menhealth/site-kit` at import time — that's the file a new vertical fills in. See `docs/adding-a-new-site.md`.

## Repository structure

```
apps/menhealth/, apps/hype-check/    # Each a full Next.js app
  app/(public)/                       # Public-facing pages
  app/admin/(protected)/              # Admin dashboard (session-gated in its layout)
  app/api/                            # Route handlers (admin/, social/, cron/, stripe/, newsletter/, youtube/, ai/, seo/)
  components/                          # Site-only components
  lib/                                 # Per-concern wrappers around packages/core-* with this site's env/data
                                        # (not all "thin" — e.g. menhealth's lib/social/video-* pipeline is app-local)
  jobs/                                # Background job functions invoked by cron routes
  prisma/schema.prisma                 # This app's own DB — not shared with the other app
  site.config.ts                       # Topics, creators, brand, compliance keyword lists
packages/
  ui/                        # Shared presentational components
  core-youtube/               # YouTube API client + video scoring
  core-ai/                     # Provider-fallback AI client + summarize/extract-claims/fact-check pipeline
  core-compliance/             # claim-risk.ts, auto-publish-gate.ts, content-safety.ts
  core-social/                 # Social adapters (X, TikTok, Reddit, YouTube Community), prompts, UTM, validation
  core-seo/, core-monetization/, core-newsletter/, core-auth/
  site-kit/                   # SiteConfig type + validateSiteConfig()
docs/
  adding-a-new-site.md         # Shared-vs-yours checklist for a new vertical
  superpowers/{specs,plans}/   # Design docs + implementation plans, one pair per past feature
```

## Quality standards

- Add unit tests for all scoring, parsing, and AI output validation functions.
- PRs should be small and focused on a single concern.
- No magic strings — extract named constants.
- Use early returns to keep nesting shallow.
- Before assuming a feature is "not built yet," grep for it — check `docs/superpowers/specs/*-design.md` and `plans/*.md` for the real design history rather than relying on this file's phase/epic language, which can lag actual implementation.
