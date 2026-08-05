import { createWelcomeEmailBuilder } from "@menhealth/core-newsletter";
import { SITE_NAME } from "@/lib/site-brand";

export type { WelcomeEmailLink } from "@menhealth/core-newsletter";

export const { subject: welcomeSubject, buildWelcomeHtml, buildWelcomeText } =
  createWelcomeEmailBuilder({
    siteName: SITE_NAME,
    tagline: "Your weekly men's health briefing",
    subject: `Welcome to ${SITE_NAME}`,
    welcomeCopy: `Thanks for subscribing to ${SITE_NAME}! You'll get a weekly digest that cuts through the noise on men's health content.`,
    cadenceCopy:
      "Each week: one trending video, claims we've fact-checked against the evidence, and a practical takeaway you can actually use.",
    highlightLinks: [
      { label: "Topics", path: "/topics" },
      { label: "Rankings", path: "/rankings" },
      { label: "Creators", path: "/creators" },
      { label: "Weekly", path: "/weekly" },
    ],
    healthDisclaimer:
      "This newsletter is for informational purposes only and does not constitute medical advice. Always consult a qualified healthcare professional before making health decisions.",
  });
