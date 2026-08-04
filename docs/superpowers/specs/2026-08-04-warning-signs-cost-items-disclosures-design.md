# Populate & surface WarningSign, CostItem, Disclosure

## Problem

The `hype-check` video page redesign (see `2026-08-04-hype-check-video-page-redesign-design.md`) found that `WarningSign`, `CostItem`, and `Disclosure` are fetched by `getVideoBySlug` (`lib/db/queries.ts:72-77`) but have no writer anywhere in the codebase — no admin form, no job. They are permanently empty, and no public UI renders them. That change left a code comment noting the gap and deferred it as a follow-up.

This spec closes the gap: these records get populated automatically by AI as part of the existing video-processing pipeline (the same pattern `Claim` and `Summary` already use), stay reviewable/editable in admin, and are rendered on the public video page.

## Scope

- New site-local AI extraction step, wired into the existing summary/claims pipeline, so every newly processed video gets warning signs, cost items, and disclosures generated automatically — no per-video manual admin entry required.
- A `HIGH`-severity warning sign escalates the subject's risk level exactly like a `HIGH`-risk claim does today, so the existing publish gate (`isEligibleForAutoPublish`) keeps such subjects in `REVIEW` until an admin approves. This is what satisfies this repo's non-negotiable rule that AI output never auto-publishes high-risk health content.
- Admin CRUD (edit/delete/add) for all three record types on the existing admin video detail page, plus a manual "Generate" button so admins can backfill already-published videos on demand.
- Public rendering of all three on `app/(public)/videos/[slug]/page.tsx`, using the token system and stamp components (`RiskStamp`, verdict tokens) introduced in the redesign that just shipped.
- Deletion of the now-resolved gap comment at `lib/db/queries.ts:72-74`.
- Out of scope: `SourceVideo.disclosuresDetected` (a separate, also-currently-unwritten boolean) is not touched by this change. `packages/core-ai` (shared across sites) is not modified — no other site's schema has these models.

## Design

### 1. AI extraction

New function `extractWarningsCostsDisclosures` in `apps/hype-check/lib/ai/pipeline.ts`, calling the shared `aiClient` (`lib/ai/client.ts`) directly with its own prompt and Zod schema — not routed through `packages/core-ai`'s `createAiPipeline`, since `WarningSign`/`CostItem`/`Disclosure` only exist in this site's Prisma schema.

Input: video title, description, and the just-generated `shortSummary` (already available at the point in the pipeline where this runs, same as `extractClaims` reuses it).

Output schema:

```ts
{
  warningSigns: { text: string; severity: "LOW" | "MEDIUM" | "HIGH" }[];
  costItems: { label: string; amount: string; isHidden: boolean; notes?: string }[];
  disclosures: { text: string; detected: boolean }[];
}
```

`source` on `WarningSign` and `Disclosure` is set to a constant (`"ai-extraction"`) at write time, not requested from the model — this lets the admin UI distinguish AI-sourced rows from hand-edited/added ones later.

One combined AI call for all three lists (not three separate calls) — cheaper and faster than three round-trips, and the three concepts are closely related (all answer "what should a viewer know before spending money or time on this").

### 2. Pipeline integration

`generateSummaryAndClaims` in `lib/videos/process-video-pipeline.ts` calls `extractWarningsCostsDisclosures` after claim extraction, persists the three record sets via `db.warningSign.createMany` / `db.costItem.createMany` / `db.disclosure.createMany`, and folds the highest `WarningSign.severity` into the existing `highestClaimRisk` escalation logic (reusing `RISK_RANK`, never de-escalating). Both call sites — the daily cron (`jobs/process-pending-videos.ts`) and the manual "Generate summary" admin action (`app/api/admin/videos/[id]/summarize/route.ts`) — pick this up automatically since they both go through `generateSummaryAndClaims`.

If extraction fails, it's non-fatal (logged via `console.warn`, same as claim-extraction failures) — a video still gets published/reviewed on the strength of its summary and claims even if this step errors.

### 3. Admin UI

- `app/admin/(protected)/videos/[id]/page.tsx` gains three new sections (warning signs / cost items / disclosures), each a small editable table: inline edit per field, a delete action per row, and an "+ Add" row for manual entries. Lighter-weight than `ClaimEditForm` (no sources sub-editor needed).
- New CRUD routes, mirroring the existing `/api/admin/claims/[id]` pattern:
  - `app/api/admin/warning-signs/route.ts` (`POST` create, scoped to a subject) and `app/api/admin/warning-signs/[id]/route.ts` (`PATCH`/`DELETE`)
  - `app/api/admin/cost-items/route.ts` + `[id]/route.ts`
  - `app/api/admin/disclosures/route.ts` + `[id]/route.ts`
  - All admin-session-gated, same as existing admin routes.
- **Backfill button**: `GenerateWarningsButton.tsx` on the admin video page, same client-component pattern as `GenerateSummaryButton.tsx`, posting to a new `app/api/admin/videos/[id]/extract-warnings/route.ts`. This route only touches the three new tables (doesn't re-run summary/claim generation), so it's safe to run on already-published subjects to backfill existing content on demand.

### 4. Public UI

Three new sections in `app/(public)/videos/[slug]/page.tsx`, each rendered only when its array is non-empty (no empty-state boxes — consistent with how the claims section behaves):

- **Warning signs** — positioned near the existing `Summary.warnings` box (which is untouched); each item shown with `RiskStamp` for its severity.
- **Hidden costs** — a small label/amount list; rows with `isHidden: true` get a `verdict-risky` tint to call them out.
- **Disclosures** — a short list near the existing `AffiliateDisclosure` component.

All three use the theme tokens (`--paper`, `--ink`, `--verdict-*`, etc.) established in the redesign that just shipped — no raw Tailwind colors.

### 5. Query cleanup

The gap comment at `lib/db/queries.ts:72-74` is deleted now that these fields have both a writer and a reader.

## Testing

- Unit tests for `extractWarningsCostsDisclosures`'s Zod schema validation (valid/invalid AI responses).
- Unit test for the risk-escalation logic: a `HIGH`-severity warning sign escalates `subject.riskLevel`, following the existing pattern for claim-driven escalation in `process-video-pipeline.ts`.
- Unit tests for the new admin CRUD routes: auth-gated (403 when not admin), validates input, 404s on missing id — mirrors existing claim-route test coverage if present.
- Manual check: `pnpm --filter hype-check dev`, use the admin "Generate" button against a real video, confirm records appear in admin, edit one, confirm it renders correctly on the public page.
- No destructive schema changes — all three models already exist; this only adds writers and readers.
