import type { Platform } from "@prisma/client";

/**
 * Template variable placeholders used in hook/script/caption strings.
 * At generation time, these are filled by the AI from the video summary.
 */
export type TemplateVariables = Record<string, string>;

export type TemplateDef = {
  name: string;
  /** null = works for all platforms */
  platform: Platform | null;
  hook: string;
  script: string;
  caption: string;
  hashtags: string[];
};

/**
 * Seed templates — these are inserted into the DB on first migration.
 * Variables use {{variableName}} syntax.
 */
export const SEED_TEMPLATES: TemplateDef[] = [
  {
    name: "Claim Check",
    platform: null,
    hook: "This men's health claim is trending — here's what it actually says.",
    script: [
      "A popular video this week claims that {{claim}}.",
      "",
      "Here's the simple version:",
      "{{plainEnglishSummary}}",
      "",
      "What seems reasonable:",
      "{{reasonablePart}}",
      "",
      "What needs caution:",
      "{{cautionPart}}",
      "",
      "Bottom line:",
      "{{practicalTakeaway}}",
      "",
      "Read the full evidence-aware summary at menhealth-digest.com.",
    ].join("\n"),
    caption: [
      "This men's health claim is trending — here's what it actually says.",
      "",
      "{{plainEnglishSummary}}",
      "",
      "Evidence label: {{evidenceLabel}}",
      "Risk level: {{riskLevel}}",
      "",
      "Educational only. Not medical advice.",
      "",
      "Read the full summary:",
      "{{utmUrl}}",
      "",
      "#MensHealth #Fitness #Longevity",
    ].join("\n"),
    hashtags: ["MensHealth", "Fitness", "Longevity"],
  },
  {
    name: "3 Takeaways",
    platform: null,
    hook: "3 takeaways from today's biggest {{topic}} video.",
    script: [
      "I reviewed a trending video about {{topic}}.",
      "",
      "Takeaway 1:",
      "{{takeaway1}}",
      "",
      "Takeaway 2:",
      "{{takeaway2}}",
      "",
      "Takeaway 3:",
      "{{takeaway3}}",
      "",
      "One thing to be careful about:",
      "{{cautionPart}}",
      "",
      "Full summary at menhealth-digest.com.",
    ].join("\n"),
    caption: [
      "3 takeaways from today's biggest {{topic}} video.",
      "",
      "{{takeaway1}} | {{takeaway2}} | {{takeaway3}}",
      "",
      "Evidence label: {{evidenceLabel}}",
      "Risk level: {{riskLevel}}",
      "",
      "Educational only. Not medical advice.",
      "",
      "Read the full summary:",
      "{{utmUrl}}",
      "",
      "#MensHealth #{{topic}} #Longevity",
    ].join("\n"),
    hashtags: ["MensHealth", "Longevity"],
  },
  {
    name: "Useful but Incomplete",
    platform: null,
    hook: "This advice is useful — but incomplete.",
    script: [
      "The video says:",
      "{{claim}}",
      "",
      "That part makes sense because:",
      "{{supportingReason}}",
      "",
      "But it leaves out:",
      "{{missingContext}}",
      "",
      "Practical takeaway:",
      "{{practicalTakeaway}}",
      "",
      "Full breakdown at menhealth-digest.com.",
    ].join("\n"),
    caption: [
      "This advice is useful — but incomplete.",
      "",
      "{{supportingReason}} But {{missingContext}}",
      "",
      "Evidence label: {{evidenceLabel}}",
      "Risk level: {{riskLevel}}",
      "",
      "Educational only. Not medical advice.",
      "",
      "Read the full summary:",
      "{{utmUrl}}",
      "",
      "#MensHealth #HealthAdvice #Longevity",
    ].join("\n"),
    hashtags: ["MensHealth", "HealthAdvice", "Longevity"],
  },
  {
    name: "Weekly Roundup",
    platform: null,
    hook: "5 men's health claims that were trending this week.",
    script: [
      "This week, the biggest topics were:",
      "",
      "1. {{topic1}}",
      "2. {{topic2}}",
      "3. {{topic3}}",
      "",
      "The strongest advice was:",
      "{{strongestTakeaway}}",
      "",
      "The most questionable claim was:",
      "{{weakestClaim}}",
      "",
      "Full weekly digest at menhealth-digest.com.",
    ].join("\n"),
    caption: [
      "5 men's health claims that were trending this week.",
      "",
      "Topics: {{topic1}} | {{topic2}} | {{topic3}}",
      "",
      "Educational only. Not medical advice.",
      "",
      "Read the full weekly digest:",
      "{{utmUrl}}",
      "",
      "#MensHealth #WeeklyDigest #Longevity",
    ].join("\n"),
    hashtags: ["MensHealth", "WeeklyDigest", "Longevity"],
  },
];
