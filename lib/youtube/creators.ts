export type CreatorSeed = {
  slug: string;
  name: string;
  youtubeChannelId: string;
  description: string;
  specialty: string;
  credentials?: string;
};

// Well-known men's health YouTube creators.
// youtubeChannelId is the channel's YouTube ID (UC…).
export const CREATOR_SEEDS: CreatorSeed[] = [
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
