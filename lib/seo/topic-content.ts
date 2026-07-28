// Static enrichment content for topic hub pages.
// Used when DB-generated content is not yet available.

export type TopicContent = {
  beginnerGuide: {
    heading: string;
    steps: string[];
  };
  topClaims: Array<{
    text: string;
    evidenceStatus: "SUPPORTED" | "MIXED" | "WEAK" | "UNSUPPORTED";
  }>;
  commonMyths: Array<{
    myth: string;
    reality: string;
  }>;
  takeaways: string[];
};

const TOPIC_CONTENT: Record<string, TopicContent> = {
  testosterone: {
    beginnerGuide: {
      heading: "Where to start with testosterone health",
      steps: [
        "Get a fasting morning blood test to establish your baseline total and free testosterone.",
        "Prioritise 7–9 hours of sleep — testosterone is produced primarily during deep sleep.",
        "Begin a consistent resistance training programme (3–4 sessions/week).",
        "Address body composition — excess body fat converts testosterone to oestrogen.",
        "Consult a doctor before considering TRT; lifestyle changes first.",
      ],
    },
    topClaims: [
      {
        text: "Sleep matters more for testosterone than any supplement.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Resistance training consistently raises testosterone levels.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Ashwagandha modestly increases testosterone in stressed men.",
        evidenceStatus: "MIXED",
      },
      {
        text: "Cold showers meaningfully boost testosterone.",
        evidenceStatus: "WEAK",
      },
    ],
    commonMyths: [
      {
        myth: "Low testosterone is always the cause of fatigue and low libido.",
        reality:
          "Many symptoms overlap with poor sleep, thyroid issues, and depression. Blood testing is the only way to confirm.",
      },
      {
        myth: "TRT is safe for any man who wants higher testosterone.",
        reality:
          "TRT is a medical treatment with real risks (infertility, haematocrit elevation, cardiovascular effects). It requires clinical diagnosis and monitoring.",
      },
      {
        myth: "Soy foods dramatically lower testosterone.",
        reality:
          "Human studies on moderate soy consumption show negligible effects on testosterone or oestrogen in men.",
      },
    ],
    takeaways: [
      "Sleep is the single highest-leverage lever for natural testosterone.",
      "Resistance training 3–4×/week provides consistent hormonal support.",
      "Body fat reduction — especially visceral fat — improves testosterone:oestrogen ratio.",
      "Get blood work before assuming your testosterone is low.",
      "TRT requires medical supervision and is not a lifestyle upgrade.",
    ],
  },
  sleep: {
    beginnerGuide: {
      heading: "Where to start with sleep optimisation",
      steps: [
        "Set a consistent sleep and wake time, even on weekends.",
        "Keep your bedroom cool (16–19°C) and dark.",
        "Avoid screens for 30–60 minutes before bed or use blue-light blocking.",
        "Limit caffeine after 2pm — its half-life is 5–7 hours.",
        "Track your sleep for one week with a wearable or sleep diary before adding supplements.",
      ],
    },
    topClaims: [
      {
        text: "7–9 hours of sleep is needed for optimal testosterone production.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Alcohol disrupts sleep quality even if it helps you fall asleep.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Low-dose melatonin (0.5–1mg) helps with sleep timing.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "High-dose melatonin (10mg+) is better for sleep.",
        evidenceStatus: "WEAK",
      },
    ],
    commonMyths: [
      {
        myth: "I can catch up on sleep at the weekend.",
        reality:
          "Chronic sleep debt cannot be fully repaid in a weekend. Cognitive impairment accumulates over time with insufficient sleep.",
      },
      {
        myth: "You need less sleep as you get older.",
        reality:
          "Sleep architecture changes with age, but the need for 7–9 hours remains. Older adults often sleep lighter and wake more.",
      },
    ],
    takeaways: [
      "Consistency (same sleep/wake time) is more powerful than duration alone.",
      "Alcohol significantly degrades sleep quality even at low doses.",
      "Temperature is one of the most underrated sleep levers.",
      "Fix sleep before adding any supplement protocol.",
      "Chronic short sleep raises cortisol and reduces testosterone.",
    ],
  },
  "muscle-gain": {
    beginnerGuide: {
      heading: "Where to start building muscle",
      steps: [
        "Pick a structured programme (e.g. Starting Strength, GZCLP) rather than random workouts.",
        "Hit 10–20 weekly sets per muscle group, focusing on compound movements.",
        "Eat 1.6–2.2g of protein per kg of bodyweight per day.",
        "Prioritise sleep: muscle is built during recovery, not during training.",
        "Track your lifts — progressive overload is the fundamental driver of hypertrophy.",
      ],
    },
    topClaims: [
      {
        text: "Progressive overload is required for continued hypertrophy.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Protein above 2.2g/kg/day provides no additional muscle benefit.",
        evidenceStatus: "MIXED",
      },
      {
        text: "Creatine monohydrate reliably increases strength and lean mass.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "You must train to failure on every set to maximise muscle growth.",
        evidenceStatus: "WEAK",
      },
    ],
    commonMyths: [
      {
        myth: "Cardio kills gains.",
        reality:
          "Moderate cardio (2–3 low-intensity sessions/week) does not meaningfully impair hypertrophy when protein and recovery are adequate.",
      },
      {
        myth: "You need expensive supplements to build muscle.",
        reality:
          "Food-based protein and creatine monohydrate cover the evidence-backed basics. Most other supplements offer negligible benefit.",
      },
    ],
    takeaways: [
      "Consistent progressive overload over months and years drives muscle growth.",
      "Protein at 1.6–2.2g/kg/day is the non-negotiable nutritional foundation.",
      "Creatine monohydrate (3–5g/day) is the most evidence-backed supplement.",
      "Sleep and recovery are as important as training stimulus.",
      "Results require 8–12 weeks minimum before visible changes are reliable.",
    ],
  },
  longevity: {
    beginnerGuide: {
      heading: "Where to start with longevity habits",
      steps: [
        "Measure your VO2 max and grip strength — two of the strongest predictors of all-cause mortality.",
        "Build Zone 2 aerobic fitness (3–4hrs/week of low-intensity cardio).",
        "Add 2–3 resistance training sessions to maintain muscle mass through middle age.",
        "Optimise sleep — it is the most powerful recovery and longevity lever available.",
        "Regular preventive blood work: fasting glucose, lipids, hsCRP, and HbA1c.",
      ],
    },
    topClaims: [
      {
        text: "VO2 max is one of the strongest predictors of longevity.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Zone 2 cardio primarily improves mitochondrial function and healthspan.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Metformin extends lifespan in humans.",
        evidenceStatus: "WEAK",
      },
    ],
    commonMyths: [
      {
        myth: "Expensive supplements like NMN or resveratrol are proven longevity enhancers.",
        reality:
          "Most longevity supplements lack robust human evidence. Exercise, sleep, and nutrition have far stronger evidence than any supplement.",
      },
      {
        myth: "Genetics determine most of your healthspan.",
        reality:
          "Lifestyle factors account for 70–80% of healthspan variance. Genetics matter but are not destiny.",
      },
    ],
    takeaways: [
      "VO2 max is trainable at any age — even moderate gains dramatically reduce mortality risk.",
      "Muscle mass in your 40s predicts your functional independence in your 70s.",
      "Zone 2 aerobic training 3–4 hours/week is the best-evidenced longevity investment.",
      "Sleep is free, safe, and one of the most powerful longevity tools available.",
      "Metabolic health (insulin sensitivity, lipids, blood pressure) is the primary target.",
    ],
  },
  "fitness-over-40": {
    beginnerGuide: {
      heading: "Where to start training over 40",
      steps: [
        "Accept longer recovery — reduce volume before increasing it again gradually.",
        "Prioritise mobility and joint health alongside strength work.",
        "Start with 3 full-body sessions per week rather than 5–6 splits.",
        "Eat more protein than you think you need (1.8–2.2g/kg) to counter age-related muscle protein synthesis decline.",
        "Sleep 7–9 hours consistently — it is non-negotiable for recovery at this life stage.",
      ],
    },
    topClaims: [
      {
        text: "Men over 40 can build significant muscle with consistent training.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Recovery time increases meaningfully after 40.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "High-intensity training is too risky for men over 40.",
        evidenceStatus: "UNSUPPORTED",
      },
    ],
    commonMyths: [
      {
        myth: "It's too late to start training after 40.",
        reality:
          "The evidence consistently shows that starting resistance training in your 40s, 50s, or even 70s provides significant strength, muscle, and health benefits.",
      },
      {
        myth: "You should only do light, low-impact exercise after 40.",
        reality:
          "Heavy resistance training with appropriate technique and volume is safe and highly beneficial for men over 40. The key is progressive programming, not avoidance.",
      },
    ],
    takeaways: [
      "Recovery — not training stimulus — is the limiting factor for men over 40.",
      "Protein targets should be higher than in your 20s (1.8–2.2g/kg/day).",
      "Full-body 3×/week outperforms high-frequency splits for most men over 40.",
      "Mobility and injury prevention work pays increasing dividends with age.",
      "Consistency over 6–12 months matters far more than any single training programme.",
    ],
  },
  nutrition: {
    beginnerGuide: {
      heading: "Where to start with nutrition",
      steps: [
        "Track your current intake for 3–7 days to establish a baseline.",
        "Set protein targets first: 1.6–2.2g/kg of bodyweight per day.",
        "Build meals around whole foods: lean protein, vegetables, legumes, whole grains.",
        "Reduce ultra-processed food rather than restricting specific macros.",
        "Adjust calories based on your body composition goals, not a generic formula.",
      ],
    },
    topClaims: [
      {
        text: "Protein intake of 1.6–2.2g/kg optimises muscle retention and growth.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Meal timing matters less than total daily protein and calories.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Seed oils cause chronic inflammation and disease.",
        evidenceStatus: "WEAK",
      },
    ],
    commonMyths: [
      {
        myth: "Carbohydrates are inherently fattening.",
        reality:
          "Excess calories cause fat gain — carbohydrates are not uniquely problematic. Whole-food carbohydrate sources support training performance and metabolic health.",
      },
      {
        myth: "You need to eat every 2–3 hours to maintain muscle.",
        reality:
          "Total daily protein is what matters. Meal frequency has minimal impact on muscle protein synthesis as long as each meal contains adequate protein (30–40g).",
      },
    ],
    takeaways: [
      "Total calorie and protein intake drives 90% of nutrition outcomes.",
      "Whole food patterns consistently outperform specific named diets.",
      "Ultra-processed food is the biggest dietary risk factor in Western men.",
      "Protein distribution (30–40g per meal) optimises the anabolic response.",
      "Hydration, micronutrients, and fibre are under-prioritised relative to macros.",
    ],
  },
};

export function getTopicContent(slug: string): TopicContent | null {
  return TOPIC_CONTENT[slug] ?? null;
}
