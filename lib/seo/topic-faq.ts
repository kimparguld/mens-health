import type { FaqEntry } from "./json-ld";

export type TopicSeoData = {
  intro: string;
  faq: FaqEntry[];
};

const TOPIC_SEO: Record<string, TopicSeoData> = {
  testosterone: {
    intro:
      "Testosterone is the primary male sex hormone governing muscle mass, libido, energy, and mood. Levels peak in early adulthood and decline gradually with age, but lifestyle factors — sleep, exercise, body composition, and stress — have a significant impact at every age.",
    faq: [
      {
        question: "What are normal testosterone levels for men?",
        answer:
          "Total testosterone typically ranges from 300–1000 ng/dL for adult men, though reference ranges vary by lab. Levels naturally decline around 1% per year after age 30. A blood test (ideally morning fasting) is required for an accurate reading.",
      },
      {
        question: "Can you raise testosterone naturally?",
        answer:
          "Yes. Resistance training, adequate sleep (7–9 hours), maintaining a healthy body weight, reducing chronic stress, and optimising vitamin D and zinc intake are all evidence-backed ways to support healthy testosterone levels.",
      },
      {
        question: "What is TRT and who needs it?",
        answer:
          "Testosterone Replacement Therapy (TRT) is a medical treatment prescribed for clinically diagnosed hypogonadism — not simply 'low-normal' levels. It requires a thorough medical evaluation including blood work, symptom assessment, and monitoring for side effects.",
      },
    ],
  },
  "fitness-over-40": {
    intro:
      "Training after 40 requires adapting to longer recovery times, changing hormonal profiles, and accumulated wear-and-tear — but it also benefits from decades of experience and discipline. Many men are in the best shape of their lives in their 40s and 50s.",
    faq: [
      {
        question: "How does training change after 40?",
        answer:
          "Recovery takes longer, so reducing overall volume and prioritising sleep and nutrition becomes more important. Mobility and injury prevention work pays bigger dividends, and progressive overload principles remain just as effective.",
      },
      {
        question: "How many days per week should a man over 40 train?",
        answer:
          "3–4 days of structured resistance training per week works well for most men over 40, with low-intensity cardio on off days. Daily step count (8,000–10,000 steps) is as important as structured gym sessions.",
      },
      {
        question: "Is it harder to build muscle after 40?",
        answer:
          "It is slightly harder due to lower anabolic hormone levels and reduced muscle protein synthesis rates, but far from impossible. Adequate protein intake (1.6–2.2 g/kg bodyweight) and consistent progressive training produce significant results at any age.",
      },
    ],
  },
  "muscle-gain": {
    intro:
      "Building muscle (hypertrophy) is fundamentally driven by progressive mechanical tension, adequate protein, and recovery. The science is well established — the challenge is consistent execution over months and years.",
    faq: [
      {
        question: "How much protein do you need to build muscle?",
        answer:
          "Current evidence supports 1.6–2.2 g of protein per kg of bodyweight per day for maximising muscle protein synthesis. Spreading intake across 3–5 meals with at least 30–40 g protein each optimises the anabolic response.",
      },
      {
        question: "How long does it take to see muscle growth?",
        answer:
          "Beginners typically notice measurable strength gains within 2–4 weeks and visible hypertrophy within 8–12 weeks. Intermediate and advanced lifters should expect slower progress — roughly 1–2 lbs of muscle per month in optimal conditions.",
      },
      {
        question: "Is cardio bad for muscle gain?",
        answer:
          "Moderate cardio does not meaningfully inhibit hypertrophy if protein intake and recovery are adequate. 2–3 sessions of low-to-moderate intensity cardio per week is compatible with, and beneficial for, muscle building programmes.",
      },
    ],
  },
  longevity: {
    intro:
      "Longevity science focuses on the lifestyle and biological factors that slow ageing and extend healthspan — the years lived in good health. Exercise, nutrition, sleep, and stress management are the four pillars backed by the strongest evidence.",
    faq: [
      {
        question: "What exercise is best for longevity?",
        answer:
          "Combined cardiorespiratory fitness and strength are the two strongest predictors of all-cause mortality. Zone 2 aerobic exercise (3–4 hrs/week) and resistance training (2–3 sessions/week) together form the evidence-based foundation.",
      },
      {
        question: "Does intermittent fasting extend lifespan?",
        answer:
          "Animal studies show promising results, but long-term human evidence is limited. Caloric restriction and maintaining a healthy body composition are more robustly linked to longevity than any specific eating window.",
      },
      {
        question: "Which blood biomarkers matter most for longevity?",
        answer:
          "VO2 max, fasting insulin/glucose, triglycerides, LDL particle size, inflammatory markers (hsCRP), and grip strength are among the most predictive. Regular monitoring allows early intervention before clinical disease develops.",
      },
    ],
  },
  sleep: {
    intro:
      "Sleep is arguably the most underrated pillar of men's health. Chronic short sleep (under 7 hours) is associated with reduced testosterone, elevated cortisol, impaired muscle recovery, and higher cardiovascular risk.",
    faq: [
      {
        question: "How much sleep do men need?",
        answer:
          "Most adults need 7–9 hours of sleep per night. Testosterone secretion is highly dependent on sleep duration and quality — even one week of short sleep (5 hours/night) can reduce testosterone by 10–15%.",
      },
      {
        question: "What damages sleep quality most?",
        answer:
          "Alcohol (even moderate amounts fragment sleep architecture), blue light exposure within 2 hours of bedtime, irregular sleep schedules, and high bedroom temperatures are the most common disruptors.",
      },
      {
        question: "Do sleep supplements work?",
        answer:
          "Low-dose melatonin (0.5–3 mg) is evidence-backed for circadian rhythm adjustment (e.g. jet lag). Magnesium glycinate may help sleep quality in deficient individuals. Most other marketed 'sleep supplements' lack strong human evidence.",
      },
    ],
  },
  "mental-health": {
    intro:
      "Men are statistically less likely to seek help for mental health challenges, yet are at higher risk of suicide. Evidence-based approaches — exercise, therapy, social connection, and in some cases medication — are effective and increasingly destigmatised.",
    faq: [
      {
        question: "How does exercise affect men's mental health?",
        answer:
          "Regular aerobic and resistance exercise has antidepressant and anxiolytic effects comparable to medication in mild-to-moderate cases. Exercise increases BDNF, improves sleep, and provides structure — all of which support mood regulation.",
      },
      {
        question: "What are the signs of depression in men?",
        answer:
          "Men often present with irritability, anger, risk-taking, increased alcohol use, and social withdrawal rather than classic sadness. Persistent fatigue, loss of interest in previously enjoyable activities, and sleep changes are key signals.",
      },
      {
        question: "Should men see a therapist?",
        answer:
          "Yes. Cognitive Behavioural Therapy (CBT) has strong evidence for depression and anxiety. Many men find single-session or structured short-term therapy more accessible than open-ended counselling. Online and app-based options have expanded access significantly.",
      },
    ],
  },
  nutrition: {
    intro:
      "Nutrition for men's health centres on adequate protein to preserve muscle, micronutrient sufficiency, and managing calorie balance for body composition. Whole-food dietary patterns consistently outperform specific diets in long-term outcomes.",
    faq: [
      {
        question: "What is the best diet for men's health?",
        answer:
          "No single diet wins universally. Mediterranean, whole-food plant-based, and high-protein approaches all show positive outcomes when calories are appropriate. The best diet is one high in whole foods, adequate in protein, and sustainable long-term.",
      },
      {
        question: "How much protein should men eat per day?",
        answer:
          "Sedentary men need approximately 0.8 g/kg bodyweight. Active men and those seeking to build or maintain muscle benefit from 1.6–2.2 g/kg. Protein intake above the upper range offers minimal additional benefit.",
      },
      {
        question: "Are carbohydrates bad for men?",
        answer:
          "No. Carbohydrates are the primary fuel for high-intensity exercise and support thyroid function and testosterone production. Quality matters more than quantity — whole grains, legumes, and fruit are preferable to refined sugars and ultra-processed foods.",
      },
    ],
  },
  "weight-loss": {
    intro:
      "Sustainable fat loss requires a sustained calorie deficit combined with adequate protein to preserve lean mass. No diet, supplement, or protocol overcomes the fundamental energy balance equation.",
    faq: [
      {
        question: "How fast can men safely lose fat?",
        answer:
          "0.5–1% of bodyweight per week is a sustainable rate that minimises muscle loss. Faster loss is possible but increases catabolism risk, fatigue, and diet adherence failure. Patience and consistency beat aggressive restriction.",
      },
      {
        question: "Does muscle turn to fat if you stop training?",
        answer:
          "No — muscle and fat are different tissues. When you stop training, muscle can atrophy (shrink) and body fat may increase if calories remain unchanged, but one does not convert into the other.",
      },
      {
        question: "Do fat burners work?",
        answer:
          "Most fat-burning supplements have minimal or no clinically meaningful effect. Caffeine modestly increases metabolic rate and fat oxidation during exercise. No supplement substitutes for a calorie deficit and consistent training.",
      },
    ],
  },
  "hair-loss": {
    intro:
      "Male pattern baldness (androgenetic alopecia) affects around 50% of men by age 50. DHT — a testosterone metabolite — is the primary driver. Several evidence-backed treatments can slow or partially reverse hair loss.",
    faq: [
      {
        question: "What causes male pattern baldness?",
        answer:
          "Androgenetic alopecia is driven by genetic sensitivity of hair follicles to dihydrotestosterone (DHT). The gene is polygenic and can be inherited from either parent. It is not caused by wearing hats or frequent shampooing.",
      },
      {
        question: "Do finasteride and minoxidil work?",
        answer:
          "Yes. Finasteride (1 mg/day oral) and minoxidil (topical or oral) are the only FDA-approved treatments for male pattern hair loss with strong clinical evidence. Both work best when started early and require long-term use to maintain results.",
      },
      {
        question: "Are there natural alternatives to finasteride?",
        answer:
          "Saw palmetto shows weak DHT-inhibiting activity in some studies but is far less effective than finasteride. No natural supplement approaches the efficacy of approved medical treatments for significant hair loss.",
      },
    ],
  },
  fertility: {
    intro:
      "Male fertility has declined significantly over recent decades, with sperm count and quality both affected by lifestyle, environment, and health conditions. Many factors influencing male fertility are modifiable.",
    faq: [
      {
        question: "What lifestyle factors affect male fertility?",
        answer:
          "Smoking, excessive alcohol, heat exposure to the testes (laptops, hot baths, tight underwear), obesity, anabolic steroid use, and high psychological stress all negatively impact sperm production and quality.",
      },
      {
        question: "Can diet improve sperm quality?",
        answer:
          "A Mediterranean-style diet rich in antioxidants (vitamin C, E, zinc, selenium, coenzyme Q10) is associated with better semen parameters. Ultra-processed food, trans fats, and excessive soy intake may negatively affect sperm quality.",
      },
      {
        question: "When should a man get a semen analysis?",
        answer:
          "If a couple has been trying to conceive for 12 months without success (or 6 months if the female partner is over 35), both partners should be evaluated. Semen analysis is inexpensive, non-invasive, and provides valuable baseline data.",
      },
    ],
  },
  "prostate-health": {
    intro:
      "The prostate gland affects urinary function and sexual health. Benign prostatic hyperplasia (BPH) and prostate cancer become increasingly common with age. Lifestyle interventions and regular screening are the primary tools for prevention and early detection.",
    faq: [
      {
        question: "When should men start prostate screening?",
        answer:
          "The PSA blood test is recommended starting at age 50 for average-risk men (or 40–45 for high-risk groups: African-American men or those with a first-degree relative with prostate cancer). Discuss individualised risk with your doctor.",
      },
      {
        question: "Does a high PSA always mean prostate cancer?",
        answer:
          "No. PSA can be elevated by benign prostatic hyperplasia, prostatitis, recent ejaculation, or physical activity. An elevated PSA warrants further investigation — typically a digital rectal exam, repeat PSA, and possibly an MRI or biopsy.",
      },
      {
        question: "What diet supports prostate health?",
        answer:
          "Diets high in vegetables (especially cruciferous and tomatoes/lycopene), low in red and processed meat, and limited in calcium supplementation are associated with lower prostate cancer risk in observational studies.",
      },
    ],
  },
  "erectile-dysfunction": {
    intro:
      "Erectile dysfunction (ED) affects up to 50% of men over 40 to some degree. It is often a vascular condition — an early warning sign of cardiovascular disease — rather than purely psychological, making it medically important to investigate.",
    faq: [
      {
        question: "Is ED always a psychological problem?",
        answer:
          "No. The majority of ED in men over 40 has a vascular or hormonal component. Endothelial dysfunction that affects penile blood flow is the same process that causes cardiovascular disease. ED preceded heart disease in many patients.",
      },
      {
        question: "Do PDE5 inhibitors (Viagra, Cialis) work for all men?",
        answer:
          "PDE5 inhibitors are effective for around 70–80% of men with ED of vascular origin. They are less effective when the primary cause is low testosterone, nerve damage (post-prostatectomy), or severe vascular disease. Medical evaluation guides appropriate use.",
      },
      {
        question: "Can lifestyle changes reverse ED?",
        answer:
          "Yes — particularly for lifestyle-related ED. Regular aerobic exercise, weight loss, smoking cessation, limiting alcohol, and improving sleep all have strong evidence for improving erectile function, sometimes to the same degree as medication.",
      },
    ],
  },
  biohacking: {
    intro:
      "Biohacking spans a wide spectrum — from well-evidenced interventions like cold water immersion and time-restricted eating to fringe self-experimentation. A critical evidence lens separates meaningful optimisation from expensive noise.",
    faq: [
      {
        question: "Does cold exposure improve health?",
        answer:
          "Cold water immersion shows evidence for reducing muscle soreness, improving mood (norepinephrine release), and cold adaptation. Evidence for fat loss, immune function, or longevity benefits in humans is currently limited and mixed.",
      },
      {
        question: "Is time-restricted eating effective for fat loss?",
        answer:
          "Time-restricted eating (e.g. 16:8) can help reduce calorie intake by limiting eating windows and may improve insulin sensitivity. However, when total calories are matched, the timing advantage largely disappears — adherence and preference matter more.",
      },
      {
        question: "Are wearables worth using for health optimisation?",
        answer:
          "Continuous glucose monitors, sleep trackers, and HRV monitors provide useful trend data for motivated individuals. Their primary value is behaviour change via feedback loops, not diagnostic accuracy — treat data as directional rather than definitive.",
      },
    ],
  },
  supplements: {
    intro:
      "The supplement industry generates billions in revenue, but the majority of products are poorly studied. A short list of supplements have robust human evidence; most others have weak, mixed, or no data.",
    faq: [
      {
        question: "Which supplements have the best evidence for men?",
        answer:
          "Creatine monohydrate (strength and muscle), vitamin D3 (if deficient), magnesium glycinate (sleep and muscle function), omega-3 (cardiovascular and anti-inflammatory), and caffeine (performance) have the strongest evidence-to-benefit ratios for most men.",
      },
      {
        question: "Is creatine safe for long-term use?",
        answer:
          "Yes. Creatine monohydrate is the most studied sports supplement in history. Decades of research show no adverse effects on kidney function in healthy individuals. 3–5 g per day is the standard effective dose.",
      },
      {
        question: "Do testosterone booster supplements work?",
        answer:
          "The majority of over-the-counter testosterone boosters have no meaningful clinical evidence. Ingredients like D-aspartic acid, tribulus terrestris, and fenugreek show inconsistent or negligible effects on testosterone in healthy men.",
      },
    ],
  },
  "mens-health": {
    intro:
      "Men's health encompasses physical fitness, mental wellbeing, sexual health, disease prevention, and healthy ageing. Preventive care and regular health screening remain significantly underutilised by men compared to women.",
    faq: [
      {
        question: "Why do men live shorter lives than women?",
        answer:
          "The gender gap in life expectancy is driven by higher rates of cardiovascular disease, occupational hazards, risk-taking behaviour, lower rates of healthcare utilisation, and later diagnosis of treatable conditions. Most of these factors are modifiable.",
      },
      {
        question: "What health screenings should men get?",
        answer:
          "By 40: blood pressure, cholesterol panel, fasting glucose, BMI. By 45–50: colorectal cancer screening, PSA discussion. Ongoing: STI testing if sexually active, skin checks for those with high UV exposure, and dental and eye examinations annually.",
      },
      {
        question: "How can men improve their health quickly?",
        answer:
          "The highest-impact changes are: quitting smoking, achieving or maintaining a healthy weight, exercising regularly (cardio and resistance training), sleeping 7–9 hours per night, and limiting alcohol. These five changes address the majority of preventable chronic disease risk.",
      },
    ],
  },
};

export function getTopicSeo(slug: string): TopicSeoData | null {
  return TOPIC_SEO[slug] ?? null;
}
