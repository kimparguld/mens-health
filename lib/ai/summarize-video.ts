import { z } from "zod";
import { anthropic, DEFAULT_MODEL } from "./client";

const SummaryOutputSchema = z.object({
  shortSummary: z
    .string()
    .min(1)
    .describe("A 1–2 sentence summary suitable for a preview card"),
  longSummary: z
    .string()
    .min(1)
    .describe("A 3–5 paragraph editorial summary of the video"),
  takeaways: z
    .array(z.string())
    .min(1)
    .max(7)
    .describe("Key practical takeaways as bullet points"),
  warnings: z
    .array(z.string())
    .optional()
    .describe("Things to be careful about in this video"),
  targetAudience: z
    .string()
    .optional()
    .describe("Who this video is best suited for"),
  redFlags: z
    .array(z.string())
    .optional()
    .describe("Red flags or reasons to be skeptical"),
});

export type SummaryOutput = z.infer<typeof SummaryOutputSchema>;

export type SummaryInput = {
  title: string;
  description: string;
  channelTitle: string;
  durationSeconds: number;
};

export type Result<T, E = Error> =
  { ok: true; value: T } | { ok: false; error: E };

export async function summarizeVideo(
  input: SummaryInput,
): Promise<Result<SummaryOutput>> {
  const prompt = `You are an editorial analyst for MenHealth Digest, a men's health content curation platform.

Analyze the following YouTube video metadata and produce a structured editorial summary.

IMPORTANT RULES:
- Do not present any content as medical advice.
- Be skeptical of extraordinary claims.
- Use neutral, evidence-aware language.
- If the video makes high-risk health claims (TRT, medications, supplements for conditions), note this in redFlags.

Video metadata:
Title: ${input.title}
Channel: ${input.channelTitle}
Duration: ${Math.round(input.durationSeconds / 60)} minutes
Description: ${input.description.slice(0, 1500)}

Respond with a JSON object matching this exact structure:
{
  "shortSummary": "string (1-2 sentences)",
  "longSummary": "string (3-5 paragraphs)",
  "takeaways": ["string", ...] (3-7 items),
  "warnings": ["string", ...] (optional, include if video has caveats),
  "targetAudience": "string (optional)",
  "redFlags": ["string", ...] (optional, include if concerning claims are present)
}

Respond ONLY with the JSON object. No markdown, no explanation.`;

  try {
    const message = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1500,
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

    const validated = SummaryOutputSchema.safeParse(parsed);
    if (!validated.success) {
      return {
        ok: false,
        error: new Error(
          `AI output failed validation: ${validated.error.message}`,
        ),
      };
    }

    return { ok: true, value: validated.data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
