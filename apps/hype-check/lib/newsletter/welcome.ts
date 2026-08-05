import { createWelcomeEmailBuilder } from "@menhealth/core-newsletter";
import { SITE_NAME } from "@/lib/site-brand";

export type { WelcomeEmailLink } from "@menhealth/core-newsletter";

export const { subject: welcomeSubject, buildWelcomeHtml, buildWelcomeText } =
  createWelcomeEmailBuilder({
    siteName: SITE_NAME,
    tagline: "Legit, or just hype?",
    subject: `Welcome to ${SITE_NAME}`,
    welcomeCopy: `Thanks for subscribing to ${SITE_NAME}! You'll get a weekly digest that cuts through the noise on trending products.`,
    cadenceCopy:
      "Each week: one trending product, claims we've fact-checked against the evidence, and a practical takeaway you can actually use.",
    highlightLinks: [
      { label: "Topics", path: "/topics" },
      { label: "Rankings", path: "/rankings" },
      { label: "Creators", path: "/creators" },
      { label: "Weekly", path: "/weekly" },
    ],
    healthDisclaimer:
      "This newsletter is for informational purposes only and does not constitute financial, legal, or investment advice. Always do your own research before making a purchase or investment decision.",
  });
