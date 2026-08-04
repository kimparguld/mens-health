import type { FaqEntry } from "@menhealth/core-seo";

export type TopicSeoData = {
  intro: string;
  faq: FaqEntry[];
};

const TOPIC_SEO: Record<string, TopicSeoData> = {
  "ai-tools": {
    intro:
      "AI tools promise to save time or replace expensive services, but 'AI-powered' is now attached to everything from genuinely useful automation to thin wrappers around a single API call. The gap between a polished marketing page and the actual output quality is often the whole story.",
    faq: [
      {
        question: "How do I tell if an AI tool is just a wrapper around another model?",
        answer:
          "Check whether it lets you inspect or export the underlying prompts, offers genuinely proprietary data or workflow beyond the model itself, and compare its pricing to the cost of using the underlying API directly. Many tools are a thin interface around the same handful of base models with a markup added.",
      },
      {
        question: "Should I trust a 'used by X million people' claim?",
        answer:
          "Verify it against independent sources like app store install counts or company funding disclosures where possible. These figures often blend free-tier signups with actual paying customers, which inflates the number without misrepresenting it outright.",
      },
      {
        question: "What free trial tactics should I watch for?",
        answer:
          "Auto-renewing subscriptions, a credit-card requirement for a nominally 'free' trial, and a deliberately hard-to-find cancellation flow are common. Check the cancellation policy and how to export your data before entering payment details.",
      },
    ],
  },
  "side-hustles": {
    intro:
      "Side hustle content promises fast income from dropshipping, print-on-demand, reselling, and similar models — but most require real time, marketing spend, and skill, and the income claims in the pitch rarely reflect typical results.",
    faq: [
      {
        question: "Are dramatic 'six-figure store' claims realistic?",
        answer:
          "They're rare. Margins are typically thin once ad spend, platform fees, and returns are subtracted, and screenshots of gross revenue are not the same as profit. Treat any headline income figure as unverified until you see the cost breakdown behind it.",
      },
      {
        question: "How can I tell a side-hustle course sale from a real opportunity?",
        answer:
          "If most of the money in the pitch comes from selling the course or coaching about the hustle rather than from the hustle itself, that's a strong sign it's a marketing funnel rather than a proven, independently repeatable business model.",
      },
      {
        question: "What upfront costs should worry me?",
        answer:
          "Any side hustle requiring a large upfront inventory purchase, a paid 'starter kit,' or recruiting others to unlock your own earnings resembles MLM or pyramid-scheme structures and deserves extra scrutiny before you commit money.",
      },
    ],
  },
  "online-courses": {
    intro:
      "Paid courses and coaching programs promise a specific income or life outcome, but marketing pages showcase best-case testimonials rather than typical results, and few programs publish real completion or outcome data for all students.",
    faq: [
      {
        question: "Does a course's income claim have to be substantiated?",
        answer:
          "In many jurisdictions marketers are expected to have a reasonable basis for earnings claims, but enforcement is inconsistent. The absence of a 'results not typical' disclosure or a real numeric breakdown across all students is a red flag rather than proof the claim is honest.",
      },
      {
        question: "What's a 'typical results' disclosure and why does it matter?",
        answer:
          "It's a disclosure showing the range or average outcome across every buyer, not just the handful of highlighted success stories. Without it, you're only seeing the survivors — the small subset who both succeeded and agreed to be featured.",
      },
      {
        question: "Are money-back guarantees on courses reliable?",
        answer:
          "Read the fine print before buying. Some guarantees require proof you 'completed the work' to qualify, or have a window that expires before the course's promised results could plausibly appear.",
      },
    ],
  },
  "viral-products": {
    intro:
      "Products that go viral on social video often ride a wave of ads and paid creator promotion well before independent reviews catch up, and 'it made me buy it' enthusiasm doesn't always match how the product performs once you own it.",
    faq: [
      {
        question: "How do I know if a product's viral reviews are genuine?",
        answer:
          "Look for a broad spread of reviewers with different audiences and unedited footage, rather than a cluster of near-identical sponsored posts appearing within days of each other — a common sign of a coordinated paid campaign rather than organic buzz.",
      },
      {
        question: "Why do dramatic before/after demos need scrutiny?",
        answer:
          "Lighting, editing, and cherry-picked takes can make an unremarkable product look transformative on camera. Independent, unsponsored test videos posted weeks after launch are a more reliable signal than the original demo.",
      },
      {
        question: "What return options should a viral product have?",
        answer:
          "A clear, accessible return address (not overseas-only), a reasonable return window, and no excessive restocking fee. Check this before ordering — not after something goes wrong with the product.",
      },
    ],
  },
  marketplaces: {
    intro:
      "Buy/sell/resale marketplace apps differ widely in fee structure, seller protections, and how disputes get resolved. The app that's cheapest to list on isn't always the one that protects you if a deal goes wrong.",
    faq: [
      {
        question: "What's the difference between buyer protection and seller protection?",
        answer:
          "Buyer protection typically covers non-delivery or an item not matching its listing; seller protection covers non-payment or chargeback fraud. Check which side a marketplace actually protects, and under what conditions, before relying on either.",
      },
      {
        question: "Why do marketplace fees matter for pricing?",
        answer:
          "Listing, payment processing, and final-value fees can take a meaningful cut of a sale price. Sellers who don't account for this often price items in a way that surprises buyers or quietly erodes their own margin.",
      },
      {
        question: "Is it safe to move a transaction off-platform?",
        answer:
          "Generally no. Moving payment off-platform — wire transfer, cash apps, gift cards — forfeits the marketplace's dispute resolution and buyer or seller protections entirely, and is a well-documented scam pattern.",
      },
    ],
  },
  "investment-apps": {
    intro:
      "Trading, investing, and crypto apps range from regulated brokerages to unregistered platforms making unrealistic return claims. The line between an aggressive-but-legal product and an outright scam usually comes down to regulatory status and how returns are described.",
    faq: [
      {
        question: "Is an investment app regulated?",
        answer:
          "Check for registration with the relevant financial regulator, such as the SEC/FINRA in the US or the FCA in the UK. An unregistered platform offering trading or investment products is a major red flag regardless of how professional its app looks.",
      },
      {
        question: "What does a 'guaranteed returns' claim actually mean?",
        answer:
          "Legitimate investments carry risk that fluctuates with markets. A guaranteed or fixed percentage return — especially an unusually high one — is one of the most reliable single predictors of investment fraud that regulators track.",
      },
      {
        question: "How should I evaluate crypto app claims?",
        answer:
          "Treat 'staking' or 'yield' percentages far above typical market rates with skepticism, verify the platform holds any licenses it claims, and never invest more than you can afford to lose given the asset class's volatility.",
      },
    ],
  },
  giveaways: {
    intro:
      "Sweepstakes, prize giveaways, and contests are a classic vector for phishing and advance-fee scams. A genuine giveaway never requires payment to receive a prize, but the excitement of 'you won' makes people skip that check.",
    faq: [
      {
        question: "Why would a real giveaway ask for my personal information?",
        answer:
          "Legitimate sweepstakes need contact details, and sometimes tax information, to deliver a prize and comply with reporting rules. They don't need your bank login, full card number, or a payment before releasing winnings.",
      },
      {
        question: "What's the biggest red flag in a giveaway message?",
        answer:
          "Any request to pay a 'fee,' 'tax,' or 'shipping cost' before receiving the prize. Genuine prizes are never conditioned on the winner paying first — that request alone is close to a guaranteed sign of fraud.",
      },
      {
        question: "How can I verify a giveaway is real before entering?",
        answer:
          "Check whether it's run through the brand's official, verified channel, search the giveaway name alongside 'scam,' and be wary of giveaways that only exist on a single unverified account with no other legitimate presence.",
      },
    ],
  },
  "travel-hacks": {
    intro:
      "Credit-card points strategies, flight deal finders, and travel-savings claims range from genuinely useful to overhyped. Their value usually depends on your specific spending and travel patterns, not a universal 'hack' that works for everyone.",
    faq: [
      {
        question: "Do credit-card points strategies really save significant money?",
        answer:
          "They can, for people who pay their balance in full and travel enough to redeem accumulated points. But annual fees and interest charges can easily exceed the value earned for infrequent travelers or anyone who carries a balance.",
      },
      {
        question: "Are 'secret' flight deal alerts actually secret?",
        answer:
          "Most flight deal tools rely on publicly available fare and error-fare data rather than genuinely private inventory. Paid tiers often just deliver the same public deals faster or with fewer ads, not exclusive access.",
      },
      {
        question: "What should I check before trusting a travel-hack course or tool?",
        answer:
          "Whether it discloses affiliate relationships with the card issuers or booking sites it recommends. That relationship can change whether the 'best' card or deal is actually best for you, or simply the best-paying referral.",
      },
    ],
  },
  "remote-jobs": {
    intro:
      "Work-from-home job offers and postings are a common target for employment scams, where the 'job' is really a vehicle for stealing personal information, cashing fraudulent checks, or extracting upfront fees from applicants.",
    faq: [
      {
        question: "What's the biggest sign a remote job posting is fake?",
        answer:
          "An offer extended with no real interview, arriving unusually fast after minimal contact, or any requirement to pay for training materials, equipment, or a background check before you've even started the role.",
      },
      {
        question: "Why do scam remote jobs ask new hires to handle checks or transfers?",
        answer:
          "This is a common check-fraud or money-mule scheme: the 'employee' deposits a fraudulent check and wires part of it elsewhere, only for the check to bounce days later, leaving the worker liable for the full amount.",
      },
      {
        question: "How can I verify a remote employer is legitimate?",
        answer:
          "Search the company name alongside 'reviews' or 'scam,' confirm it has a real business registration and a professional email domain rather than free webmail, and never share bank details before signing a verifiable employment contract.",
      },
    ],
  },
  "home-saving": {
    intro:
      "Household products and services claiming to cut utility bills or everyday costs range from modestly useful, like smart thermostats and LED retrofits, to essentially ineffective gadgets promising implausible percentage savings. The math behind a claim is usually checkable.",
    faq: [
      {
        question: "Do plug-in energy-saving gadgets really cut electricity bills?",
        answer:
          "Most consumer 'electricity saving boxes' have been shown by independent testing to have negligible effect on typical residential bills. Genuine savings usually come from behavior change or verified efficiency upgrades, not a small plug-in device.",
      },
      {
        question: "How can I check if a percentage savings claim is realistic?",
        answer:
          "Compare the claimed savings against your actual utility usage breakdown. A claim to cut a whole bill by half from a single device is implausible if that appliance category is only a small fraction of your total usage.",
      },
      {
        question: "What's a legitimate way to reduce home costs?",
        answer:
          "Utility-verified programs — rebates for insulation, certified smart thermostats, LED conversion — and consumption audits from your own utility provider tend to have real, measurable, and documented savings compared to unverified third-party gadgets.",
      },
    ],
  },
};

export function getTopicSeo(slug: string): TopicSeoData | null {
  return TOPIC_SEO[slug] ?? null;
}

export function getAllTopicSeo(): Record<string, TopicSeoData> {
  return TOPIC_SEO;
}
