---
name: social-publish-preflight
description: Use when an admin is about to click Publish/Schedule on a live X or TikTok social draft, or asks for a final check before a social post goes out — verifies OAuth connection, risk-category match, disclosure copy, and UTM link before content actually reaches the platform.
disable-model-invocation: true
---

# Social publish preflight

Clicking Publish on a TikTok/X draft actually posts — per AGENTS.md, "X and TikTok publishing are real and automated." This is the last human checkpoint before that happens. It doesn't replace `/mhd-review`, and the platform adapter's own `validate()` call still runs — this catches things that check misses because they're semantic, not format-level.

## When to use
Right before approving/publishing a draft in `/admin/social/drafts/[id]`, or when asked "is this draft safe to publish."

## Checklist

1. **Platform account connected & fresh.** Check `/admin/social/accounts` (or the `SocialAccount` row) shows a connected account for the platform. If the token is expired with no refresh token, publish throws at request time (`packages/core-social/src/adapters/refresh-token.ts`) — don't let the admin discover that mid-click.
2. **Risk category matches risk level.** Cross-check the post's `ClaimCategory` against `CATEGORY_RISK_FLOOR` in `lib/ai/claim-risk.ts` (HORMONES, SEXUAL_HEALTH, MENTAL_HEALTH, SUPPLEMENTS, MEDICATIONS, CANCER = HIGH). If `riskLevel !== 'HIGH'` but the topic is visibly one of those categories, stop — this is exactly the drift `CATEGORY_RISK_FLOOR` exists to prevent.
3. **HIGH-risk posts got individual review.** `requiresReview && riskLevel === 'HIGH'` blocks bulk approval in the UI (`DraftActions.tsx`) — confirm this specific draft was opened and read, not rubber-stamped as part of a batch.
4. **Caption carries the disclaimer.** `SocialPostAiOutputSchema.caption` is supposed to include "evidence label, disclaimer, and UTM link placeholder" — read the actual caption text and confirm the disclaimer language is really there, not just implied by the prompt.
5. **UTM link is real, not a placeholder.** Confirm the link was built via `buildUtmUrl()` (`packages/core-social/src/utm.ts`) with the real destination path and a non-empty `campaign` — not a leftover `{{link}}` token.
6. **TikTok: video is actually ready.** "Publish to TikTok" only activates when `videoStatus === 'READY'` and `videoUrl` is set (`DraftActions.tsx`'s `canPublishToTikTok`) — if it's grayed out, the fix is "generate the video," not forcing a publish.
7. **This is an explicit admin action.** Confirm nothing is auto-triggering this beyond what's already approved — AGENTS.md requires publish to be "an explicit admin action (a click, or a scheduled post the admin already approved), never a fully unattended pipeline."

## If anything fails
Don't publish. Reject the draft, or send it back to `PENDING_REVIEW` / fix the caption, then re-run this checklist.
