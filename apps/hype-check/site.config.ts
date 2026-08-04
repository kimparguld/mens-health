import { env } from "@/env";
import {
  defineSiteConfig,
  validateSiteConfig,
  type SiteConfig,
  type TopicSeed,
  type CreatorSeed,
} from "@menhealth/site-kit";

export type { TopicSeed, CreatorSeed } from "@menhealth/site-kit";

// ---------------------------------------------------------------------------
// Topics this site discovers/curates content for.
// ---------------------------------------------------------------------------

const TOPICS: TopicSeed[] = [
  {
    slug: "ai-tools",
    name: "AI Tools",
    query: "ai tool review is it worth it",
    isHighRisk: false,
    description:
      "AI apps, SaaS tools, and productivity products — reviewed against their marketing claims.",
  },
  {
    slug: "side-hustles",
    name: "Side Hustles",
    query: "side hustle make money online",
    isHighRisk: true,
    description:
      "Income-claim-driven side hustle pitches — dropshipping, print-on-demand, reselling, and more.",
  },
  {
    slug: "online-courses",
    name: "Online Courses",
    query: "online course review guru worth it",
    isHighRisk: true,
    description:
      "Paid courses and coaching programs promising a specific income or outcome.",
  },
  {
    slug: "viral-products",
    name: "Viral Products",
    query: "viral product review tiktok made me buy it",
    isHighRisk: false,
    description:
      "Products going viral on social video — reviewed for whether they do what the ads claim.",
  },
  {
    slug: "marketplaces",
    name: "Marketplaces",
    query: "marketplace app review scam or legit",
    isHighRisk: false,
    description:
      "Buy/sell/resale marketplace apps and their fee structures, seller protections, and payout claims.",
  },
  {
    slug: "investment-apps",
    name: "Investment Apps",
    query: "investment app review guaranteed returns",
    isHighRisk: true,
    description:
      "Trading, investing, and crypto apps — especially ones claiming guaranteed or unusually high returns.",
  },
  {
    slug: "giveaways",
    name: "Giveaways",
    query: "giveaway sweepstakes is it real",
    isHighRisk: true,
    description:
      "Sweepstakes, prize giveaways, and contests — a classic vector for phishing and advance-fee scams.",
  },
  {
    slug: "travel-hacks",
    name: "Travel Hacks",
    query: "travel hack review does it work",
    isHighRisk: false,
    description:
      "Credit-card points strategies, flight deal finders, and other travel-savings claims.",
  },
  {
    slug: "remote-jobs",
    name: "Remote Jobs",
    query: "remote job offer scam or legit",
    isHighRisk: true,
    description:
      "Work-from-home job offers and postings — a common target for employment scams.",
  },
  {
    slug: "home-saving",
    name: "Home Saving",
    query: "home saving hack product review",
    isHighRisk: false,
    description:
      "Household products and services claiming to cut utility bills or everyday costs.",
  },
];

// ---------------------------------------------------------------------------
// Well-known creators this site tracks by YouTube channel ID.
//
// Deliberately empty at scaffold time: unlike topics (descriptive metadata),
// a creator seed requires a verified, real `youtubeChannelId` — populating
// this with unverified IDs would silently break YouTube Data API calls.
// Filling this in is Phase 2 editorial work, not scaffold work.
// ---------------------------------------------------------------------------

const CREATORS: CreatorSeed[] = [];

// ---------------------------------------------------------------------------
// Compliance data — drives the admin-approval gate's category floor and the
// social-content safety checks. See AGENTS.md for why these categories are
// high-risk for this site (financial/investment claims, giveaways/sweepstakes,
// job offers, income-guarantee courses and side hustles).
// ---------------------------------------------------------------------------

const FORBIDDEN_CONTENT_PATTERNS: SiteConfig["forbiddenContentPatterns"] = [
  {
    pattern: /guaranteed\s+(returns?|profits?|income)/i,
    reason: "Unsubstantiated financial guarantee",
  },
  {
    pattern: /this\s+(makes?|will\s+make)\s+you\s+rich/i,
    reason: "Unsubstantiated wealth claim",
  },
  {
    pattern: /(banks?|wall\s+street|the\s+government)\s+don.t\s+want\s+you\s+to\s+know/i,
    reason: "Fear-based anti-establishment copy",
  },
  {
    pattern: /every(one|body)\s+needs\s+this/i,
    reason: "Universal targeting language",
  },
  {
    pattern: /guaranteed\s+to/i,
    reason: "Unsubstantiated guarantee",
  },
  {
    pattern: /proven\s+to\s+(double|triple|10x)\s+your\s+(money|income)/i,
    reason: "Unsubstantiated proof claim",
  },
  {
    pattern: /you.re\s+(losing|missing\s+out\s+on)\s+money/i,
    reason: "Manufactured urgency / FOMO",
  },
  {
    pattern: /only\s+\d+\s+spots?\s+left/i,
    reason: "Fabricated scarcity",
  },
];

const HIGH_RISK_TEXT_PATTERNS: RegExp[] = [
  /guaranteed\s+(returns?|income|profit)/i,
  /\bcrypto\b|\bbitcoin\b|\bnft\b/i,
  /\bforex\b|day\s+trading/i,
  /\bponzi\b|pyramid\s+scheme|\bmlm\b/i,
  /get\s+rich\s+quick/i,
  /class\s+action|\blawsuit\b|\bsec\b\s+(charges|investigation)/i,
  /wire\s+transfer|gift\s+card.*payment/i,
  /advance\s+fee|processing\s+fee.*(prize|winnings)/i,
];

const HIGH_RISK_TOPIC_KEYWORDS: string[] = [
  "investment",
  "crypto",
  "forex",
  "guaranteed returns",
  "giveaway",
  "prize",
  "sweepstakes",
  "mlm",
  "pyramid scheme",
  "ponzi",
  "get rich quick",
  "passive income",
  "insider trading",
  "class action",
  "job offer",
  "wire transfer",
];

// ---------------------------------------------------------------------------
// The site config — the single file a new site fills in. Everything above
// this line is this site's own data; everything below is just assembly.
// ---------------------------------------------------------------------------

export const siteConfig = defineSiteConfig({
  name: "Hype Check",
  tagline: "Legit, or just hype?",
  description:
    "Evidence-based verdicts on trending products, courses, side hustles, and investment apps — legit, misleading, overpriced, risky, or scam.",
  domain: "hype-check.net",
  appUrl: env.NEXT_PUBLIC_APP_URL,
  indexNowKey: "fd2c32d62d0eb1b33437fb203c921a90",
  topics: TOPICS,
  creators: CREATORS,
  forbiddenContentPatterns: FORBIDDEN_CONTENT_PATTERNS,
  highRiskTextPatterns: HIGH_RISK_TEXT_PATTERNS,
  highRiskTopicKeywords: HIGH_RISK_TOPIC_KEYWORDS,
});

// Fails fast at import time (rather than shipping a broken/non-compliant
// site) if a required field is missing.
validateSiteConfig(siteConfig);
