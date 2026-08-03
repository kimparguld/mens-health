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
    slug: "testosterone",
    name: "Testosterone",
    query: "testosterone men's health",
    isHighRisk: true,
    description:
      "Testosterone levels, TRT, natural optimization, and hormonal health for men.",
  },
  {
    slug: "fitness-over-40",
    name: "Fitness Over 40",
    query: "fitness over 40 men workout",
    isHighRisk: false,
    description:
      "Training strategies, recovery, and physique goals for men over 40.",
  },
  {
    slug: "muscle-gain",
    name: "Muscle Gain",
    query: "muscle building men hypertrophy",
    isHighRisk: false,
    description:
      "Evidence-based approaches to building muscle, programming, and nutrition.",
  },
  {
    slug: "longevity",
    name: "Longevity",
    query: "longevity health men lifespan",
    isHighRisk: false,
    description:
      "Science of living longer and healthier — exercise, diet, and lifestyle factors.",
  },
  {
    slug: "sleep",
    name: "Sleep",
    query: "sleep optimization men health",
    isHighRisk: false,
    description:
      "Sleep quality, circadian rhythms, and practical strategies for better rest.",
  },
  {
    slug: "mental-health",
    name: "Mental Health",
    query: "men mental health depression anxiety",
    isHighRisk: true,
    description:
      "Men's mental wellbeing, stress, anxiety, depression, and psychological resilience.",
  },
  {
    slug: "nutrition",
    name: "Nutrition",
    query: "men nutrition diet protein",
    isHighRisk: false,
    description:
      "Dietary strategies, macros, meal timing, and food quality for men's health.",
  },
  {
    slug: "weight-loss",
    name: "Weight Loss",
    query: "men weight loss fat loss",
    isHighRisk: false,
    description:
      "Evidence-backed fat loss strategies, calorie balance, and sustainable dieting.",
  },
  {
    slug: "hair-loss",
    name: "Hair Loss",
    query: "men hair loss treatment DHT",
    isHighRisk: false,
    description:
      "Male pattern baldness, DHT, finasteride, minoxidil, and emerging treatments.",
  },
  {
    slug: "fertility",
    name: "Fertility",
    query: "men fertility sperm health",
    isHighRisk: true,
    description:
      "Male fertility, sperm quality, lifestyle factors, and treatment options.",
  },
  {
    slug: "prostate-health",
    name: "Prostate Health",
    query: "prostate health men BPH cancer",
    isHighRisk: true,
    description:
      "Prostate conditions, screening, BPH, and prostate cancer awareness.",
  },
  {
    slug: "erectile-dysfunction",
    name: "Erectile Dysfunction",
    query: "erectile dysfunction men ED treatment",
    isHighRisk: true,
    description:
      "ED causes, lifestyle factors, treatment options, and vascular health.",
  },
  {
    slug: "biohacking",
    name: "Biohacking",
    query: "biohacking men optimization performance",
    isHighRisk: false,
    description:
      "Self-experimentation, wearables, cold exposure, fasting, and performance optimization.",
  },
  {
    slug: "supplements",
    name: "Supplements",
    query: "men health supplements evidence",
    isHighRisk: true,
    description:
      "Evidence review of popular supplements: creatine, vitamin D, magnesium, and more.",
  },
  {
    slug: "mens-health",
    name: "Men's Health",
    query: "men's health general wellness",
    isHighRisk: false,
    description:
      "General men's health topics, preventive care, and evidence-based wellness.",
  },
];

// ---------------------------------------------------------------------------
// Well-known creators this site tracks by YouTube channel ID.
// ---------------------------------------------------------------------------

