<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:menhealth-digest-project-rules -->
# MenHealth Digest

Next.js App Router app that discovers, summarizes, ranks, and fact-checks men's health videos from YouTube. Also runs a social content engine, newsletter, and monetization (affiliate/sponsor/Stripe).

Mirrors the fuller Copilot instructions in `.github/copilot-instructions.md` and `.github/instructions/*.instructions.md` (project rules, role-based developer/reviewer/PM playbooks, and a scoped playbook for `lib/social/**`) — check those for more detail on a given area. This section exists so the same non-negotiables apply automatically, since only `CLAUDE.md`/`AGENTS.md` are auto-loaded.

## Non-negotiable rules

- Never download, proxy, rehost, or restream YouTube videos. Official embeds only.
- Never let AI output publish health content automatically. High-risk categories (TRT/testosterone, medications, supplements, cancer, mental health, ED) require admin approval before publishing.
- Never present AI-generated output as medical advice — every video/topic page needs the disclaimer component.
- Never expose server-side API keys to client components. All env access goes through `env.ts` (Zod-validated), not raw `process.env`.
- All affiliate/sponsor content must include the disclosure component.
- Social engine specifics (`lib/social/**`): no Reddit auto-posting, no auto-commenting/DMs, no third-party footage reuse — see `.github/instructions/social-*.instructions.md` before touching this area.

## Stack and architecture

- Next.js App Router, TypeScript strict, Tailwind + shadcn/ui, PostgreSQL + Prisma, Auth.js v5.
- AI calls go through `lib/ai/client.ts`, which exposes an `anthropic.messages.create()`-shaped wrapper but actually falls back through Groq → OpenRouter (free models) → OpenAI → Gemini. Note: the `callAnthropic` branch there is currently broken (missing auth header, and parses the response in OpenAI's `choices[]` shape instead of Anthropic's `content[]` shape) — in practice every request falls through to Groq.
- Admin routes are gated by a session check in `app/admin/(protected)/layout.tsx` (via `lib/auth`), not a root `middleware.ts`.
- Cron/internal routes are protected by an `x-cron-secret` header check.
- Server Components by default; `"use client"` only for interactivity. Route handlers in `app/api/`. All external API I/O validated with Zod at the boundary. AI/domain functions return `Result<T, E>` rather than throwing.

## Repository structure

```
app/(public)/          # Public-facing pages
app/admin/(protected)/ # Admin dashboard (session-gated in its layout)
app/api/                # Route handlers (admin/, social/, cron/, stripe/, newsletter/, youtube/, ai/, seo/)
components/             # Shared components (ui/, video/, seo/, newsletter/, monetization/, ads/, growth-plan/)
lib/youtube/            # YouTube API client, scoring, topic/creator seeds
lib/ai/                 # AI abstraction layer (see fallback chain above)
lib/social/             # Social content engine: generation, platform rules, UTM, adapters/
lib/db/                 # Prisma singleton + queries
lib/auth/               # Auth.js config
lib/seo/, lib/monetization/, lib/newsletter/, lib/resend/, lib/stripe/, lib/flags/, lib/growth-plan/
jobs/                   # Background job functions (invoked by cron API routes)
prisma/                 # Schema and migrations
```

## Quality standards

- Add unit tests for scoring, parsing, and AI-output-validation functions.
- Small, single-concern PRs. No magic strings — named constants. Early returns over deep nesting.
- `README.md` is stock `create-next-app` boilerplate and does not describe this app — don't rely on it for onboarding.
<!-- END:menhealth-digest-project-rules -->
