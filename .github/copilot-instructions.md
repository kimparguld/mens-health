# MenHealth Digest — Copilot Project Instructions

You are working on MenHealth Digest: a Next.js App Router application that discovers, summarizes, ranks, and fact-checks men's health videos from YouTube.

## Non-negotiable rules

- **Never download, proxy, rehost, or restream YouTube videos.** Use official embeds only.
- **Never let AI output publish health content automatically.** High-risk categories require admin approval before publishing.
- **Never present AI-generated output as medical advice.** Every video and topic page must include the health disclaimer component.
- **Never expose server-side API keys to client components.** All secrets are validated in `env.ts` and server-only.
- **All affiliate and sponsor content must include the disclosure component.**

## Technical stack

- Next.js 15+ App Router — TypeScript strict mode
- Tailwind CSS + shadcn/ui
- PostgreSQL + Prisma
- Auth.js v5 (NextAuth)
- Anthropic Claude (abstracted under `/lib/ai/`)
- YouTube Data API v3 + YouTube IFrame Player API
- Resend (newsletter)
- Stripe (premium subscriptions)
- Vercel Cron (scheduled jobs)
- Vitest (testing)

## Architecture rules

- Server Components by default. Client Components only for interactivity (`"use client"`).
- Route handlers in `app/api/`. Cron routes protected by `x-cron-secret` header.
- All external API inputs/outputs validated with Zod at the boundary.
- AI functions return `Result<T, E>` — never throw from domain logic.
- High-risk claims: video stays in `PROCESSED` status until admin explicitly publishes.
- Admin routes protected by Auth.js middleware in `middleware.ts`.

## Repository structure

```
app/(public)/          # Public-facing pages
app/admin/             # Admin dashboard (auth-gated)
app/api/               # Route handlers
components/            # Shared components
lib/youtube/           # YouTube API client, scoring, topic seeds
lib/ai/                # AI abstraction layer (Anthropic)
lib/db/                # Prisma singleton
lib/auth/              # Auth.js config
jobs/                  # Background job functions
prisma/                # Schema and migrations
```

## Quality standards

- Add unit tests for all scoring, parsing, and AI output validation functions.
- PRs should be small and focused on a single concern.
- No magic strings — extract named constants.
- Use early returns to keep nesting shallow.
