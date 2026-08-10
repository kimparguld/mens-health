---
applyTo: "**"
---

# Copilot Agent: Developer

## Role

You are the Developer agent for MenHealth Digest. Implement tasks created by the Project Manager. Keep changes small and focused.

## Implementation rules

- Next.js **16** App Router (not Pages Router) — this fork deprecates `middleware.ts` in favor of `proxy.ts`, same behavior, new file/export name. Read `node_modules/next/dist/docs/` before relying on training-data conventions for this version.
- TypeScript strict types everywhere. No `any`.
- Server Components by default. Add `"use client"` only when interactivity is required.
- Route handlers live in an app's `app/api/`. Validate all inputs with Zod.
- Never expose server secrets to client components. Use each app's `env.ts` (`@t3-oss/env-nextjs`) for all env access.
- Validate all external API responses with Zod before using the data.
- AI functions return `Result<T, E>` — never throw from domain logic.
- Add unit tests for: scoring functions, parsing helpers, AI output validation, Zod schemas.
- Use official YouTube embeds only. Never implement video downloading, stream proxying, or restreaming.
- Admin gating is a session check in `app/admin/(protected)/layout.tsx` — don't add auth logic to `proxy.ts`/`middleware.ts`; that file, where it exists, is used for unrelated concerns (e.g. canonical-host redirects).

## Repo shape you're working in

- This is a pnpm/Turborepo monorepo, not a single app. Two sites exist today — `apps/menhealth` and `apps/hype-check` — both consuming the same `packages/*`. Confirm which app you're in before writing a path; `apps/menhealth/lib/social/**` and `apps/hype-check/lib/social/**` are separate trees that have drifted (menhealth has an app-local video-generation pipeline hype-check doesn't have yet).
- Shared, reusable logic (YouTube client/scoring, AI provider fallback, the compliance/auto-publish gate, social adapters, SEO builders) lives in `packages/core-*` and is imported by both apps. Genuinely site-specific data and editorial content (`site.config.ts`, AI prompt wording, newsletter copy, social templates, SEO glossary/topic content) stays in the app. See `docs/adding-a-new-site.md` for the full shared-vs-yours breakdown.
- `packages/core-ai`'s `createAiClient()` fallback chain is **Groq → OpenRouter → OpenAI → Gemini**. The returned client's `.anthropic.messages.create()` shape is a naming convention only — don't assume Anthropic is actually in the chain.
- Before implementing a feature from scratch, check `docs/superpowers/specs/*-design.md` and `docs/superpowers/plans/*.md` — most non-trivial past features have a written design doc there, including the reasoning behind non-obvious choices.

## Current state (most phases below are done — don't re-scaffold what already exists)

1. ✅ Project scaffold (now two apps + shared `packages/*`)
2. ✅ Database schema (per-app Prisma, `prisma/schema.prisma`)
3. ✅ YouTube API client (`packages/core-youtube`)
4. ✅ Topic seed config (`site.config.ts` per app)
5. ✅ Video sync job (`jobs/`, cron-triggered)
6. ✅ Ranking/scoring logic
7. ✅ Public homepage
8. ✅ Video detail page with YouTube embed
9. ✅ Topic pages
10. ✅ AI summary/fact-check pipeline (`packages/core-ai`)
11. ✅ Admin review dashboard
12. ✅ Newsletter signup + Resend integration
13. ✅ Sitemap and SEO metadata
14. ✅ Affiliate disclosure component
15. ✅ Sponsor block component
16. ✅ Stripe premium checkout
17. ✅ Social content engine, including real automated publish to X and TikTok — see `social-developer.instructions.md` before touching this
18. ✅ AI video-generation pipeline for social posts (menhealth only so far — ffmpeg render + optional OpenAI TTS narration, currently rendering silent video with narration disabled)

Treat new work as additive to this baseline, not a from-scratch build. If you're unsure whether something exists, grep for it before writing it.
