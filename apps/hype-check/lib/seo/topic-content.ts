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
  "ai-tools": {
    beginnerGuide: {
      heading: "Where to start evaluating an AI tool",
      steps: [
        "Test the free tier or trial with your own real use case, not the vendor's demo prompt.",
        "Check what model or API the tool is actually built on, and compare its pricing to using that API directly.",
        "Look for independent reviews on forums like Reddit or Product Hunt, not just testimonials on the vendor's own site.",
        "Check the cancellation flow before entering a card, and read what happens to your data if you cancel.",
        "Verify any claimed user counts or integrations against a source outside the company's own marketing.",
      ],
    },
    topClaims: [
      {
        text: "This tool is used by over a million businesses.",
        evidenceStatus: "MIXED",
      },
      {
        text: "Our AI-powered analysis outperforms human experts.",
        evidenceStatus: "WEAK",
      },
      {
        text: "Cancel anytime, no commitment required.",
        evidenceStatus: "MIXED",
      },
      {
        text: "Built on the latest publicly available AI models.",
        evidenceStatus: "SUPPORTED",
      },
    ],
    commonMyths: [
      {
        myth: "More expensive AI tools are always more accurate.",
        reality:
          "Price often reflects marketing spend and UI polish more than underlying model quality — many premium tools use the same base models as free alternatives with a markup added.",
      },
      {
        myth: "A tool with 'AI' in the name must be doing something sophisticated.",
        reality:
          "Some tools are a thin interface wrapped around a single off-the-shelf API call, adding little beyond a prompt template and a price increase.",
      },
    ],
    takeaways: [
      "Test with your own real use case before subscribing, not the vendor's cherry-picked demo.",
      "Compare pricing to the cost of using the underlying API directly where possible.",
      "Independent reviews on neutral platforms are more reliable than on-site testimonials.",
      "Check cancellation and data-export terms before entering payment details.",
    ],
  },
  "side-hustles": {
    beginnerGuide: {
      heading: "Where to start evaluating a side hustle pitch",
      steps: [
        "Separate the income claim from the actual business model — ask specifically how the money is made.",
        "Check whether income comes primarily from selling to real customers, or from recruiting others into the same opportunity.",
        "Calculate realistic costs (inventory, ads, platform fees, time) against the claimed revenue, not just gross sales screenshots.",
        "Search the hustle's name plus 'review' or 'reddit' for independent, unsponsored accounts.",
        "Start small before committing to bulk inventory or a paid 'starter kit.'",
      ],
    },
    topClaims: [
      {
        text: "You can make significant income per month with zero experience.",
        evidenceStatus: "UNSUPPORTED",
      },
      {
        text: "Dropshipping requires no upfront inventory investment.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Most people who try this hustle turn a profit within 90 days.",
        evidenceStatus: "WEAK",
      },
      {
        text: "Reselling can be a genuinely profitable side income for some sellers.",
        evidenceStatus: "MIXED",
      },
    ],
    commonMyths: [
      {
        myth: "Passive income side hustles require no ongoing work.",
        reality:
          "Nearly all legitimate side hustles require sustained time investment, especially in the early months building an audience, supplier relationships, or customer base.",
      },
      {
        myth: "Screenshots of revenue prove profitability.",
        reality:
          "Gross revenue screenshots don't show ad spend, returns, platform fees, or cost of goods — net profit is usually a fraction of the displayed number.",
      },
    ],
    takeaways: [
      "Ask exactly how the money is made before evaluating any income claim.",
      "Revenue screenshots are not profit — subtract real costs before judging viability.",
      "Recruitment-based earnings structures resemble MLM or pyramid patterns and warrant extra scrutiny.",
      "Start small and verify with independent reviews before buying inventory or a paid starter kit.",
    ],
  },
  "online-courses": {
    beginnerGuide: {
      heading: "Where to start evaluating a paid course or coaching program",
      steps: [
        "Look for a stated 'typical results' disclosure, not just highlighted success stories.",
        "Check the instructor's own track record independent of the course they're selling.",
        "Read the refund policy in full before purchasing, including any conditions attached to it.",
        "Search the course name plus 'review' on a platform the creator doesn't control.",
        "Compare the price against free or lower-cost resources covering the same fundamentals.",
      ],
    },
    topClaims: [
      {
        text: "Students who complete this course see a specific average income increase.",
        evidenceStatus: "WEAK",
      },
      {
        text: "This program has helped thousands of students.",
        evidenceStatus: "MIXED",
      },
      {
        text: "Lifetime access to course materials.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "You'll master this skill in just 30 days.",
        evidenceStatus: "UNSUPPORTED",
      },
    ],
    commonMyths: [
      {
        myth: "A course's testimonials represent typical outcomes.",
        reality:
          "Testimonials are self-selected by the most successful — and most camera-willing — students, a textbook case of survivorship bias rather than a representative sample.",
      },
      {
        myth: "A high price signals high quality.",
        reality:
          "Course pricing is often set by what the market will bear and how the sales funnel is structured, not by production cost or proven outcomes.",
      },
    ],
    takeaways: [
      "Testimonials show the best outcomes, not the typical outcome — look for aggregate data instead.",
      "Read the refund policy's fine print before buying, not after wanting a refund.",
      "Independent reviews outside the creator's own platform are more reliable than on-page praise.",
      "Compare against free alternatives before paying a premium for the same fundamentals.",
    ],
  },
  "viral-products": {
    beginnerGuide: {
      heading: "Where to start evaluating a viral product",
      steps: [
        "Look past the demo video for independent, unsponsored review videos or write-ups.",
        "Check the return policy and return address before ordering, especially from overseas sellers.",
        "Watch for a cluster of near-identical sponsored posts appearing within days — a common astroturfing pattern.",
        "Read the product's actual spec sheet or materials list, not just the marketing claims.",
        "Wait a few weeks after a product goes viral for a broader base of genuine reviews to accumulate.",
      ],
    },
    topClaims: [
      {
        text: "This product sold out multiple times because of demand.",
        evidenceStatus: "WEAK",
      },
      {
        text: "As seen on social video with millions of views.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Clinically proven results after a single use.",
        evidenceStatus: "UNSUPPORTED",
      },
      {
        text: "Limited-time offer, price increases soon.",
        evidenceStatus: "MIXED",
      },
    ],
    commonMyths: [
      {
        myth: "A product's view count or follower count proves it works.",
        reality:
          "Virality reflects how shareable or visually striking content is, not the underlying product's actual performance or durability.",
      },
      {
        myth: "If lots of creators are posting about it, it must be independently loved.",
        reality:
          "Simultaneous creator posts within a short window are frequently the result of a coordinated paid campaign, not organic enthusiasm.",
      },
    ],
    takeaways: [
      "Seek out unsponsored reviews and let a few weeks of real-world use accumulate before buying.",
      "Check the return policy and address before ordering, particularly from overseas sellers.",
      "A cluster of near-identical promotional posts in a short window suggests paid coordination, not organic buzz.",
      "High view counts measure shareability, not product quality.",
    ],
  },
  marketplaces: {
    beginnerGuide: {
      heading: "Where to start evaluating a marketplace app",
      steps: [
        "Read the fee structure for both buying and selling before listing or purchasing.",
        "Check what buyer and seller protections actually cover, and their claim or dispute windows.",
        "Keep all payment and communication on-platform rather than moving to wire transfer or cash apps.",
        "Check payout timing and any holds placed on seller funds before relying on the app for fast cash.",
        "Look up how the app handles disputes when an item doesn't match its listing.",
      ],
    },
    topClaims: [
      {
        text: "Buyer protection guarantees a full refund on every purchase.",
        evidenceStatus: "MIXED",
      },
      {
        text: "Fees are lower here than on competing platforms.",
        evidenceStatus: "WEAK",
      },
      {
        text: "Sellers get paid instantly after a sale.",
        evidenceStatus: "MIXED",
      },
      {
        text: "A verified seller badge means the seller is trustworthy.",
        evidenceStatus: "WEAK",
      },
    ],
    commonMyths: [
      {
        myth: "Moving a deal off-platform to avoid fees is a harmless way to save money.",
        reality:
          "Off-platform payment forfeits the marketplace's dispute resolution and buyer or seller protections entirely, and is a common scam vector.",
      },
      {
        myth: "A high overall star rating means every transaction is safe.",
        reality:
          "Ratings can be inflated by early reviews or simply not reflect recent seller behavior — check recent, detailed reviews rather than just the aggregate score.",
      },
    ],
    takeaways: [
      "Read fee and protection terms before you need to use them, not after a dispute arises.",
      "Keep transactions on-platform to preserve dispute protections.",
      "Check payout hold times if you're relying on a marketplace for quick cash flow.",
      "Recent, detailed reviews are more informative than an aggregate star rating alone.",
    ],
  },
  "investment-apps": {
    beginnerGuide: {
      heading: "Where to start evaluating an investment or trading app",
      steps: [
        "Verify the platform's registration with the relevant financial regulator before depositing funds.",
        "Read the fee structure in full, including spreads, withdrawal fees, and any inactivity charges.",
        "Be skeptical of any fixed or guaranteed return percentage, especially an unusually high one.",
        "Test withdrawals with a small amount early on to confirm funds actually come back out.",
        "Check independent regulatory warning lists for the platform's name before committing larger sums.",
      ],
    },
    topClaims: [
      {
        text: "Guaranteed monthly returns well above typical market performance.",
        evidenceStatus: "UNSUPPORTED",
      },
      {
        text: "Regulated and licensed in the stated jurisdiction.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "Our proprietary trading algorithm consistently beats the market.",
        evidenceStatus: "WEAK",
      },
      {
        text: "Zero-fee trading with no hidden costs.",
        evidenceStatus: "MIXED",
      },
    ],
    commonMyths: [
      {
        myth: "A guaranteed return just means the platform is very good at investing.",
        reality:
          "All real investments carry risk that varies with markets; a guaranteed fixed return is one of the strongest known predictors of investment fraud.",
      },
      {
        myth: "A professional-looking app or website proves legitimacy.",
        reality:
          "Building a polished app is inexpensive and easy to fake — regulatory registration, not design quality, is the meaningful signal of legitimacy.",
      },
    ],
    takeaways: [
      "Confirm regulatory registration before depositing any funds.",
      "Treat any guaranteed or fixed return claim as a major red flag.",
      "Test a small withdrawal early to confirm the platform actually pays out.",
      "App polish is not evidence of legitimacy — check independent regulatory sources.",
    ],
  },
  giveaways: {
    beginnerGuide: {
      heading: "Where to start evaluating a giveaway or sweepstakes",
      steps: [
        "Confirm the giveaway is posted through the brand's official, verified channel.",
        "Remember that a legitimate prize never requires payment of a fee, tax, or shipping cost to be released.",
        "Search the giveaway's name plus 'scam' before entering any personal information.",
        "Be cautious of any giveaway requiring bank details, card numbers, or a wire transfer.",
        "Check how winners are announced — a legitimate giveaway typically has public, verifiable winner selection.",
      ],
    },
    topClaims: [
      {
        text: "You've been randomly selected as a winner without entering.",
        evidenceStatus: "UNSUPPORTED",
      },
      {
        text: "Pay a small fee to release your prize.",
        evidenceStatus: "UNSUPPORTED",
      },
      {
        text: "This giveaway is run by a recognizable, well-known brand.",
        evidenceStatus: "WEAK",
      },
      {
        text: "Official sweepstakes rules are posted publicly.",
        evidenceStatus: "SUPPORTED",
      },
    ],
    commonMyths: [
      {
        myth: "If a giveaway message references a real, well-known brand, it must be legitimate.",
        reality:
          "Brand impersonation is one of the most common giveaway scam tactics — verify through the brand's own official channels, not the message you received.",
      },
      {
        myth: "Paying a small 'processing fee' is a normal step to receive a prize.",
        reality:
          "No legitimate prize, lottery, or sweepstakes ever requires the winner to pay money upfront to receive their winnings.",
      },
    ],
    takeaways: [
      "A legitimate prize is never conditioned on paying a fee first.",
      "Verify giveaways through the brand's own official channels, not the message you received.",
      "Unsolicited 'you've won' messages without a prior entry are a classic scam pattern.",
      "Public, verifiable winner selection and official rules are hallmarks of a genuine sweepstakes.",
    ],
  },
  "travel-hacks": {
    beginnerGuide: {
      heading: "Where to start evaluating a travel-savings claim",
      steps: [
        "Check whether the strategy depends on your existing spending habits, or requires you to overspend to earn rewards.",
        "Read the annual fee and interest terms of any recommended credit card in full.",
        "Check whether a deal-finder tool or course discloses affiliate relationships with the cards or bookings it recommends.",
        "Compare a claimed 'secret' deal against publicly available flight search tools before assuming it's exclusive.",
        "Factor in taxes, fees, and blackout dates before assuming a points redemption is good value.",
      ],
    },
    topClaims: [
      {
        text: "This card's rewards are worth a specific dollar amount per year.",
        evidenceStatus: "MIXED",
      },
      {
        text: "Our tool finds secret flight deals no one else has access to.",
        evidenceStatus: "WEAK",
      },
      {
        text: "Points redemptions for flights often offer better value than cash back.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "You need to travel constantly to benefit from a points strategy.",
        evidenceStatus: "UNSUPPORTED",
      },
    ],
    commonMyths: [
      {
        myth: "Credit-card travel rewards are free money regardless of how you use the card.",
        reality:
          "Annual fees and any carried interest can easily exceed the rewards earned, especially for infrequent travelers.",
      },
      {
        myth: "Flight deal alerts are showing you inventory no one else can see.",
        reality:
          "Most deal-finder tools surface publicly available fare data faster or more conveniently, not genuinely private inventory.",
      },
    ],
    takeaways: [
      "A points strategy's value depends entirely on your own spending and travel patterns, not a universal number.",
      "Read a recommended card's fee and interest terms before applying.",
      "Check whether a travel-hack tool or course discloses its affiliate relationships.",
      "Factor in taxes, fees, and blackout dates before judging a redemption's real value.",
    ],
  },
  "remote-jobs": {
    beginnerGuide: {
      heading: "Where to start evaluating a remote job offer",
      steps: [
        "Verify the company has a real, registered business and a professional email domain.",
        "Be wary of an offer extended after minimal or no real interview process.",
        "Never pay for training materials, equipment, or a background check before receiving a signed offer.",
        "Refuse any request to deposit a check and wire part of the funds elsewhere.",
        "Search the company name plus 'scam' or 'reviews' before sharing personal or banking information.",
      ],
    },
    topClaims: [
      {
        text: "No experience needed, earn significant pay working from home.",
        evidenceStatus: "WEAK",
      },
      {
        text: "We'll mail you a check to purchase your own equipment.",
        evidenceStatus: "UNSUPPORTED",
      },
      {
        text: "This company is a registered, verifiable business.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "You'll be hired after a single message exchange.",
        evidenceStatus: "UNSUPPORTED",
      },
    ],
    commonMyths: [
      {
        myth: "A fast, easy hiring process just means the company is efficient.",
        reality:
          "Legitimate employers, especially for real remote roles, typically still verify identity and conduct at least one real interview — near-instant offers with no vetting are a common scam signal.",
      },
      {
        myth: "If a company sends you a check, it must be legitimate funds.",
        reality:
          "Fraudulent checks can appear to clear for days before bouncing, leaving the recipient liable for any amount they've already forwarded.",
      },
    ],
    takeaways: [
      "Verify the employer's business registration and domain before sharing personal information.",
      "Never pay upfront for training, equipment, or a background check.",
      "Refuse any request to deposit a check and forward part of the funds.",
      "A rushed hiring process with no real interview is a strong scam signal.",
    ],
  },
  "home-saving": {
    beginnerGuide: {
      heading: "Where to start evaluating a home-saving product or service",
      steps: [
        "Compare the claimed percentage savings against your actual utility bill breakdown.",
        "Look for independent lab testing or utility-provider verification, not just manufacturer claims.",
        "Check if a rebate or efficiency program is officially recognized by your utility provider.",
        "Be skeptical of plug-in devices claiming to dramatically cut electricity bills with no clear mechanism.",
        "Calculate the payback period — cost of the product versus realistic annual savings — before buying.",
      ],
    },
    topClaims: [
      {
        text: "This device cuts your electricity bill by a large percentage.",
        evidenceStatus: "UNSUPPORTED",
      },
      {
        text: "Smart thermostats can reduce heating and cooling costs.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "LED bulbs use significantly less energy than incandescent bulbs.",
        evidenceStatus: "SUPPORTED",
      },
      {
        text: "This water-saving showerhead pays for itself within one month.",
        evidenceStatus: "MIXED",
      },
    ],
    commonMyths: [
      {
        myth: "Any product marketed as an 'energy saver' has been independently verified.",
        reality:
          "Many plug-in energy-saving devices marketed to consumers have been shown by independent testing to have negligible real-world effect on typical bills.",
      },
      {
        myth: "A dramatic percentage claim applies to your whole bill.",
        reality:
          "A savings claim tied to one appliance or usage category can't be extrapolated to your total bill unless that category is a large share of your actual usage.",
      },
    ],
    takeaways: [
      "Compare any savings claim against your actual usage breakdown before buying.",
      "Independent lab or utility-provider verification is more reliable than a manufacturer's own claims.",
      "Utility-run rebate and efficiency programs tend to have more reliably documented savings.",
      "Calculate the payback period to judge whether a product's cost is actually worth it.",
    ],
  },
};

export function getTopicContent(slug: string): TopicContent | null {
  return TOPIC_CONTENT[slug] ?? null;
}
