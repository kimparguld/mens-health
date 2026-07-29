# MenHealth Digest

A Next.js App Router application that discovers, summarizes, ranks, and fact-checks men's health videos from YouTube. It also runs a social content engine, a newsletter, and monetization (affiliate links, sponsors, Stripe premium).

See [AGENTS.md](AGENTS.md) for the non-negotiable product/compliance rules, stack, and repo layout, and `.github/instructions/*.instructions.md` for the fuller role-based playbooks (developer, code reviewer, project manager).

## Stack

Next.js App Router (TypeScript, strict) · Tailwind + shadcn/ui · PostgreSQL + Prisma · Auth.js v5 · YouTube Data API v3 · Vercel Cron · Resend · Stripe · Vitest.

## Getting started

1. Install dependencies (this project uses pnpm — see `packageManager` in `package.json`):

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env` and fill in the values. At minimum you need `DATABASE_URL`, `NEXTAUTH_SECRET`, `ADMIN_EMAILS`, `YOUTUBE_API_KEY`, and `CRON_SECRET`; see `env.ts` for the full list (AI provider keys, Resend, Stripe, and social OAuth credentials are optional and feature-gated).

   ```bash
   cp .env.example .env
   ```

3. Apply the Prisma schema to your database:

   ```bash
   npx prisma migrate dev
   ```

4. Run the dev server:

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `pnpm dev` / `pnpm build` / `pnpm start` — Next.js dev/build/start
- `pnpm lint` — ESLint
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm test` / `pnpm test:watch` — Vitest
- `pnpm format` — Prettier

## Triggering the YouTube sync job locally

The sync route is protected by the `x-cron-secret` header — use the value from your own `.env`, not a shared/example secret:

```bash
curl -X POST http://localhost:3000/api/youtube/sync \
  -H "x-cron-secret: $CRON_SECRET"
```

In production this is invoked on a schedule via Vercel Cron (see `vercel.json`).
