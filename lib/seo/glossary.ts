// Static glossary of men's health terms. Definitional only — no dosing or
// treatment instructions — to keep every entry safely educational regardless
// of topic risk level.

export type GlossaryTerm = {
  slug: string;
  term: string;
  shortDefinition: string;
  longDefinition: string;
  relatedTopicSlugs: string[];
};

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    slug: "testosterone",
    term: "Testosterone",
    shortDefinition:
      "The primary male sex hormone, produced mainly in the testes.",
    longDefinition:
      "Testosterone is the primary androgen hormone in men, produced mainly in the testes. It drives muscle mass, bone density, libido, and mood, and gradually declines with age — roughly 1% per year after 30. Levels are measured with a blood test, ideally in the morning while fasted.",
    relatedTopicSlugs: ["testosterone"],
  },
  {
    slug: "trt",
    term: "TRT (Testosterone Replacement Therapy)",
    shortDefinition:
      "A prescription medical treatment for clinically diagnosed low testosterone.",
    longDefinition:
      "TRT is a prescription treatment that replaces testosterone in men with clinically diagnosed hypogonadism, confirmed through blood testing and symptom assessment. It requires ongoing medical supervision to monitor efficacy and side effects such as elevated red blood cell counts and reduced fertility.",
    relatedTopicSlugs: ["testosterone", "fertility"],
  },
  {
    slug: "hypogonadism",
    term: "Hypogonadism",
    shortDefinition:
      "A clinical condition where the body produces abnormally low testosterone.",
    longDefinition:
      "Hypogonadism is a medical diagnosis, not just a low number on a lab report — it combines low blood testosterone with associated symptoms (fatigue, low libido, reduced muscle mass). It's confirmed through repeated blood testing and clinical evaluation, and is the standard threshold doctors use before considering TRT.",
    relatedTopicSlugs: ["testosterone", "fertility"],
  },
  {
    slug: "dht",
    term: "DHT (Dihydrotestosterone)",
    shortDefinition:
      "A potent androgen derived from testosterone, linked to hair follicle miniaturization.",
    longDefinition:
      "DHT is a hormone converted from testosterone by the enzyme 5-alpha reductase. It plays a role in male development but is also the primary driver of androgenetic (pattern) hair loss in genetically susceptible follicles, which is why DHT-blocking medications are a common treatment approach.",
    relatedTopicSlugs: ["hair-loss", "testosterone"],
  },
  {
    slug: "finasteride",
    term: "Finasteride",
    shortDefinition:
      "A prescription medication that reduces DHT to slow male pattern hair loss.",
    longDefinition:
      "Finasteride is an oral prescription medication that blocks the enzyme converting testosterone to DHT, reducing scalp DHT levels and slowing or partially reversing androgenetic hair loss in many users. It carries a real, if uncommon, risk of sexual side effects and should be prescribed and monitored by a doctor.",
    relatedTopicSlugs: ["hair-loss"],
  },
  {
    slug: "minoxidil",
    term: "Minoxidil",
    shortDefinition:
      "A topical treatment that stimulates hair regrowth by improving follicle blood flow.",
    longDefinition:
      "Minoxidil is an over-the-counter topical treatment applied to the scalp. Its exact mechanism isn't fully understood, but it's thought to prolong the hair growth cycle and improve blood flow to follicles. Visible results typically take 3–6 months of consistent use.",
    relatedTopicSlugs: ["hair-loss"],
  },
  {
    slug: "psa",
    term: "PSA (Prostate-Specific Antigen)",
    shortDefinition:
      "A blood marker used to screen for prostate conditions, including cancer.",
    longDefinition:
      "PSA is a protein produced by the prostate; elevated blood levels can indicate prostate cancer, BPH, or inflammation. PSA screening has real trade-offs — it can catch cancer early, but can also lead to overdiagnosis and unnecessary biopsies — which is why guidelines recommend an individualized discussion with a doctor rather than blanket screening.",
    relatedTopicSlugs: ["prostate-health"],
  },
  {
    slug: "bph",
    term: "BPH (Benign Prostatic Hyperplasia)",
    shortDefinition:
      "Non-cancerous enlargement of the prostate, common with age.",
    longDefinition:
      "BPH is a non-cancerous enlargement of the prostate gland that becomes increasingly common as men age, often causing urinary symptoms like frequent urination or a weak stream. It is a distinct condition from prostate cancer and does not itself increase cancer risk.",
    relatedTopicSlugs: ["prostate-health"],
  },
  {
    slug: "vo2-max",
    term: "VO2 Max",
    shortDefinition:
      "A measure of the maximum rate of oxygen your body can use during exercise.",
    longDefinition:
      "VO2 max measures the maximum volume of oxygen your body can use per minute during intense exercise, and is one of the strongest single predictors of cardiovascular fitness and all-cause mortality risk. It's trainable at any age through consistent aerobic exercise.",
    relatedTopicSlugs: ["longevity", "fitness-over-40"],
  },
  {
    slug: "zone-2-training",
    term: "Zone 2 Training",
    shortDefinition:
      "Low-intensity aerobic exercise performed at a conversational pace.",
    longDefinition:
      "Zone 2 training is aerobic exercise performed at roughly 60–70% of maximum heart rate — intense enough to build a training effect, but slow enough to hold a conversation. It's associated with improved mitochondrial function and is a cornerstone of most evidence-based longevity protocols.",
    relatedTopicSlugs: ["longevity", "biohacking"],
  },
  {
    slug: "progressive-overload",
    term: "Progressive Overload",
    shortDefinition:
      "Gradually increasing training demands over time to keep driving adaptation.",
    longDefinition:
      "Progressive overload is the principle of gradually increasing the weight, reps, or volume of a training program over time. It's the fundamental mechanical driver behind continued strength and muscle gains — without it, training plateaus regardless of program quality.",
    relatedTopicSlugs: ["muscle-gain", "fitness-over-40"],
  },
  {
    slug: "hypertrophy",
    term: "Hypertrophy",
    shortDefinition: "The growth and increase in size of muscle cells.",
    longDefinition:
      "Hypertrophy refers to an increase in muscle fiber size, primarily driven by resistance training combined with adequate protein intake and recovery. It's the physiological process behind visible muscle growth over weeks and months of consistent training.",
    relatedTopicSlugs: ["muscle-gain"],
  },
  {
    slug: "creatine-monohydrate",
    term: "Creatine Monohydrate",
    shortDefinition:
      "A well-studied supplement that increases short-term energy availability in muscle.",
    longDefinition:
      "Creatine monohydrate is one of the most extensively studied sports supplements, shown to increase strength, lean mass, and high-intensity exercise performance by boosting phosphocreatine stores in muscle. It has a strong safety record at commonly studied doses.",
    relatedTopicSlugs: ["supplements", "muscle-gain"],
  },
  {
    slug: "muscle-protein-synthesis",
    term: "Muscle Protein Synthesis",
    shortDefinition:
      "The biological process of building new muscle protein, driven by protein intake and training.",
    longDefinition:
      "Muscle protein synthesis (MPS) is the process by which the body builds new muscle protein, stimulated by resistance training and dietary protein — particularly leucine-rich sources. Total daily protein intake matters more for MPS than precise meal timing.",
    relatedTopicSlugs: ["nutrition", "muscle-gain"],
  },
  {
    slug: "circadian-rhythm",
    term: "Circadian Rhythm",
    shortDefinition:
      "The body's internal ~24-hour clock that regulates sleep, hormones, and metabolism.",
    longDefinition:
      "The circadian rhythm is an internal biological clock, roughly 24 hours long, that regulates sleep-wake timing, hormone release (including testosterone and cortisol), and metabolism. It's primarily synchronized by light exposure, which is why consistent sleep/wake timing and morning light are core sleep-hygiene recommendations.",
    relatedTopicSlugs: ["sleep"],
  },
  {
    slug: "melatonin",
    term: "Melatonin",
    shortDefinition:
      "A hormone that signals to the body that it's time to sleep.",
    longDefinition:
      "Melatonin is a hormone released by the pineal gland in response to darkness, signaling to the body that it's time to sleep. Low-dose supplemental melatonin (0.5–1mg) has evidence for shifting sleep timing; higher doses aren't consistently shown to improve sleep quality further.",
    relatedTopicSlugs: ["sleep", "supplements"],
  },
  {
    slug: "cortisol",
    term: "Cortisol",
    shortDefinition: "The body's primary stress hormone.",
    longDefinition:
      "Cortisol is a steroid hormone released by the adrenal glands in response to stress, following its own daily rhythm (highest in the morning). Chronically elevated cortisol from poor sleep or unmanaged stress is linked to reduced testosterone, impaired recovery, and worse metabolic health.",
    relatedTopicSlugs: ["mental-health", "sleep", "testosterone"],
  },
  {
    slug: "pde5-inhibitor",
    term: "PDE5 Inhibitor",
    shortDefinition:
      "A class of prescription medication used to treat erectile dysfunction.",
    longDefinition:
      "PDE5 inhibitors (such as sildenafil and tadalafil) are a class of prescription medications that increase blood flow to the penis by blocking an enzyme that regulates blood vessel dilation. They're the first-line, most evidence-backed medical treatment for erectile dysfunction and should only be obtained through a licensed doctor or pharmacy.",
    relatedTopicSlugs: ["erectile-dysfunction"],
  },
  {
    slug: "erectile-dysfunction-term",
    term: "Erectile Dysfunction (ED)",
    shortDefinition:
      "The persistent inability to achieve or maintain an erection sufficient for sexual activity.",
    longDefinition:
      "Erectile dysfunction is the persistent inability to get or keep an erection firm enough for satisfactory sexual activity. It can stem from vascular, hormonal, neurological, or psychological causes — often more than one at once — and can be an early warning sign of cardiovascular disease.",
    relatedTopicSlugs: ["erectile-dysfunction"],
  },
  {
    slug: "semen-analysis",
    term: "Semen Analysis",
    shortDefinition:
      "A lab test measuring sperm count, motility, and morphology.",
    longDefinition:
      "A semen analysis is a laboratory test that measures sperm count, motility (movement), and morphology (shape) — the standard first diagnostic step for evaluating male fertility. It's non-invasive and typically the first test ordered when a couple has difficulty conceiving.",
    relatedTopicSlugs: ["fertility"],
  },
  {
    slug: "hba1c",
    term: "HbA1c",
    shortDefinition:
      "A blood test reflecting average blood sugar levels over roughly three months.",
    longDefinition:
      "HbA1c measures the percentage of hemoglobin coated with sugar, reflecting average blood glucose levels over the preceding two to three months. It's a standard test for diagnosing and monitoring prediabetes and type 2 diabetes, and a common component of preventive blood work panels.",
    relatedTopicSlugs: ["longevity", "mens-health"],
  },
  {
    slug: "hscrp",
    term: "hsCRP (High-Sensitivity C-Reactive Protein)",
    shortDefinition:
      "A blood marker of low-grade inflammation, linked to cardiovascular risk.",
    longDefinition:
      "hsCRP is a highly sensitive blood test for C-reactive protein, a marker of low-grade systemic inflammation. Elevated levels are associated with increased cardiovascular risk, which is why it's sometimes included in preventive blood panels alongside standard lipid testing.",
    relatedTopicSlugs: ["longevity", "mens-health"],
  },
  {
    slug: "resistance-training",
    term: "Resistance Training",
    shortDefinition:
      "Exercise that works muscles against an external force, such as weights.",
    longDefinition:
      "Resistance training (also called strength or weight training) involves working muscles against an external resistance — free weights, machines, or bodyweight — to build strength and muscle mass. It's consistently linked to better metabolic health, bone density, and longevity outcomes at any age.",
    relatedTopicSlugs: ["muscle-gain", "fitness-over-40"],
  },
  {
    slug: "calorie-deficit",
    term: "Calorie Deficit",
    shortDefinition:
      "Consuming fewer calories than the body expends, required for fat loss.",
    longDefinition:
      "A calorie deficit occurs when energy intake from food is lower than total energy expenditure, forcing the body to draw on stored energy (primarily fat) to make up the difference. It is the underlying mechanism behind essentially every effective fat-loss approach, regardless of specific diet style.",
    relatedTopicSlugs: ["weight-loss"],
  },
  {
    slug: "body-recomposition",
    term: "Body Recomposition",
    shortDefinition:
      "Simultaneously losing fat and gaining muscle.",
    longDefinition:
      "Body recomposition refers to losing fat mass while gaining or maintaining muscle mass at the same time, rather than the traditional sequential 'bulk then cut' approach. It's most achievable for beginners, those returning to training after a break, or people at a modest calorie deficit with high protein intake.",
    relatedTopicSlugs: ["weight-loss", "muscle-gain"],
  },
  {
    slug: "androgenetic-alopecia",
    term: "Androgenetic Alopecia",
    shortDefinition: "The clinical term for male (and female) pattern hair loss.",
    longDefinition:
      "Androgenetic alopecia is the clinical name for pattern hair loss, driven by a genetic sensitivity of scalp hair follicles to DHT. In men it typically presents as a receding hairline and thinning crown, and is the most common cause of hair loss in adult men.",
    relatedTopicSlugs: ["hair-loss"],
  },
  {
    slug: "intermittent-fasting",
    term: "Intermittent Fasting",
    shortDefinition:
      "An eating pattern that cycles between periods of eating and fasting.",
    longDefinition:
      "Intermittent fasting is an eating pattern that restricts food intake to a defined window (e.g. 8 hours) rather than restricting specific foods. Evidence suggests it produces fat loss comparable to any other approach at a matched calorie deficit, rather than offering a unique metabolic advantage.",
    relatedTopicSlugs: ["weight-loss", "biohacking"],
  },
  {
    slug: "evidence-based",
    term: "Evidence-Based",
    shortDefinition:
      "A claim or practice supported by rigorous scientific research, not just tradition or anecdote.",
    longDefinition:
      "'Evidence-based' describes a claim or recommendation supported by rigorous scientific research — ideally randomized controlled trials and systematic reviews — rather than tradition, anecdote, or marketing. On this site, every claim is rated against the strength of its supporting evidence, from strongly supported to unsupported.",
    relatedTopicSlugs: ["mens-health"],
  },
];

export function getGlossaryTerm(slug: string): GlossaryTerm | null {
  return GLOSSARY_TERMS.find((t) => t.slug === slug) ?? null;
}

export function getGlossaryTermsForTopics(
  topicSlugs: string[],
  limit = 5,
): GlossaryTerm[] {
  return GLOSSARY_TERMS.filter((t) =>
    t.relatedTopicSlugs.some((s) => topicSlugs.includes(s)),
  ).slice(0, limit);
}
