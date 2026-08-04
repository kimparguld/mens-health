// Static glossary of hype/scam-spotting terms. Definitional only — helps
// readers evaluate marketing claims across products, courses, side hustles,
// investment apps, and giveaways regardless of a specific verdict.

export type GlossaryTerm = {
  slug: string;
  term: string;
  shortDefinition: string;
  longDefinition: string;
  relatedTopicSlugs: string[];
};

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    slug: "mlm",
    term: "MLM (Multi-Level Marketing)",
    shortDefinition:
      "A sales structure where participants earn from both their own sales and the sales of people they recruit.",
    longDefinition:
      "Multi-level marketing is a business model where distributors earn commission on personal product sales plus a cut of sales made by people they recruit into their 'downline.' Some MLMs sell legitimate products, but the recruitment-heavy compensation structure is the same one used by illegal pyramid schemes, and the vast majority of participants earn little or lose money once startup costs and inventory purchases are counted.",
    relatedTopicSlugs: ["side-hustles", "online-courses"],
  },
  {
    slug: "pyramid-scheme",
    term: "Pyramid Scheme",
    shortDefinition:
      "An illegal scheme where returns come from recruiting new participants rather than selling a real product.",
    longDefinition:
      "A pyramid scheme pays existing members primarily for recruiting new members rather than for selling goods or services to outside customers. Because payouts depend entirely on an ever-growing base of new recruits, the structure mathematically collapses once recruitment slows — leaving the majority of later participants with a loss. Regulators treat 'no real product' or 'product exists mainly to justify recruitment payouts' as the key red flag.",
    relatedTopicSlugs: ["side-hustles", "investment-apps"],
  },
  {
    slug: "ponzi-scheme",
    term: "Ponzi Scheme",
    shortDefinition:
      "An investment fraud that pays early investors with money from new investors, not real profits.",
    longDefinition:
      "A Ponzi scheme generates the appearance of steady returns by paying earlier investors with capital collected from newer investors, rather than from any genuine underlying investment activity. It requires a constantly growing pool of new money to survive and inevitably collapses when withdrawals outpace new deposits. Consistently smooth, above-market returns regardless of market conditions are a classic warning sign.",
    relatedTopicSlugs: ["investment-apps", "giveaways"],
  },
  {
    slug: "dropshipping",
    term: "Dropshipping",
    shortDefinition:
      "An e-commerce model where the seller never holds inventory — a third party ships directly to the customer.",
    longDefinition:
      "Dropshipping is a retail fulfillment method where a store owner lists products they never physically stock; when a customer orders, the seller purchases the item from a third-party supplier who ships it directly to the buyer. It lowers the barrier to starting an online store, but thin margins, long shipping times from overseas suppliers, and heavy paid-ad dependence mean most dropshipping side hustles fail to become reliably profitable.",
    relatedTopicSlugs: ["side-hustles", "viral-products"],
  },
  {
    slug: "chargeback",
    term: "Chargeback",
    shortDefinition:
      "A forced reversal of a card payment, initiated through the buyer's bank rather than the seller.",
    longDefinition:
      "A chargeback happens when a cardholder disputes a transaction directly with their bank or card network — for reasons like non-delivery, a counterfeit item, or fraud — and the funds are pulled back from the merchant, sometimes with an added fee. Chargebacks are a stronger protection than a marketplace's internal refund policy because the bank, not the seller, makes the final call, which is why paying by card (not wire transfer or gift card) matters when buying from an unfamiliar seller.",
    relatedTopicSlugs: ["marketplaces", "viral-products"],
  },
  {
    slug: "escrow",
    term: "Escrow",
    shortDefinition:
      "A neutral third party that holds payment until both sides of a transaction fulfill their obligations.",
    longDefinition:
      "Escrow is an arrangement where a trusted third party holds funds (or assets) until agreed-upon conditions are met, then releases payment to the seller and goods or confirmation to the buyer. Legitimate marketplaces and larger investment platforms often use built-in escrow-like holds to protect both sides; a deal that insists on skipping escrow and paying the seller directly and immediately is a common scam pattern.",
    relatedTopicSlugs: ["marketplaces", "investment-apps"],
  },
  {
    slug: "astroturfing",
    term: "Astroturfing",
    shortDefinition:
      "Fake grassroots enthusiasm — paid or coordinated promotion designed to look like organic buzz.",
    longDefinition:
      "Astroturfing is the practice of manufacturing the appearance of widespread, independent public enthusiasm for a product or claim, when the activity is actually paid, coordinated, or run by a small number of accounts. It shows up as waves of near-identical reviews, comment sections flooded with suspiciously similar praise, or 'random' creators all posting about the same product within days of each other after receiving free units or payment.",
    relatedTopicSlugs: ["viral-products", "ai-tools"],
  },
  {
    slug: "survivorship-bias",
    term: "Survivorship Bias",
    shortDefinition:
      "Judging an opportunity only by the visible winners, ignoring the much larger number of people who failed quietly.",
    longDefinition:
      "Survivorship bias is the error of drawing conclusions from a highly visible subset of successes while overlooking the failures that never made it into the sample — because they dropped out, stayed quiet, or simply weren't promoted. A course or app that showcases six-figure student results is displaying survivors; without knowing what percentage of all students achieved similar outcomes, the testimonials tell you almost nothing about typical results.",
    relatedTopicSlugs: ["online-courses", "investment-apps"],
  },
  {
    slug: "affiliate-disclosure",
    term: "Affiliate Disclosure",
    shortDefinition:
      "A required statement that a reviewer earns commission if you buy through their link.",
    longDefinition:
      "An affiliate disclosure is a notice — required by regulators like the FTC in the US — informing readers or viewers that the creator earns a commission or other compensation if they purchase through a provided link or code. Its presence doesn't make a review dishonest, but its absence on a review that clearly benefits from a sale is a red flag, and the strength of a recommendation should be weighed against the reviewer's financial incentive to be positive.",
    relatedTopicSlugs: ["ai-tools", "viral-products"],
  },
  {
    slug: "advance-fee-scam",
    term: "Advance-Fee Scam",
    shortDefinition:
      "A scam that asks for an upfront payment to unlock a much larger promised reward that never arrives.",
    longDefinition:
      "An advance-fee scam convinces a target to pay a smaller fee upfront — framed as a tax, processing charge, shipping cost, or 'insurance' — in order to receive a much larger prize, loan, job, or payout that is subsequently never delivered. It's the core mechanic behind most fake lottery and sweepstakes wins and many fraudulent remote job offers, and the giveaway is simple: no legitimate prize, employer, or lender ever requires payment before you receive what was promised.",
    relatedTopicSlugs: ["giveaways", "remote-jobs"],
  },
  {
    slug: "sponsored-content",
    term: "Sponsored Content",
    shortDefinition:
      "Content a brand paid a creator to make, distinct from the creator's independent editorial opinion.",
    longDefinition:
      "Sponsored content is any video, post, or article a brand has paid a creator to produce, typically requiring specific talking points or a guaranteed positive framing as a condition of payment. It differs from an affiliate link (paid only on resulting sales) in that the creator is paid regardless of outcome, which can further separate the content from the creator's genuine opinion — disclosure requirements exist precisely because sponsorship changes the incentive to be candid.",
    relatedTopicSlugs: ["viral-products", "ai-tools"],
  },
  {
    slug: "guaranteed-return-claim",
    term: "Guaranteed-Return Claim",
    shortDefinition:
      "Any promise of a fixed or guaranteed investment profit — a near-universal marker of investment fraud.",
    longDefinition:
      "A guaranteed-return claim promises a fixed, predictable profit on an investment regardless of market conditions. Legitimate investments carry risk that fluctuates with markets, so any product or platform promising a guaranteed percentage return — especially a high one — is either misrepresenting risk or is outright fraudulent; regulators consistently flag this specific language as one of the strongest single predictors of investment scams.",
    relatedTopicSlugs: ["investment-apps", "giveaways"],
  },
  {
    slug: "fomo-urgency-marketing",
    term: "FOMO / Urgency Marketing",
    shortDefinition:
      "Sales tactics that manufacture time pressure to push a decision before the buyer can think it through.",
    longDefinition:
      "FOMO (fear of missing out) and urgency marketing use countdown timers, 'only X spots left,' or 'price goes up at midnight' messaging to compress the decision window and discourage comparison shopping or research. Some scarcity is genuine, but artificially generated or recurring 'limited-time' offers that reset every few days are a well-documented pressure tactic designed to short-circuit the skepticism a buyer would otherwise apply.",
    relatedTopicSlugs: ["viral-products", "online-courses"],
  },
  {
    slug: "social-proof-manipulation",
    term: "Social Proof Manipulation",
    shortDefinition:
      "Artificially inflating the appearance of popularity or trust — fake reviews, bought followers, staged testimonials.",
    longDefinition:
      "Social proof manipulation is the deliberate inflation of signals that make a product, course, or app look more popular or trusted than it actually is — purchased followers, incentivized five-star reviews, screenshots of cherry-picked results, or paid testimonials presented as unsolicited praise. Because people naturally use others' behavior as a shortcut for judging quality, manipulated social proof is one of the most effective and common levers used in hype marketing.",
    relatedTopicSlugs: ["online-courses", "viral-products"],
  },
  {
    slug: "refund-policy-red-flags",
    term: "Refund Policy Red Flags",
    shortDefinition:
      "Warning signs in how a seller structures returns and refunds that make getting your money back unusually hard.",
    longDefinition:
      "Refund policy red flags include vague or contradictory return windows, restocking fees that exceed a reasonable percentage of the item's price, requirements to return items to an overseas address at the buyer's expense, 'store credit only' clauses buried in fine print, or a policy that only becomes visible after checkout. A legitimate seller's refund terms are easy to find, specific, and don't rely on making the process so costly or slow that most buyers give up.",
    relatedTopicSlugs: ["marketplaces", "online-courses"],
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
