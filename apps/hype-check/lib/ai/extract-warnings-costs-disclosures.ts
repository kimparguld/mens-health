import { z } from "zod";
import { aiClient } from "@/lib/ai/client";
import { SITE_NAME } from "@/lib/site-brand";
import type { Result } from "@menhealth/core-ai";

const WarningSignSchema = z.object({
  text: z.string().min(1).max(500),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

const CostItemSchema = z.object({
  label: z.string().min(1).max(200),
  amount: z.string().min(1).max(100),
  isHidden: z.boolean(),
  notes: z.string().max(1000).optional(),
});

const DisclosureSchema = z.object({
  text: z.string().min(1).max(500),
  detected: z.boolean(),
});

const WarningsCostsDisclosuresSchema = z.object({
  warningSigns: z.array(WarningSignSchema).max(10),
  costItems: z.array(CostItemSchema).max(10),
  disclosures: z.array(DisclosureSchema).max(5),
});

export type WarningSignOutput = z.infer<typeof WarningSignSchema>;
export type CostItemOutput = z.infer<typeof CostItemSchema>;
export type DisclosureOutput = z.infer<typeof DisclosureSchema>;
export type WarningsCostsDisclosuresOutput = z.infer<
  typeof WarningsCostsDisclosuresSchema
>;

export type WarningsCostsDisclosuresInput = {
  title: string;
  description: string;
  shortSummary: string;
};

// Pulled out from extractWarningsCostsDisclosures so the parsing/validation
// step can be unit tested without a live AI call.
export function validateExtractionResponse(
  raw: unknown,
): Result<WarningsCostsDisclosuresOutput> {
  const validated = WarningsCostsDisclosuresSchema.safeParse(raw);
  if (!validated.success) {
    return {
      ok: false,
      error: new Error(
        `AI output failed validation: ${validated.error.message}`,
      ),
    };
  }
  return { ok: true, value: validated.data };
}

export async function extractWarningsCostsDisclosures(
  input: WarningsCostsDisclosuresInput,
): Promise<Result<WarningsCostsDisclosuresOutput>> {
  const prompt = `You are a consumer-protection analyst for ${SITE_NAME}, a platform that reviews trending products, courses, side hustles, and investment apps for hype vs. reality.

Analyze the following video content and extract three things a viewer should know before spending money or time on this:

1. Warning signs — concerning patterns (e.g. pressure tactics, unverifiable claims, evasive answers about risk).
2. Cost items — any prices, fees, or subscription costs mentioned, flagging any that are hidden, easy to miss, or not stated up front.
3. Disclosures — sponsorships, affiliate relationships, or paid promotion the video discloses (or fails to disclose despite promoting a product).

Video content:
Title: ${input.title}
Description: ${input.description.slice(0, 1000)}
Summary: ${input.shortSummary}

Respond with a JSON object:
{
  "warningSigns": [{ "text": "string", "severity": "LOW|MEDIUM|HIGH" }],
  "costItems": [{ "label": "string", "amount": "string", "isHidden": boolean, "notes": "string (optional)" }],
  "disclosures": [{ "text": "string", "detected": boolean }]
}

Each array may be empty (0-10 items for warningSigns/costItems, 0-5 for disclosures) if there's nothing notable for that category.
Respond ONLY with the JSON object. No markdown, no explanation.`;

  try {
    const message = await aiClient.anthropic.messages.create({
      model: aiClient.defaultModel,
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ok: false, error: new Error("No text content in AI response") };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      return {
        ok: false,
        error: new Error(
          `AI response was not valid JSON: ${textBlock.text.slice(0, 200)}`,
        ),
      };
    }

    return validateExtractionResponse(parsed);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