const CREATORS: CreatorSeed[] = [
  {
    slug: "andrew-huberman",
    name: "Andrew Huberman",
    youtubeChannelId: "UC2D2CMWXMOVWx7giW1n3LIg",
    description:
      "Stanford neuroscientist and professor. Covers neuroscience, sleep, hormones, and performance through a research-first lens.",
    specialty: "Neuroscience, sleep, testosterone, performance",
    credentials: "PhD, Stanford School of Medicine",
  },
  {
    slug: "peter-attia",
    name: "Peter Attia",
    youtubeChannelId: "UCdDT2Wy2iFGMiDkOoqzO2YQ",
    description:
      "Longevity-focused physician exploring lifespan, healthspan, and the science of living well for as long as possible.",
    specialty: "Longevity, metabolic health, cancer, cardiovascular health",
    credentials: "MD, Stanford / Johns Hopkins",
  },
  {
    slug: "jeff-nippard",
    name: "Jeff Nippard",
    youtubeChannelId: "UC68TLK0mAEzUyHx5x5k-S1Q",
    description:
      "Natural competitive bodybuilder and coach known for translating exercise science into practical training advice.",
    specialty: "Hypertrophy, strength training, evidence-based fitness",
  },
  {
    slug: "thomas-delauer",
    name: "Thomas DeLauer",
    youtubeChannelId: "UC70SrI3VkT1MXALRtf0pcHg",
    description:
      "Business performance coach turned nutrition and fasting researcher, focused on metabolic optimization.",
    specialty: "Fasting, ketogenic diet, weight loss, metabolic health",
  },
  {
    slug: "jeremy-ethier",
    name: "Jeremy Ethier",
    youtubeChannelId: "UCERm5yFZ1SptUHhkpfr4Yow",
    description:
      "Kinesiologist and online coach applying exercise science to practical workout programming for hypertrophy.",
    specialty: "Muscle building, workout programming, biomechanics",
    credentials: "BSc Kinesiology",
  },
  {
    slug: "mind-pump",
    name: "Mind Pump",
    youtubeChannelId: "UCz2gqA7dJFaWfHiMbzaLEcg",
    description:
      "Four fitness coaches delivering no-BS training, nutrition, and health content with a focus on sustainable results.",
    specialty: "Strength training, nutrition, fitness industry critique",
  },
  {
    slug: "ben-greenfield",
    name: "Ben Greenfield",
    youtubeChannelId: "UCnhV-E9bwTZ-eFGAcf42_bQ",
    description:
      "Athlete, biohacker, and author exploring the edges of human performance, recovery, and longevity.",
    specialty: "Biohacking, performance, longevity, cold therapy",
    credentials: "MSc Exercise Science",
  },
  {
    slug: "rhonda-patrick",
    name: "Dr. Rhonda Patrick",
    youtubeChannelId: "UCbOXPiZBYzHLHy2pGHE7blw",
    description:
      "Biomedical scientist focused on micronutrient deficiencies, stress, sleep, and their effects on aging and disease.",
    specialty: "Micronutrients, heat/cold stress, aging, omega-3",
    credentials: "PhD Biomedical Science",
  },
];

// ---------------------------------------------------------------------------
// Compliance data — drives the admin-approval gate's category floor and the
// social-content safety checks. See AGENTS.md for why these categories are
// high-risk for this site (TRT/testosterone, medications, supplements,
// cancer, mental health, ED).
// ---------------------------------------------------------------------------

const FORBIDDEN_CONTENT_PATTERNS: SiteConfig["forbiddenContentPatterns"] = [
  {
    pattern: /fix\s+your\s+(testosterone|energy|hormones|libido|ed)/i,
    reason: "Personal-condition directive language",
  },
  {
    pattern: /this\s+cures?/i,
    reason: "Unsubstantiated cure claim",
  },
  {
    pattern: /doctors?\s+don.t\s+want\s+you\s+to\s+know/i,
    reason: "Fear-based anti-establishment copy",
  },
  {
    pattern: /every\s+man\s+needs\s+this/i,
    reason: "Universal personal-condition targeting",
  },
  {
    pattern: /guaranteed\s+to/i,
    reason: "Unsubstantiated guarantee",
  },
  {
    pattern: /proven\s+to\s+(cure|reverse|fix|eliminate)/i,
    reason: "Unsubstantiated proof claim",
  },
  {
    pattern:
      /you\s+(have|might\s+have|could\s+have)\s+(low\s+testosterone|ed|depression|anxiety)/i,
    reason: "Implies the reader has a medical condition",
  },
  {
    pattern: /reverse\s+(aging|hair\s+loss|low\s+t)/i,
    reason: "Unsubstantiated reversal claim",
  },
];

const HIGH_RISK_TEXT_PATTERNS: RegExp[] = [
  /testosterone/i,
  /\btrt\b/i,
  /\banabolic\b|\bsteroids?\b/i,
  /finasteride|minoxidil|dutasteride/i,
  /viagra|cialis|sildenafil|tadalafil/i,
  /\bcancer\b|tumou?r|oncolog/i,
  /antidepressant|\bssri\b|\bmedication\b|prescription/i,
  /\bdosage\b.*\d+\s*(mg|mcg|iu)\b/i,
];

const HIGH_RISK_TOPIC_KEYWORDS: string[] = [
  "testosterone",
  "trt",
  "trt therapy",
  "medications",
  "prescription",
  "ed treatment",
  "erectile dysfunction",
  "cancer",
  "depression",
  "anxiety",
  "mental health",
  "suicide",
  "supplement",
  "steroids",
  "hormone replacement",
];

// ---------------------------------------------------------------------------
// The site config — the single file a new site fills in. Everything above
// this line is this site's own data; everything below is just assembly.
// ---------------------------------------------------------------------------

export const siteConfig = defineSiteConfig({
  name: "MenHealth Digest",
  tagline: "Your weekly men's health briefing",
  description:
    "Evidence-aware summaries of trending men's health content — without the hype.",
  domain: "menhealth-digest.com",
  appUrl: env.NEXT_PUBLIC_APP_URL,
  indexNowKey: "e6182a5a89bb4f3f8a9752d77947b0b1",
  topics: TOPICS,
  creators: CREATORS,
  forbiddenContentPatterns: FORBIDDEN_CONTENT_PATTERNS,
  highRiskTextPatterns: HIGH_RISK_TEXT_PATTERNS,
  highRiskTopicKeywords: HIGH_RISK_TOPIC_KEYWORDS,
});

// Fails fast at import time (rather than shipping a broken/non-compliant
// site) if a required field is missing.
validateSiteConfig(siteConfig);
