export type TopicSeed = {
  slug: string;
  name: string;
  query: string;
  isHighRisk: boolean;
  description: string;
};

export const TOPIC_SEEDS: TopicSeed[] = [
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
