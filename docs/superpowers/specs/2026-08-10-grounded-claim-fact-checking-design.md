# Grounded fact-checking for LOW/MEDIUM claims

Scope: `packages/core-ai` (new Gemini-grounded call path), and both
`apps/menhealth` and `apps/hype-check` (pipeline wiring, claim
extraction/backfill call sites) — the LOW/MEDIUM/HIGH claim-risk pipeline is
structurally identical between the two apps, so this lands in the shared
package and both apps pick it up the same way.

## Problem

Admins see most videos land at `riskLevel: HIGH` and asked why, and whether
the automatic flow could check sources before defaulting there.

Root cause, traced through the pipeline:

- A video's `riskLevel` is the max across all its extracted claims
  ([process-video-pipeline.ts](../../../apps/menhealth/lib/videos/process-video-pipeline.ts#L127-L132)).
- Each claim's risk is
  `max(categoryFloor, LLM's own riskLevel guess, keyword-pattern match)`
  ([claim-risk.ts](../../../packages/core-compliance/src/claim-risk.ts#L49-L59)).
- `CATEGORY_RISK_FLOOR` hardcodes HIGH for 6 of menhealth's 10 claim
  categories (HORMONES, SEXUAL_HEALTH, MENTAL_HEALTH, SUPPLEMENTS,
  MEDICATIONS, CANCER) — a men's-health channel's videos routinely contain at
  least one claim in one of those categories, and because video risk is a
  max, one such claim drags the whole video to HIGH.
- This floor is evidence-blind by design: for any claim that floors to HIGH,
  [process-video-pipeline.ts](../../../apps/menhealth/lib/videos/process-video-pipeline.ts#L101-L104)
  explicitly discards the fact-check verdict
  (`deterministicRisk === "HIGH" ? undefined : extracted.factCheck`), and
  `auto-publish-gate.ts` never lets HIGH auto-publish regardless — "no flag,
  no override, no exceptions." That part is intentional (AGENTS.md's
  non-negotiable admin-approval rule for regulated categories) and this spec
  does **not** change it.
- Separately, and true for every category today: there is no real
  source-checking anywhere in the automated flow. `factCheckClaim` and
  `extractClaims`' inline `factCheck`
  ([pipeline.ts](../../../packages/core-ai/src/pipeline.ts#L356-L359)) are
  explicitly LLM-only guesses from "general consensus" — the comment there
  states the provider chain (Groq/OpenRouter/OpenAI/Gemini fallback) has no
  web-search grounding, so any AI-authored citation would be fabricated.
  Real sources are human-added only, via the claim edit form
  ([app/api/admin/claims/[id]/route.ts](../../../apps/menhealth/app/api/admin/claims/%5Bid%5D/route.ts)).

So "always HIGH" is two compliance features working as designed, not a bug.
What's actually fixable: LOW/MEDIUM claims' `evidenceStatus` — which does
feed the auto-publish gate — is currently based on an unsourced LLM opinion
with no real grounding behind it.

## Goal

- LOW/MEDIUM claims get a real, search-grounded fact-check verdict instead
  of an unsourced LLM guess, with actual citation URLs persisted as
  `EvidenceSource` rows.
- No change to which categories floor to HIGH, and no change to the
  HIGH-claims-never-auto-publish rule — grounding only ever informs
  LOW/MEDIUM claims, never lets a claim escape the HIGH floor.
- If grounding is unavailable (no `GEMINI_API_KEY`, or the Gemini call
  fails), behavior falls back to exactly what happens today — the existing
  ungrounded verdict — so this never reduces throughput below current
  behavior.

## Non-goals

- No change to `CATEGORY_RISK_FLOOR`, `classifyDeterministicRisk`, or
  `auto-publish-gate.ts` — this spec only changes where a LOW/MEDIUM claim's
  `evidenceStatus`/`sources` come from, not the risk-classification or
  gating logic itself.
- No grounded fact-checking for HIGH-floor claims. They're admin-only
  regardless of evidence quality, so grounding them would spend a real
  search call for no behavioral effect.
- No new admin UI. The claim detail page already renders `claim.sources`
  ([app/admin/(protected)/claims/[id]/page.tsx](<../../../apps/menhealth/app/admin/(protected)/claims/%5Bid%5D/page.tsx>)),
  so AI-found citations appear there automatically, alongside any
  human-added ones, with no new component.
- No change to the generic provider-fallback chain in `client.ts`
  (`anthropic.messages.create()`). Grounding is a dedicated, Gemini-only
  method that requires `geminiApiKey` directly — it does not participate in
  the Groq→OpenRouter→OpenAI→Gemini fallback used by every other call.

## Design

### 1. `packages/core-ai/src/client.ts`

New `callGeminiGrounded(text: string, category: string, apiKey: string)`
alongside the existing `callGemini()`. Calls
`generativelanguage.googleapis.com/v1/models/{GEMINI_MODEL}:generateContent`
with `tools: [{ google_search: {} }]` added to the request body. Parses the
response's `candidates[0].groundingMetadata.groundingChunks` (each a
`{ web: { uri, title } }`) into a plain array alongside the answer text,
returning `{ text, citations: Array<{ title: string; url: string }> }`.

Exposed on `AiClient` as a new optional method, `groundedFactCheck`, present
only when `config.geminiApiKey` is set:

```ts
export type AiClient = {
  anthropic: { messages: { create(...): Promise<...> } };
  defaultModel: string;
  /** Only present when geminiApiKey is configured. */
  groundedFactCheck?: (prompt: string) => Promise<{
    text: string;
    citations: Array<{ title: string; url: string }>;
  }>;
};
```

Callers check for its presence rather than catching a thrown error for the
"not configured" case — matches the existing `config.groqApiKey ? ... :`
pattern already used for every other provider branch in this file.

### 2. `packages/core-ai/src/pipeline.ts`

New exported `groundedFactCheckClaim(input: FactCheckClaimInput): Promise<Result<GroundedFactCheckResult>>`:

```ts
export type GroundedFactCheckResult = FactCheckResult & {
  sources: Array<{
    title: string;
    url: string;
    source: string; // domain, derived from the citation URL
    year?: number;
    summary?: string;
  }>;
};
```

Same prompt intent as today's `factCheckClaim` (evaluate the claim, return
`evidenceStatus` + `rationale`), but built for `client.groundedFactCheck`
instead of `client.anthropic.messages.create`, and drops the existing
"Do not include citations or source URLs" instruction — grounded citations
are exactly what we want back now. If `client.groundedFactCheck` is
undefined (no Gemini key configured), returns `{ ok: false, error: new
Error("Gemini grounding not configured") }` immediately, no network call.

`source` (the domain string on `EvidenceSource`) is derived from each
citation's URL via `new URL(url).hostname`. `year`/`summary` are left
undefined — grounding chunks don't reliably include either, and the schema
already treats both as optional.

### 3. Each app's `lib/ai/pipeline.ts`

Re-export `groundedFactCheckClaim`, same one-line pattern as the other four
pipeline functions already there.

### 4. `apps/*/lib/videos/process-video-pipeline.ts`

Inside the per-claim loop, after `classifyDeterministicRisk` runs, the
existing line `const factCheck = deterministicRisk === "HIGH" ? undefined :
extracted.factCheck;` is replaced with:

```ts
let factCheck: FactCheckResult | undefined;
let groundedSources: GroundedFactCheckResult["sources"] = [];

if (deterministicRisk !== "HIGH") {
  factCheck = extracted.factCheck; // today's fallback, pre-assigned
  const grounded = await groundedFactCheckClaim({
    text: extracted.text,
    category,
  });
  if (grounded.ok) {
    factCheck = grounded.value;
    groundedSources = grounded.value.sources;
  }
  // else: factCheck stays extracted.factCheck — today's behavior, unchanged.
}
// HIGH: factCheck stays undefined, exactly as today.
```

After `db.claim.create(...)` for that claim, if `groundedSources.length > 0`,
bulk-create them via `db.evidenceSource.createMany({ data: groundedSources.map(s => ({ ...s, claimId: created.id })) })`.

### 5. `apps/*/app/api/admin/claims/backfill-auto-review/route.ts`

Same swap: `factCheckClaim` → `groundedFactCheckClaim`, called only for
claims where `deterministicRisk !== "HIGH"` (already the existing branch
structure — `skippedHighRisk++; continue;` happens before any fact-check
call today). On success, also create `EvidenceSource` rows for
`grounded.value.sources`, same as the pipeline. On failure, current
behavior is preserved: this route already treats a failed `factCheckClaim`
as `failed++`; the grounded call failing (e.g. no key) falls into the same
`!result.ok` branch and counts as `failed` rather than silently downgrading
to an ungrounded guess — this route runs as an explicit admin-triggered
batch action rather than the always-on extraction path, so surfacing the
failure count (so an admin notices grounding isn't configured) is more
useful here than a silent fallback would be.

## Error handling

- `groundedFactCheck` unset (no `GEMINI_API_KEY`) → `groundedFactCheckClaim`
  returns `{ ok: false }` without a network call.
- Gemini HTTP error / timeout → same `describeFailure`-style error wrapping
  already used for every other provider branch in `client.ts`, surfaced as
  `{ ok: false, error }`.
- Malformed/absent `groundingMetadata` on an otherwise-200 response →
  `citations: []`, verdict still returned — a grounded verdict with zero
  parseable citations is still used (`sources` ends up empty, no
  `EvidenceSource` rows created), not treated as a failure.
- In `process-video-pipeline.ts`: any `groundedFactCheckClaim` failure falls
  back to `extracted.factCheck` (today's behavior) — extraction never fails
  or stalls because grounding had a bad day.
- In `backfill-auto-review/route.ts`: a `groundedFactCheckClaim` failure
  counts toward `failed` in the response, same as a `factCheckClaim` failure
  does today — no silent fallback in this route (see §5 above).

## Testing

- Unit tests for `callGeminiGrounded`'s response parsing: response with
  grounding chunks, response with none, malformed/missing
  `groundingMetadata`.
- Unit tests for `groundedFactCheckClaim`: success with citations, success
  with zero citations, `groundedFactCheck` unset (immediate `ok: false`, no
  fetch called).
- Unit test for `process-video-pipeline.ts`'s fallback branch: grounded call
  fails → claim still gets `extracted.factCheck`'s verdict, no
  `EvidenceSource` rows created, no exception thrown.
- Unit test for `backfill-auto-review/route.ts`: grounded call fails for a
  LOW/MEDIUM claim → counted in `failed`, claim's `evidenceStatus` left
  `NOT_CHECKED` (unchanged from before the call).

## Compliance notes

- `CATEGORY_RISK_FLOOR` and `auto-publish-gate.ts` are untouched — HIGH-risk
  categories (TRT/hormones, medications, supplements, cancer, mental health,
  ED) still require admin approval before publishing, unconditionally. This
  spec cannot and does not create a path for AI-sourced citations to lower a
  claim off the HIGH floor.
- Grounded citations are real search results (Gemini's `google_search` tool
  returns actual indexed URLs), not AI-fabricated — this directly resolves
  the fabrication concern that `pipeline.ts`'s existing comment cites for why
  citations were disabled in the first place.
- No health/claim content publishes automatically as a result of this
  change — grounding only feeds `evidenceStatus`, one input the existing
  auto-publish gate already required alongside `autoReviewed` /
  `humanConfirmedAt`; MEDIUM-risk claims still require a human one-click
  confirm regardless of how well-sourced the grounded verdict is.
