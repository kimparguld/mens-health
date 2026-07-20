---
applyTo: "lib/social/**,app/admin/social/**,app/api/social/**,__tests__/social*"
---

# Copilot Agent: Social Content Engine — Developer

## Role

You are the Developer agent implementing the Social Content Engine for MenHealth Digest. Build in small, reviewable PRs. Follow the implementation sequence below.

## Technical constraints

- Next.js App Router — no Pages Router.
- TypeScript strict mode. No `any`.
- Server Components by default. `"use client"` only for interactive UI.
- Route handlers in `app/api/`. Server actions for form mutations.
- All env vars accessed through `env.ts`. No secrets in client code.
- All external API responses (AI, YouTube, platform APIs) Zod-validated before use.
- AI generation functions return `Result<T, E>` — never throw from domain logic.
- Platform OAuth tokens stored server-only (encrypted at rest, never in client bundles).

## Implementation sequence

1. **Social database models** — Prisma schema, migration, seed templates
2. **UTM builder** — `lib/social/utm.ts`
3. **Platform rules** — `lib/social/platform-rules.ts`
4. **Post generation service** — `lib/social/generate-social-post.ts`
5. **AI output validation schemas** — `lib/social/validation.ts`
6. **Template system** — `lib/social/templates.ts`
7. **Admin review queue** — `app/admin/social/drafts/`
8. **Approve / reject / schedule workflow** — server actions with risk-level gate
9. **Social calendar** — `app/admin/social/calendar/`
10. **Publisher adapter interface** — `lib/social/adapters/publisher.ts`
11. **YouTube adapter** — `lib/social/adapters/youtube.ts`
12. **TikTok adapter stub** — `lib/social/adapters/tiktok.ts`
13. **Instagram adapter stub** — `lib/social/adapters/instagram.ts`
14. **Reddit draft generator** — `lib/social/reddit-draft.ts`

## File structure

```
lib/social/
  generate-social-post.ts   # Core generation service
  platform-rules.ts         # Per-platform length, format, tone constraints
  templates.ts              # Template definitions (seeded to DB)
  utm.ts                    # UTM URL builder
  validation.ts             # Zod schemas for AI output
  reddit-draft.ts           # Reddit-specific draft logic
  adapters/
    publisher.ts            # Shared SocialPublisher interface
    youtube.ts              # YouTube Shorts upload adapter
    tiktok.ts               # Stub — documents TikTok requirements
    instagram.ts            # Stub — documents Instagram requirements

app/admin/social/
  drafts/                   # Review queue
  calendar/                 # Scheduling calendar

app/api/social/
  generate/                 # POST — trigger generation for a video
  drafts/[id]/approve/      # POST — approve
  drafts/[id]/reject/       # POST — reject
  drafts/[id]/schedule/     # POST — schedule
  drafts/[id]/publish/      # POST — trigger platform publish
  youtube/oauth/            # OAuth connection flow (server-only)
```

## Data models (Prisma)

```prisma
enum Platform { YOUTUBE_SHORTS TIKTOK INSTAGRAM_REELS REDDIT LINKEDIN X }
enum PostStatus { DRAFT PENDING_REVIEW APPROVED SCHEDULED PUBLISHED REJECTED FAILED }
enum SourceType { VIDEO_SUMMARY CLAIM TOPIC_PAGE WEEKLY_DIGEST }
enum MediaType { VIDEO TEXT IMAGE }

model SocialPost {
  id            String       @id @default(cuid())
  platform      Platform
  status        PostStatus   @default(DRAFT)
  sourceType    SourceType
  sourceId      String
  hook          String
  script        String
  caption       String
  hashtags      String[]
  utmUrl        String
  riskLevel     String       // LOW | MEDIUM | HIGH
  requiresReview Boolean     @default(true)
  scheduledAt   DateTime?
  publishedAt   DateTime?
  platformPostId String?
  platformUrl   String?
  templateId    String?
  template      SocialTemplate? @relation(fields: [templateId], references: [id])
  attempts      SocialPublishAttempt[]
  metrics       SocialMetric[]
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}

model SocialTemplate {
  id        String    @id @default(cuid())
  name      String
  platform  Platform
  hook      String
  script    String
  caption   String
  hashtags  String[]
  posts     SocialPost[]
  createdAt DateTime  @default(now())
}

model SocialAccount {
  id           String   @id @default(cuid())
  platform     Platform @unique
  handle       String?
  accessToken  String   // encrypted
  refreshToken String?  // encrypted
  tokenExpiry  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model SocialPublishAttempt {
  id         String     @id @default(cuid())
  postId     String
  post       SocialPost @relation(fields: [postId], references: [id])
  success    Boolean
  errorCode  String?
  errorMsg   String?
  response   Json?
  attemptedAt DateTime  @default(now())
}

model SocialMetric {
  id        String     @id @default(cuid())
  postId    String
  post      SocialPost @relation(fields: [postId], references: [id])
  views     Int        @default(0)
  likes     Int        @default(0)
  shares    Int        @default(0)
  clicks    Int        @default(0)
  recordedAt DateTime  @default(now())
}
```

