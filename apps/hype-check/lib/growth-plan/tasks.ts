import type { GrowthPhase, GrowthTaskPriority } from "@prisma/client";

export type SeedTask = {
  uniqueKey: string;
  phase: GrowthPhase;
  sortOrder: number;
  dayStart: number;
  dayEnd: number;
  title: string;
  description: string;
  adminPath: string | null;
  priority: GrowthTaskPriority;
};

/**
 * All known admin routes in app/admin/(protected).
 * When adding a new admin page, add its path here so the validator can check
 * adminPath values in GROWTH_PLAN_TASKS.
 */
export const KNOWN_ADMIN_ROUTES = new Set([
  "/admin",
  "/admin/videos",
  "/admin/claims",
  "/admin/topics",
  "/admin/jobs",
  "/admin/subscribers",
  "/admin/social/drafts",
  "/admin/social/calendar",
  "/admin/social/accounts",
  "/admin/growth",
  "/admin/content-calendar",
  "/admin/outreach",
  "/admin/marketing/utm-builder",
  "/admin/marketing/campaigns",
  "/admin/analytics/growth",
  "/admin/growth-plan",
  "/admin/weekly-growth",
  "/admin/monetization",
]);

/**
 * Returns true when the given adminPath is a known admin route.
 * Paths starting with "/" that are NOT in KNOWN_ADMIN_ROUTES are broken links.
 */
export function isAdminPathValid(adminPath: string | null): boolean {
  if (adminPath === null) return true; // null means "no admin link"
  if (adminPath === "/") return true; // homepage
  return KNOWN_ADMIN_ROUTES.has(adminPath);
}

