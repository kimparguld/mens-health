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
  "mental-health": {
    beginnerGuide: {
      heading: "Where to start with mental health",
      steps: [
        "Track mood, sleep, and stress patterns for a week or two before assuming a single cause.",
        "Prioritise the fundamentals first — sleep, movement, and social connection are consistently the strongest levers for mood.",
        "Learn to recognise symptoms of depression and anxiety (persistent low mood, loss of interest, appetite or sleep changes lasting 2+ weeks) so you know when to seek help.",
        "Talk to a doctor or therapist early — men are diagnosed and treated for depression at lower rates than women despite similar underlying prevalence.",
        "If you have thoughts of self-harm, contact a crisis line or emergency services immediately — this is not something to self-manage.",
      ],
    },
    topClaims: [
      {
        text: "Regular exercise has an antidepressant effect comparable to medication for mild-to-moderate depression.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Men are less likely than women to seek treatment for depression.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Testosterone replacement reliably treats depression.",
        evidenceStatus: "WEAK",
      },
    ],
    commonMyths: [
      {
        myth: "Real men don't need therapy.",
        reality:
          "Therapy (especially CBT) has strong evidence for treating depression and anxiety, and normalising help-seeking improves outcomes and reduces suicide risk, which remains disproportionately high in men.",
      },
      {
        myth: "If you're not in crisis, your stress and low mood don't matter.",
        reality:
          "Subclinical, chronic stress still measurably affects sleep, cardiovascular health, and testosterone. Early intervention is easier than crisis intervention.",
      },
    ],
    takeaways: [
      "Sleep, exercise, and social connection are the foundational, evidence-backed levers for mood.",
      "Men are underdiagnosed and undertreated for depression and anxiety relative to prevalence.",
      "Persistent symptoms lasting more than two weeks warrant a conversation with a professional, not just 'toughing it out.'",
      "Suicide risk in men is significantly elevated — treat warning signs as urgent.",
      "Video content is not a substitute for a clinical mental health assessment.",
    ],
  },
  "weight-loss": {
    beginnerGuide: {
      heading: "Where to start with fat loss",
      steps: [
        "Establish a baseline: track your weight (weekly average, not daily) and rough calorie intake for 1–2 weeks.",
        "Create a moderate calorie deficit (300–500 kcal/day) rather than an aggressive one — it's more sustainable and preserves muscle.",
        "Keep protein high (1.6–2.2g/kg bodyweight) to protect lean mass while in a deficit.",
        "Add resistance training so weight lost is primarily fat, not muscle.",
        "Reassess every 2–3 weeks using the weekly trend, not single readings, to see if the plan is working.",
      ],
    },
    topClaims: [
      {
        text: "A sustained calorie deficit is required for fat loss, regardless of diet type.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Protein intake during a deficit helps preserve lean mass.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Certain foods (e.g. grapefruit, apple cider vinegar) 'burn fat' directly.",
        evidenceStatus: "UNSUPPORTED",
      },
      {
        text: "Intermittent fasting produces superior fat loss to any other calorie-matched approach.",
        evidenceStatus: "MIXED",
      },
    ],
    commonMyths: [
      {
        myth: "Carbs at night make you fat.",
        reality:
          "Total daily calorie balance determines fat gain or loss; meal timing has minimal independent effect once total intake is controlled for.",
      },
      {
        myth: "You can out-train a bad diet.",
        reality:
          "Exercise burns fewer calories than most people estimate; diet has a far larger effect on the calorie balance driving weight change.",
      },
    ],
    takeaways: [
      "Sustainable fat loss comes from a moderate, consistent calorie deficit — not extreme restriction.",
      "Protein and resistance training protect muscle mass while losing fat.",
      "Weekly trend, not daily fluctuation, is the meaningful signal to track.",
      "No single food or supplement meaningfully overrides the calorie balance.",
      "Rapid weight-loss claims in videos are frequently overstated or unsustainable.",
    ],
  },
  "hair-loss": {
    beginnerGuide: {
      heading: "Where to start with hair loss",
      steps: [
        "Identify the pattern: male pattern baldness (androgenetic alopecia) typically starts at the temples or crown, unlike diffuse thinning from other causes.",
        "Start early — the earlier treatment begins, the more hair is typically preserved.",
        "Minoxidil (topical) and finasteride (oral, prescription) are the two treatments with the strongest evidence base.",
        "Get a dermatologist consult before starting prescription treatment, especially to rule out other causes (thyroid, iron deficiency, stress-related shedding).",
        "Track progress with photos every 3 months — results from any treatment take 3–6+ months to become visible.",
      ],
    },
    topClaims: [
      {
        text: "Finasteride slows or reverses male pattern hair loss in most users.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Minoxidil regrows hair in a meaningful proportion of users.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Finasteride carries a real, if uncommon, risk of sexual side effects.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Biotin supplements regrow hair in men without a biotin deficiency.",
        evidenceStatus: "UNSUPPORTED",
      },
    ],
    commonMyths: [
      {
        myth: "Hair loss only comes from your mother's side.",
        reality:
          "Androgenetic alopecia is polygenic — genetics from both parents contribute meaningfully to risk.",
      },
      {
        myth: "Wearing hats causes baldness.",
        reality:
          "No evidence supports hats or helmets causing pattern hair loss; genetics and DHT sensitivity drive it.",
      },
    ],
    takeaways: [
      "Minoxidil and finasteride are the best-evidenced treatments; earlier use generally preserves more hair.",
      "Finasteride has real (uncommon) side-effect risk and should be discussed with a doctor, not started casually.",
      "Most supplement-based 'hair growth' claims lack strong human evidence outside of correcting an actual deficiency.",
      "Visible results take months — consistency matters more than any single product.",
      "Rule out non-pattern causes (thyroid, stress, iron) before assuming androgenetic hair loss.",
    ],
  },
  fertility: {
    beginnerGuide: {
      heading: "Where to start with fertility health",
      steps: [
        "Get a semen analysis if you and a partner have been trying to conceive for 12+ months (6 months if the partner is over 35) — it's the only way to know where you stand.",
        "Address the modifiable basics: avoid excessive heat exposure to the testes (hot tubs, laptop-on-lap), maintain a healthy weight, and moderate alcohol.",
        "Reduce or stop smoking and recreational drug use — both are consistently linked to lower sperm count and quality.",
        "Review medications and supplements with a doctor — some, including certain testosterone products, can suppress natural fertility.",
        "See a urologist or fertility specialist for a full work-up rather than relying on lifestyle changes alone if results are abnormal.",
      ],
    },
    topClaims: [
      {
        text: "Smoking is associated with reduced sperm count and motility.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Heat exposure to the testes (saunas, hot tubs, laptops) can temporarily reduce sperm quality.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Testosterone therapy can suppress natural sperm production.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Specific fertility supplements meaningfully raise pregnancy rates on their own.",
        evidenceStatus: "WEAK",
      },
    ],
    commonMyths: [
      {
        myth: "Male fertility issues are rare — it's usually the woman.",
        reality:
          "Male factors contribute to roughly half of infertility cases; a semen analysis is a standard, non-invasive first step for either partner.",
      },
      {
        myth: "If you can get an erection and ejaculate, your fertility is fine.",
        reality:
          "Sperm count, motility, and morphology can't be assessed without a semen analysis — sexual function and fertility are separate things.",
      },
    ],
    takeaways: [
      "Male-factor infertility is common — get tested rather than assuming the issue lies elsewhere.",
      "Heat, smoking, and excess alcohol are the most consistently evidence-backed modifiable risk factors.",
      "Testosterone therapy can suppress fertility — flag this to a doctor if you're trying to conceive.",
      "Lifestyle changes help at the margins; abnormal results need a specialist work-up, not just supplements.",
      "This is a medical topic — a fertility specialist, not video content, should guide treatment decisions.",
    ],
  },
  "prostate-health": {
    beginnerGuide: {
      heading: "Where to start with prostate health",
      steps: [
        "Know your risk factors: age (risk rises sharply after 50), family history, and race are the biggest drivers of prostate cancer risk.",
        "Discuss PSA screening with a doctor starting around age 50 (45 if you have elevated risk factors) — guidelines vary and the benefits and harms should be discussed individually.",
        "Learn to distinguish BPH (benign enlargement, common with age, causes urinary symptoms) from prostate cancer — they are different conditions.",
        "Don't self-diagnose from symptoms alone — urinary symptoms are common and usually not cancer, but should still be evaluated.",
        "Maintain general cardiovascular and metabolic health — obesity and poor metabolic health are associated with worse prostate outcomes.",
      ],
    },
    topClaims: [
      {
        text: "PSA screening can detect prostate cancer before symptoms appear.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "PSA screening has both benefits (early detection) and harms (overdiagnosis, unnecessary biopsies).",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "BPH (benign prostatic hyperplasia) increases prostate cancer risk.",
        evidenceStatus: "UNSUPPORTED",
      },
      {
        text: "Specific supplements (e.g. saw palmetto) meaningfully treat BPH or reduce cancer risk.",
        evidenceStatus: "WEAK",
      },
    ],
    commonMyths: [
      {
        myth: "An enlarged prostate (BPH) means you have or will get prostate cancer.",
        reality:
          "BPH and prostate cancer are distinct conditions with different mechanisms; having one does not mean you have the other.",
      },
      {
        myth: "No symptoms means no problem.",
        reality:
          "Early-stage prostate cancer is frequently asymptomatic, which is the entire rationale for age-appropriate screening conversations with a doctor.",
      },
    ],
    takeaways: [
      "Prostate cancer risk rises significantly with age — know when to start screening conversations with a doctor.",
      "BPH and prostate cancer are different conditions and should not be conflated.",
      "PSA screening has real trade-offs (overdiagnosis risk) worth discussing individually with a physician.",
      "Urinary symptoms are common and usually benign, but still warrant a medical evaluation.",
      "This is a screening and diagnosis topic — decisions belong with a urologist, not self-assessment.",
    ],
  },
  "erectile-dysfunction": {
    beginnerGuide: {
      heading: "Where to start with erectile dysfunction",
      steps: [
        "Understand it's common and usually has an identifiable cause — ED affects a large share of men at some point and often signals an underlying issue worth investigating.",
        "Cardiovascular health is closely linked to erectile function — ED can be an early warning sign of broader vascular disease, sometimes preceding a heart problem by years.",
        "Review contributing factors with a doctor: smoking, poor sleep, obesity, diabetes, high blood pressure, certain medications, and psychological factors all play a role.",
        "PDE5 inhibitors (sildenafil, tadalafil, and similar) are effective, prescription-only treatments — never source these outside a licensed pharmacy.",
        "Don't ignore persistent ED as 'just stress' long-term — it deserves a proper medical work-up given its link to cardiovascular risk.",
      ],
    },
    topClaims: [
      {
        text: "Erectile dysfunction can be an early warning sign of cardiovascular disease.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "PDE5 inhibitors (sildenafil, tadalafil) are effective treatments for most men with ED.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Psychological factors (stress, anxiety) can cause or worsen ED independent of physical causes.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Herbal 'natural Viagra' supplements are a safe, effective substitute for prescription treatment.",
        evidenceStatus: "UNSUPPORTED",
      },
    ],
    commonMyths: [
      {
        myth: "ED is just a normal, meaningless part of getting older.",
        reality:
          "While prevalence rises with age, ED is frequently linked to treatable underlying causes (vascular, hormonal, psychological) and shouldn't be dismissed without evaluation.",
      },
      {
        myth: "Only older men get ED.",
        reality:
          "ED occurs in younger men too, often linked to psychological factors, performance anxiety, smoking, or cardiovascular risk factors rather than age alone.",
      },
    ],
    takeaways: [
      "ED can be an early signal of cardiovascular disease — persistent ED warrants a medical check-up, not just a prescription request.",
      "Prescription PDE5 inhibitors are effective and should only be sourced through a licensed doctor or pharmacy.",
      "Both physical and psychological factors contribute, often together.",
      "Unregulated 'natural' ED supplements carry both efficacy and safety concerns.",
      "This is a medical topic best addressed with a doctor rather than self-treatment.",
    ],
  },
  biohacking: {
    beginnerGuide: {
      heading: "Where to start with biohacking",
      steps: [
        "Get the fundamentals right first — sleep, exercise, and nutrition outperform nearly every biohacking intervention in the evidence base.",
        "Pick one variable at a time to test (e.g. cold exposure, a supplement) so you can actually tell if it's working.",
        "Use objective tracking (wearables, blood work) rather than subjective feel alone to evaluate whether an intervention is doing anything.",
        "Be skeptical of expensive interventions with thin evidence — cost and marketing intensity are not proxies for effectiveness.",
        "Talk to a doctor before combining supplements, fasting protocols, or extreme temperature exposure with any existing health condition or medication.",
      ],
    },
    topClaims: [
      {
        text: "Cold exposure (cold showers, ice baths) has some evidence for mood and recovery, but not for fat loss or testosterone.",
        evidenceStatus: "MIXED",
      },
      {
        text: "Zone 2 training and VO2 max improvements have strong longevity evidence — arguably more than most 'biohacks.'",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Time-restricted eating produces fat loss beyond what a matched calorie deficit would produce.",
        evidenceStatus: "UNSUPPORTED",
      },
      {
        text: "Continuous glucose monitors provide meaningful benefit for non-diabetic, metabolically healthy people.",
        evidenceStatus: "WEAK",
      },
    ],
    commonMyths: [
      {
        myth: "More expensive or exotic protocols are automatically more effective.",
        reality:
          "The best-evidenced interventions (sleep, resistance training, aerobic fitness, protein intake) are largely free; many premium biohacks have thin or no human evidence.",
      },
      {
        myth: "If a wearable measures it, the metric is clinically meaningful.",
        reality:
          "Consumer wearables vary widely in accuracy, and many derived scores (e.g. proprietary 'readiness' scores) aren't independently validated.",
      },
    ],
    takeaways: [
      "The best-evidenced 'biohacks' are unglamorous: sleep, resistance training, aerobic fitness, and protein intake.",
      "Self-experimentation is more useful when you isolate one variable and track it objectively.",
      "Novelty and price are not evidence — check for actual human trials before adopting an expensive protocol.",
      "Combining multiple interventions at once makes it hard to know what's actually working.",
      "Extreme protocols (prolonged fasting, extreme cold or heat) carry real risks and warrant medical input if you have an underlying condition.",
    ],
  },
  supplements: {
    beginnerGuide: {
      heading: "Where to start with supplements",
      steps: [
        "Fix diet, sleep, and training first — supplements have a small effect relative to these fundamentals and can't compensate for getting them wrong.",
        "Learn which few supplements have strong evidence for most men: creatine monohydrate, vitamin D (if deficient), and protein powder top the list.",
        "Check for third-party testing (e.g. NSF Certified for Sport, Informed Sport) — supplement manufacturing is far less regulated than medication.",
        "Get blood work before supplementing for a specific deficiency (vitamin D, iron, B12) rather than guessing.",
        "Talk to a doctor or pharmacist before combining supplements with prescription medication — interactions are more common than most people expect.",
      ],
    },
    topClaims: [
      {
        text: "Creatine monohydrate is one of the most well-evidenced supplements for strength and lean mass.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Vitamin D supplementation helps primarily in people who are actually deficient.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Most testosterone-boosting supplements produce a clinically meaningful increase in testosterone.",
        evidenceStatus: "UNSUPPORTED",
      },
      {
        text: "Supplement quality and label accuracy vary significantly between brands.",
        evidenceStatus: "SUPPORTED",
      },
    ],
    commonMyths: [
      {
        myth: "Natural supplements are automatically safe because they're not synthetic drugs.",
        reality:
          "'Natural' does not mean risk-free — some supplements interact with medications or carry their own side effects, and dosing is far less standardised than pharmaceuticals.",
      },
      {
        myth: "If a supplement is legal and sold widely, its claims must be backed by evidence.",
        reality:
          "Supplement regulation in most countries doesn't require proof of efficacy before sale — legality and evidence are not the same thing.",
      },
    ],
    takeaways: [
      "Only a small handful of supplements (creatine, vitamin D if deficient, protein powder) have strong, consistent evidence for most men.",
      "Most 'testosterone booster' and proprietary blend products lack robust human evidence.",
      "Third-party testing matters more in supplements than in almost any other product category, given weak regulation.",
      "Blood work should guide supplementation for deficiencies, not assumption.",
      "Always check for medication interactions with a doctor or pharmacist before starting a new supplement.",
    ],
  },
  "mens-health": {
    beginnerGuide: {
      heading: "Where to start with men's health basics",
      steps: [
        "Get baseline numbers: blood pressure, resting heart rate, waist circumference, and basic blood work (lipids, fasting glucose) give you a real starting point.",
        "Build the four foundational habits first — sleep, resistance and aerobic exercise, protein-forward nutrition, and stress management — before chasing any single 'hack.'",
        "Schedule an annual check-up even when you feel fine — many of the biggest risks are symptomless until advanced.",
        "Know your family history — it shapes screening timelines for heart disease, cancer, and other conditions more than almost any other single factor.",
        "Treat health content, including this site, as a starting point for questions to bring to a doctor, not a replacement for one.",
      ],
    },
    topClaims: [
      {
        text: "Regular preventive check-ups catch treatable conditions earlier than waiting for symptoms.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Men see doctors less often than women and are diagnosed later for many conditions as a result.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Grip strength and VO2 max are useful, low-cost proxies for overall health risk.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "A single supplement or biohack can substitute for the core fundamentals of sleep, exercise, and nutrition.",
        evidenceStatus: "UNSUPPORTED",
      },
    ],
    commonMyths: [
      {
        myth: "If I feel fine, I don't need check-ups.",
        reality:
          "Hypertension, high cholesterol, and early-stage cancers are frequently symptomless; regular screening is how they're caught early, when treatment works best.",
      },
      {
        myth: "Health optimisation requires expensive gadgets or programmes.",
        reality:
          "The largest, best-evidenced gains come from sleep, consistent exercise, and reasonable nutrition — all achievable without significant spending.",
      },
    ],
    takeaways: [
      "Sleep, exercise, nutrition, and stress management are the foundation everything else sits on top of.",
      "Men underuse preventive care relative to women, and it shows up in later diagnoses.",
      "Track a few simple objective markers (blood pressure, waist circumference, basic blood work) rather than relying on how you feel.",
      "Family history should shape your personal screening timeline.",
      "Use evidence-aware content like this to ask better questions at your next check-up, not to self-diagnose or self-treat.",
    ],
  },
};

export function getTopicContent(slug: string): TopicContent | null {
  return TOPIC_CONTENT[slug] ?? null;
}
