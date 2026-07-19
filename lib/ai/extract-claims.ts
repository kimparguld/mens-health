import { z } from "zod";
import { anthropic, DEFAULT_MODEL } from "./client";
import type { Result } from "./summarize-video";

const ClaimSchema = z.object({
  text: z.string().min(1).describe("The health claim extracted from the video"),
  category: z.enum([
    "NUTRITION",
    "EXERCISE",
    "HORMONES",
    "MENTAL_HEALTH",
    "SUPPLEMENTS",
    "LONGEVITY",
    "SEXUAL_HEALTH",
    "OTHER",
  ]),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  explanation: z
    .string()
    .optional()
    .describe("Brief explanation of why this claim matters or is notable"),
});

const ClaimsOutputSchema = z.object({
  claims: z.array(ClaimSchema).max(10),
});

export type ExtractedClaim = z.infer<typeof ClaimSchema>;

export type ClaimExtractionInput = {
  title: string;
  description: string;
  shortSummary: string;
};

export async function extractClaims(
  input: ClaimExtractionInput,
): Promise<Result<ExtractedClaim[]>> {
  const prompt = `You are a health claims analyst for MenHealth Digest.

Extract factual health claims from the following video content. Focus on claims that are:
- Specific and verifiable (e.g. "X increases testosterone by Y%")
- Health-relevant (not general lifestyle advice)
- Either well-supported or potentially misleading

Risk level guide:
- HIGH: Claims about medications, TRT, hormones, sexual health, mental health treatment, cancer, supplements as cures
- MEDIUM: Diet claims, specific supplement dosages, training frequency claims with quantified outcomes
- LOW: General lifestyle advice, widely accepted recommendations

Video content:
Title: ${input.title}
Description: ${input.description.slice(0, 1000)}
Summary: ${input.shortSummary}

Respond with a JSON object:
{
  "claims": [
    {
      "text": "string",
      "category": "NUTRITION|EXERCISE|HORMONES|MENTAL_HEALTH|SUPPLEMENTS|LONGEVITY|SEXUAL_HEALTH|OTHER",
      "riskLevel": "LOW|MEDIUM|HIGH",
      "explanation": "string (optional)"
    }
  ]
}

Extract 0–10 claims. If there are no notable health claims, return an empty array.
Respond ONLY with the JSON object.`;

  try {
    const message = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1000,
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
        error: new Error(`AI response was not valid JSON`),
      };
    }

    const validated = ClaimsOutputSchema.safeParse(parsed);
    if (!validated.success) {
      return {
        ok: false,
        error: new Error(
          `Claims output failed validation: ${validated.error.message}`,
        ),
      };
    }

    return { ok: true, value: validated.data.claims };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
