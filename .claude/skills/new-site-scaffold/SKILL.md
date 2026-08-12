---
name: new-site-scaffold
description: Use when standing up a new topic vertical (a third apps/<site> alongside apps/menhealth and apps/hype-check), or when asked how to add a new site to this monorepo.
---

# New site scaffold

Wraps `docs/adding-a-new-site.md` — the authoritative shared-vs-yours checklist — into a repeatable procedure. Read that doc in full before starting; this skill is the execution wrapper, not a replacement, and calls out the steps that are easy to miss.

## Procedure

1. Read `docs/adding-a-new-site.md` fully, then create a TodoWrite item for each of its 7 numbered steps (scaffold app, fill `site.config.ts`, update `CATEGORY_RISK_FLOOR`, rewrite editorial content, rewrite brand components, provision infrastructure, verify).
2. Ask the user for the new site's name/domain/topic vertical before scaffolding — don't guess the niche.
3. `cp -r apps/menhealth apps/<new-site>` as the doc specifies, then immediately delete: `public/` favicons/OG images, `prisma/migrations/`, `.next/`. Rename `package.json`'s `name` field.
4. Work through `site.config.ts` next — it's validated by `@menhealth/site-kit`'s `validateSiteConfig()` at import time, so a missing field fails the build fast. Don't copy menhealth's `highRiskTextPatterns`/`highRiskTopicKeywords` verbatim — they're specific to TRT/testosterone/ED and need to be re-derived for the new vertical's actual regulated topics.
5. **Easy to miss**: `CATEGORY_RISK_FLOOR` lives in `lib/ai/claim-risk.ts`, a separate file from `site.config.ts` (it's keyed to the Prisma `ClaimCategory` enum, not generic site data) — don't assume filling in `site.config.ts` alone covers compliance.
6. **Easy to miss**: the IndexNow key file at `public/<key>.txt` must match `site.config.ts`'s `indexNowKey` exactly, or IndexNow submission silently fails.
7. Editorial content (`lib/social/templates.ts`, `lib/seo/{topic-content,glossary,topic-faq,related-topics}.ts`, newsletter digest copy, and the AI prompt wording in the caller of `packages/core-ai/src/pipeline.ts`) is genuinely new writing for this vertical, not extraction — budget real time for it rather than treating it as search-and-replace.
8. Infrastructure is 100% per-site: new Postgres DB, new Vercel project (Root Directory = `apps/<new-site>`), separate API keys for everything (YouTube, AI providers, Resend, Stripe, X/TikTok OAuth apps), own `NEXTAUTH_SECRET`/`CRON_SECRET`/`ADMIN_EMAILS`. Nothing is shared at the secret level between sites.
9. Run the doc's verification gate exactly: `pnpm --filter <new-site> run typecheck && lint && test && build`, then manually confirm in the dev server: a topic page and a video page render the disclaimer component, `/admin` is session-gated, and a HIGH-risk video cannot auto-publish.

## Common mistakes
- Treating `packages/core-social`'s adapters as a complete social setup — the new site still needs its own OAuth apps and `SocialAccount` connections; nothing carries over from menhealth/hype-check.
- Forgetting `CATEGORY_RISK_FLOOR` (step 5) and shipping a site where a HIGH-risk category silently classifies as LOW.
- Skipping the manual runtime check in step 9 — typecheck/lint/test passing doesn't prove the disclaimer renders or the admin gate actually works.
