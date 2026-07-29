---
name: mhd-review
description: Review the working diff (or a named PR) against MenHealth Digest's own compliance/security checklist — YouTube TOS, health-content disclaimers, secrets handling, affiliate/sponsor disclosure, and, for changes under lib/social/**, app/admin/social/**, or app/api/social/**, the social engine's hard blocks (no auto-posting, no forbidden copy, risk-level gating). Use this instead of a generic review whenever the user asks to review a PR/diff in this repo, or explicitly invokes /mhd-review. Complements (does not replace) the general-purpose /code-review skill.
---

# MenHealth Digest compliance review

This mirrors `.github/instructions/code-reviewer.instructions.md` and, where relevant,
`.github/instructions/social-code-reviewer.instructions.md` — re-read those files if this
checklist and the diff disagree, they are the source of truth.

## Steps

1. Determine the diff to review: `git diff main...HEAD` (or whatever the user specifies — a
   PR number, a branch, or "staged changes").
2. Check which paths are touched. If any of `lib/social/**`, `app/admin/social/**`,
   `app/api/social/**`, or `__tests__/social*` changed, apply the **Social engine hard
   blocks** section below in addition to the core checklist. Otherwise skip that section.
3. Work through the checklist, citing `file:line` for every finding.
4. Report using the **Output format** below. Don't skip a section — write "None" if a
   section has nothing to report.

## Core checklist

**YouTube compliance**
- Only official YouTube embeds are used — no download, proxy, or restream of video content.
- Embeds preserve YouTube controls/branding and link back to YouTube.
- Only allowed metadata is stored (no video content itself).

**Health content compliance**
- A health disclaimer is visible on every video page and topic page touched by the diff.
- AI output is presented as editorial content, never as medical advice.
- High-risk claims (TRT/testosterone, medications, mental health, cancer, supplements, ED)
  are flagged for admin review and cannot reach `PUBLISHED` status without it.

**Security**
- No server-side API key or secret is reachable from a Client Component or the client bundle.
- Env vars are read through `env.ts` (Zod-validated), never raw `process.env` in app code.
- External API responses (YouTube, AI providers, Stripe, etc.) are Zod-validated before use.
- Cron and admin routes check the `x-cron-secret` header / session, respectively.
- No secrets or PII in logs.
- User-supplied data is validated/sanitized before it reaches the database.

**Affiliate / sponsor**
- Affiliate links render the `AffiliateDisclosure` component.
- Sponsor placements follow FTC disclosure conventions.

**Code quality**
- No silent `catch` blocks — errors are handled explicitly.
- No obvious N+1 query patterns.
- The diff is small enough to review (rough guide: <400 lines changed).
- New business logic (scoring, parsing, AI-output validation) has tests.

## Social engine hard blocks (only if social paths changed)

Reject immediately if any of these are present:

- A health claim can be published without human approval on any code path.
- Third-party YouTube footage is downloaded, re-encoded, rehosted, or republished.
- A platform API key or OAuth token is reachable from client code or written to a log.
- Any form of Reddit auto-posting.
- Automatic comments or DMs on any platform.
- Fear-based or personal-condition copy generated without going through the forbidden-pattern
  filter in `lib/social/platform-rules.ts` (e.g. "fix your testosterone", "this cures",
  "doctors don't want you to know", "guaranteed").
- A `SocialPost` created without a `utmUrl`.
- A publish attempt (success or failure) not logged to `SocialPublishAttempt`.
- A `riskLevel === "HIGH"` post approvable via bulk action or without explicit single-post
  confirmation.
- A new env var read directly from `process.env` instead of through `env.ts`.
- `PostStatus.SCHEDULED` or `PUBLISHED` reachable without first passing through `APPROVED`.

## Output format

1. **Summary** — what the diff does.
2. **Hard blocks** — only if social paths changed; must-fix, references the list above.
3. **Blocking issues** — must fix before merge.
4. **Non-blocking suggestions**.
5. **Security concerns**.
6. **Compliance concerns** — YouTube / health-content / affiliate.
7. **Test gaps**.
8. **Recommendation:** approve / request changes.
