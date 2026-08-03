# Adding a new site

This repo is a pnpm/Turborepo monorepo. `apps/menhealth` is the reference
site; `packages/*` hold the machinery every site reuses (YouTube discovery,
AI summarize/fact-check pipeline, the admin-approval gate, the social engine,
newsletter, SEO plumbing, UI primitives). Standing up a new topic vertical —
same product shape, different niche — means creating a new `apps/<site>`
that consumes those packages, not copying business logic.

## What's shared vs. what's yours

| Shared (`packages/*`) | Yours (`apps/<site>`) |
|---|---|
| YouTube API client + video scoring engine | `site.config.ts` — topics, creators, brand, compliance data |
| AI provider fallback chain + summarize/extract-claims/fact-check/editorial-title/topic-faq | AI prompt wording (still references "men's health" — see below) |
| Admin-approval gate, deterministic claim-risk classifier | `CATEGORY_RISK_FLOOR` (keyed to your Prisma `ClaimCategory` enum) |
| Social adapters (X, Reddit, TikTok stub, YouTube Community), platform char limits | Newsletter digest copy, social post seed templates |
| Auth.js config factory, Stripe/Resend client factories | `env.ts`, all secrets, `prisma/schema.prisma`, `next.config.ts` |
| SEO metadata/JSON-LD builders | Topic content, glossary, FAQ data (`lib/seo/*.ts`) |
| `@menhealth/ui` — presentational components | `SiteHeader`, `BrandLogotype`, nav copy, Tailwind theme |

The non-negotiables in `AGENTS.md` (no YouTube downloads, HIGH-risk content
always needs admin approval, disclaimer required, no raw `process.env`
outside `env.ts`, no Reddit auto-posting) are compiled into `packages/core-*`
itself — a site can't configure them away.

## Steps

1. **Scaffold the app**
   ```
   cp -r apps/menhealth apps/<new-site>
   ```
   Then delete anything that's clearly menhealth-specific content: the
   `public/` favicons/OG images, `prisma/migrations/` (you'll generate your
   own), and `.next/`. Rename the `package.json` `name` field.

2. **Fill in `site.config.ts`** (`apps/<new-site>/site.config.ts`)
   - `name`, `tagline`, `description`, `domain`, `indexNowKey` — your brand.
   - `topics: TopicSeed[]` — what you discover/curate content for.
   - `creators: CreatorSeed[]` — well-known creators to track by YouTube
     channel ID.
   - `forbiddenContentPatterns`, `highRiskTextPatterns`,
     `highRiskTopicKeywords` — your own regulated-topic keywords. Don't
     just copy menhealth's testosterone/TRT/ED patterns; think about what's
     actually high-risk for *your* vertical.
   - `siteConfig` is validated with `@menhealth/site-kit`'s
     `validateSiteConfig()` at import time — a missing required field fails
     the build immediately instead of shipping silently.

3. **Update `lib/ai/claim-risk.ts`'s `CATEGORY_RISK_FLOOR`** to match your
   own risk tolerance per `ClaimCategory`. This stays outside `site.config.ts`
   because it's keyed to the Prisma schema enum, not generic site data.

4. **Review the AI prompts** in `lib/ai/pipeline.ts`'s caller
   (`packages/core-ai/src/pipeline.ts` takes `siteName` as a parameter, but
   the domain-specific example language — "TRT, hormones, testosterone",
   "men aged 30–55" — is still hardcoded in the prompt text). Same for the
   newsletter digest subject lines/intro copy in
   `lib/newsletter/digest.ts`, and the social post seed templates in
   `lib/social/templates.ts`. These are genuinely editorial content, like
   `lib/seo/topic-content.ts` and `lib/seo/glossary.ts` — rewrite them for
   your topic rather than trying to make them generic.

5. **Rewrite the brand-only components**: `components/ui/BrandLogotype.tsx`,
   `components/ui/SiteHeader.tsx` (nav links/labels), the Tailwind theme
   (`emerald-*` classes throughout — not yet extracted to CSS variables),
   and the legal/editorial pages (`app/(public)/{medical-disclaimer,
   editorial-process, how-we-rate-evidence, ...}/page.tsx`).

6. **Provision infrastructure** — this site gets its own of everything:
   - A new Postgres database (`DATABASE_URL`/`DIRECT_URL`). Run
     `pnpm --filter <new-site> exec prisma migrate dev` to create your own
     migration history from `prisma/schema.prisma` (copy the schema as-is
     to start — the content-agnostic models are the same across sites).
   - A new Vercel project, with **Root Directory** set to
     `apps/<new-site>` in the project settings.
   - Your own `YOUTUBE_API_KEY` (separate quota), `GROQ_API_KEY`/
     `OPENROUTER_API_KEY`/etc., `RESEND_API_KEY` + domain, `STRIPE_*` keys
     and price ID, `X_CLIENT_ID`/`TIKTOK_CLIENT_ID` OAuth apps, `NEXTAUTH_SECRET`,
     `CRON_SECRET`, `ADMIN_EMAILS`. Copy `.env.example`, fill in your own
     values — nothing is shared at the secret level between sites.
   - An IndexNow key file at `public/<your-key>.txt` matching
     `site.config.ts`'s `indexNowKey`.

7. **Verify**: `pnpm --filter <new-site> run typecheck && pnpm --filter
   <new-site> run lint && pnpm --filter <new-site> run test && pnpm
   --filter <new-site> run build`. Then run the dev server and manually
   check: a topic page and a video page render with the disclaimer
   component, `/admin` is gated correctly, and a HIGH-risk video cannot
   auto-publish.

## What's deliberately not a shared package

- **Database**: each site generates its own Prisma Client from its own
  `DATABASE_URL` — there's no shared `core-db` runtime package, since
  Prisma Client generation is inherently per-app. `prisma/schema.prisma`
  is the copyable pattern, not a compiled dependency.
- **Auth.js config**: `packages/core-auth` provides `createAuthConfig()`/
  `createEdgeAuthConfig()` factories that `apps/<site>/lib/auth/config.ts`
  instantiates with its own `env`/`db` — copy that instantiation file, not
  just the package.
- **`lib/social/templates.ts`, `lib/seo/{topic-content,glossary,topic-faq,
  related-topics}.ts`, the newsletter digest copy, the AI prompt wording**:
  all genuinely editorial content for this topic vertical. Rewriting these
  for a new topic is expected work, not a gap in the extraction.