export const GROWTH_PLAN_TASKS: SeedTask[] = [
  // ---- Phase 1: Foundation (Day 1–14) ----
  {
    uniqueKey: "foundation-gsc",
    phase: "FOUNDATION",
    sortOrder: 1,
    dayStart: 1,
    dayEnd: 14,
    title: "Set up Google Search Console",
    description:
      "Add the site to Google Search Console and submit the sitemap so Google starts indexing pages.",
    adminPath: null,
    priority: "HIGH",
  },
  {
    uniqueKey: "foundation-analytics",
    phase: "FOUNDATION",
    sortOrder: 2,
    dayStart: 1,
    dayEnd: 14,
    title: "Set up analytics",
    description:
      "Install an analytics provider (e.g. Plausible or Vercel Analytics) to track traffic from day one.",
    adminPath: null,
    priority: "HIGH",
  },
  {
    uniqueKey: "foundation-newsletter-landing",
    phase: "FOUNDATION",
    sortOrder: 3,
    dayStart: 1,
    dayEnd: 14,
    title: "Newsletter landing page live",
    description:
      "Publish the /newsletter page and confirm the signup form works end-to-end.",
    adminPath: "/admin/subscribers",
    priority: "HIGH",
  },
  {
    uniqueKey: "foundation-homepage-cta",
    phase: "FOUNDATION",
    sortOrder: 4,
    dayStart: 1,
    dayEnd: 14,
    title: "Homepage CTA improved",
    description:
      "Improve the homepage so new visitors immediately understand what the site does. Add hero copy, newsletter CTA above the fold, topic navigation, and a short how-it-works section.",
    adminPath: "/",
    priority: "HIGH",
  },
  {
    uniqueKey: "foundation-evidence-page",
    phase: "FOUNDATION",
    sortOrder: 5,
    dayStart: 1,
    dayEnd: 14,
    title: "How we rate evidence page complete",
    description:
      "Publish /how-we-rate-evidence explaining the evidence rating methodology.",
    adminPath: null,
    priority: "MEDIUM",
  },
  {
    uniqueKey: "foundation-editorial-page",
    phase: "FOUNDATION",
    sortOrder: 6,
    dayStart: 1,
    dayEnd: 14,
    title: "Editorial process page complete",
    description:
      "Publish /editorial-process explaining how videos are selected and summarised.",
    adminPath: null,
    priority: "MEDIUM",
  },
  {
    uniqueKey: "foundation-disclaimer-page",
    phase: "FOUNDATION",
    sortOrder: 7,
    dayStart: 1,
    dayEnd: 14,
    title: "Disclaimer page complete",
    description:
      "Ensure /disclaimer is live and linked from all video and topic pages.",
    adminPath: null,
    priority: "HIGH",
  },
  {
    uniqueKey: "foundation-affiliate-page",
    phase: "FOUNDATION",
    sortOrder: 8,
    dayStart: 1,
    dayEnd: 14,
    title: "Affiliate disclosure page complete",
    description:
      "Ensure /affiliate-disclosure is live and the AffiliateDisclosure component is used wherever needed.",
    adminPath: null,
    priority: "MEDIUM",
  },
  {
    uniqueKey: "foundation-topic-hubs",
    phase: "FOUNDATION",
    sortOrder: 9,
    dayStart: 1,
    dayEnd: 14,
    title: "10 topic hubs published",
    description:
      "Publish topic hub pages for: Testosterone, Sleep, Fitness over 40, Nutrition, Longevity, Supplements, Mental health, Hair loss, Weight loss, Muscle gain.",
    adminPath: "/admin/topics",
    priority: "HIGH",
  },
  {
    uniqueKey: "foundation-claim-pages",
    phase: "FOUNDATION",
    sortOrder: 10,
    dayStart: 1,
    dayEnd: 14,
    title: "20 claim pages published",
    description:
      "Publish 20 search-friendly claim pages targeting common men's health questions (e.g. 'Does ashwagandha increase testosterone?').",
    adminPath: "/admin/claims",
    priority: "HIGH",
  },

  // ---- Phase 2: Distribution (Day 15–30) ----
  {
    uniqueKey: "distribution-claim-pages",
    phase: "DISTRIBUTION",
    sortOrder: 1,
    dayStart: 15,
    dayEnd: 30,
    title: "5 claim pages per week",
    description:
      "Publish at least 5 new claim pages each week throughout this phase.",
    adminPath: "/admin/claims",
    priority: "HIGH",
  },
  {
    uniqueKey: "distribution-video-summaries",
    phase: "DISTRIBUTION",
    sortOrder: 2,
    dayStart: 15,
    dayEnd: 30,
    title: "10 video summaries per week",
    description:
      "Review and publish at least 10 AI-processed video summaries each week.",
    adminPath: "/admin/videos",
    priority: "HIGH",
  },
  {
    uniqueKey: "distribution-social-posts",
    phase: "DISTRIBUTION",
    sortOrder: 3,
    dayStart: 15,
    dayEnd: 30,
    title: "3 short-form social posts per week",
    description:
      "Approve and schedule at least 3 social posts per week from the social drafts queue.",
    adminPath: "/admin/social/drafts",
    priority: "MEDIUM",
  },
  {
    uniqueKey: "distribution-newsletter",
    phase: "DISTRIBUTION",
    sortOrder: 4,
    dayStart: 15,
    dayEnd: 30,
    title: "1 newsletter per week",
    description:
      "Send one weekly digest email to subscribers. Use the digest job to generate it.",
    adminPath: "/admin/jobs",
    priority: "HIGH",
  },
  {
    uniqueKey: "distribution-community",
    phase: "DISTRIBUTION",
    sortOrder: 5,
    dayStart: 15,
    dayEnd: 30,
    title: "3 community posts per week",
    description:
      "Post 3 value-add comments or posts per week on Reddit or other communities (no spam, no direct promotion).",
    adminPath: "/admin/social/drafts",
    priority: "MEDIUM",
  },
  {
    uniqueKey: "distribution-outreach",
    phase: "DISTRIBUTION",
    sortOrder: 6,
    dayStart: 15,
    dayEnd: 30,
    title: "5 creator outreach emails per week",
    description:
      "Send 5 personalised outreach emails per week to YouTube creators whose content has been summarised.",
    adminPath: "/admin/outreach",
    priority: "MEDIUM",
  },

  // ---- Phase 3: Optimisation (Day 31–60) ----
  {
    uniqueKey: "optimisation-top-pages",
    phase: "OPTIMISATION",
    sortOrder: 1,
    dayStart: 31,
    dayEnd: 60,
    title: "Identify top pages by impressions",
    description:
      "Review Google Search Console impressions to find which pages have the most organic potential.",
    adminPath: null,
    priority: "HIGH",
  },
  {
    uniqueKey: "optimisation-meta",
    phase: "OPTIMISATION",
    sortOrder: 2,
    dayStart: 31,
    dayEnd: 60,
    title: "Improve titles and meta descriptions on top pages",
    description:
      "Update titles and meta descriptions on the top 10 pages by impressions to improve CTR.",
    adminPath: "/admin/videos",
    priority: "HIGH",
  },
  {
    uniqueKey: "optimisation-winning-topics",
    phase: "OPTIMISATION",
    sortOrder: 3,
    dayStart: 31,
    dayEnd: 60,
    title: "Create more pages around winning topics",
    description:
      "Identify the 3 best-performing topic hubs and create 5+ additional claim pages for each.",
    adminPath: "/admin/topics",
    priority: "HIGH",
  },
  {
    uniqueKey: "optimisation-paid-ads",
    phase: "OPTIMISATION",
    sortOrder: 4,
    dayStart: 31,
    dayEnd: 60,
    title: "Start small paid ad tests",
    description:
      "Run a low-budget test (£50–100) on Reddit or Google to a high-converting landing page.",
    adminPath: "/admin/marketing/campaigns",
    priority: "LOW",
  },
  {
    uniqueKey: "optimisation-lead-magnet",
    phase: "OPTIMISATION",
    sortOrder: 5,
    dayStart: 31,
    dayEnd: 60,
    title: "Create one lead magnet",
    description:
      "Create a downloadable PDF or checklist (e.g. 'The Men's Health Evidence Checklist') to boost newsletter conversions.",
    adminPath: null,
    priority: "MEDIUM",
  },
  {
    uniqueKey: "optimisation-newsletter-cta",
    phase: "OPTIMISATION",
    sortOrder: 6,
    dayStart: 31,
    dayEnd: 60,
    title: "Add newsletter CTA to all public pages",
    description:
      "Ensure the NewsletterInlineCTA or NewsletterFooterCTA component appears on every video, topic, and claim page.",
    adminPath: null,
    priority: "MEDIUM",
  },

  // ---- Phase 4: Scale (Day 61–90) ----
  {
    uniqueKey: "scale-content-velocity",
    phase: "SCALE",
    sortOrder: 1,
    dayStart: 61,
    dayEnd: 90,
    title: "Increase content velocity around best-performing topics",
    description:
      "Double down on the 3 topic hubs with the most traffic. Publish at least 10 claim pages per week.",
    adminPath: "/admin/topics",
    priority: "HIGH",
  },
  {
    uniqueKey: "scale-trend-report",
    phase: "SCALE",
    sortOrder: 2,
    dayStart: 61,
    dayEnd: 90,
    title: "Create weekly trend report",
    description:
      "Publish a weekly trend report (e.g. /weekly) summarising the top trending men's health topics.",
    adminPath: "/admin/weekly-growth",
    priority: "HIGH",
  },
  {
    uniqueKey: "scale-sponsors",
    phase: "SCALE",
    sortOrder: 3,
    dayStart: 61,
    dayEnd: 90,
    title: "Pitch newsletter sponsors",
    description:
      "Reach out to 5 relevant brands about newsletter sponsorship. Use the outreach CRM to track.",
    adminPath: "/admin/outreach",
    priority: "HIGH",
  },
  {
    uniqueKey: "scale-creator-relationships",
    phase: "SCALE",
    sortOrder: 4,
    dayStart: 61,
    dayEnd: 90,
    title: "Build creator relationships",
    description:
      "Follow up with creators who engaged with outreach. Aim for 3 active collaborations.",
    adminPath: "/admin/outreach",
    priority: "MEDIUM",
  },
  {
    uniqueKey: "scale-ads",
    phase: "SCALE",
    sortOrder: 5,
    dayStart: 61,
    dayEnd: 90,
    title: "Test Reddit or Google ads",
    description:
      "Scale the best-performing ad test from Phase 3. Measure cost-per-subscriber.",
    adminPath: "/admin/marketing/campaigns",
    priority: "MEDIUM",
  },
  {
    uniqueKey: "scale-premium-waitlist",
    phase: "SCALE",
    sortOrder: 6,
    dayStart: 61,
    dayEnd: 90,
    title: "Create premium waitlist",
    description:
      "Set up a premium waitlist page (/upgrade) and collect interest before launch.",
    adminPath: "/upgrade",
    priority: "LOW",
  },
];