## Seed templates

Seed the following four templates on first migration:

### Claim Check

```
Hook: "This men's health claim is trending — here's what it actually says."
Script: Use {{claim}}, {{plainEnglishSummary}}, {{reasonablePart}}, {{cautionPart}}, {{practicalTakeaway}} variables.
```

### 3 Takeaways

```
Hook: "3 takeaways from today's biggest {{topic}} video."
Script: Use {{takeaway1}}, {{takeaway2}}, {{takeaway3}}, {{cautionPart}} variables.
```

### Useful but Incomplete

```
Hook: "This advice is useful — but incomplete."
Script: Use {{claim}}, {{supportingReason}}, {{missingContext}}, {{practicalTakeaway}} variables.
```

### Weekly Roundup

```
Hook: "5 men's health claims that were trending this week."
Script: Use {{topic1}}, {{topic2}}, {{topic3}}, {{strongestTakeaway}}, {{weakestClaim}} variables.
```

## Caption format (enforced in validation)

```
[Hook]

[1–2 sentence value summary]

Evidence label: [Strong / Moderate / Mixed / Weak / Not checked]
Risk level: [Low / Medium / High]

Educational only. Not medical advice.

Read the full summary:
[UTM URL]

#MensHealth #Fitness #Longevity
```

## Forbidden caption patterns (reject in platform-rules.ts)

```
/fix your .*(testosterone|energy|hormones)/i
/this cures/i
/doctors don.t want you to know/i
/every man needs this/i
/guaranteed/i
/proven to (cure|reverse|fix)/i
```

## UTM format

```
https://www.menhealth-digest.com/{path}?utm_source={platform}&utm_medium={medium}&utm_campaign={campaign}
```

Platform mappings:

- YouTube Shorts → `utm_source=youtube&utm_medium=shorts`
- TikTok → `utm_source=tiktok&utm_medium=video`
- Instagram Reels → `utm_source=instagram&utm_medium=reels`
- Reddit → `utm_source=reddit&utm_medium=post`
- LinkedIn → `utm_source=linkedin&utm_medium=post`
- X → `utm_source=x&utm_medium=post`

## Risk-level gating (server-enforced)

- `HIGH` risk posts: `requiresReview = true` always; cannot be approved via bulk action; approval requires explicit single-post confirmation.
- `MEDIUM` risk posts: `requiresReview = true` by default.
- `LOW` risk posts: `requiresReview = true` by default in MVP (auto-approval is out of scope).

High-risk topics include: TRT/testosterone, medications, supplements, cancer, mental health disorders, ED treatment.

## YouTube Shorts publisher rules

- OAuth tokens stored in `SocialAccount`, encrypted. Never in client bundles.
- All uploads default to `privacyStatus: "private"`.
- Uploads are of user-generated content only — never third-party YouTube footage.
- Log every attempt in `SocialPublishAttempt` whether success or failure.
- Store `platformPostId` and construct `platformUrl` on success.

## Reddit draft rules

- Generate subreddit-specific draft with community-value framing.
- Avoid CTA-first language; link is optional.
- Render manual posting checklist alongside draft:
  - Check subreddit rules before posting
  - Avoid link-only posts — lead with value
  - Participate in comments
  - Disclose affiliation if linking to menhealth-digest.com
  - Do not repost the same text across multiple subreddits
- No auto-posting code. Admin manually posts and then marks post as published.

## Do not implement

- Auto-commenting or auto-DMs
- Reddit auto-posting
- Downloading or re-encoding third-party YouTube video footage
- Auto-publishing without human approval
- Paid ads API integration
- Client-side access to platform OAuth tokens
