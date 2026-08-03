import { z } from "zod";
import { anthropic, DEFAULT_MODEL } from "./client";
import type { Result } from "./summarize-video";

const FactCheckResultSchema = z.object({
  evidenceStatus: z.enum(["SUPPORTED", "MIXED", "WEAK", "UNSUPPORTED"]),
  rationale: z.string().min(1).max(1000),
});

export type FactCheckResult = z.infer<typeof FactCheckResultSchema>;

export type FactCheckClaimInput = {
  text: string;
  category: string;
};

// Fact-checks a single already-extracted claim in isolation (no video
// context needed) — used to backfill evidence review for claims created
// before auto-review existed. Deliberately no "sources"/citations: the AI
// provider chain reached at runtime (Groq/OpenRouter/OpenAI/Gemini fallback)
// has no real web-search grounding, so any AI-authored citation would be
// fabricated. Real sources stay human-added via the claim edit form.
export async function factCheckClaim(
  input: FactCheckClaimInput,
): Promise<Result<FactCheckResult>> {
  const prompt = `You are a health claims fact-checker for MenHealth Digest.

Evaluate the following health claim against general medical/scientific consensus and give a fact-check verdict.

Claim: ${input.text}
Category: ${input.category}

Respond with a JSON object:
{
  "evidenceStatus": "SUPPORTED|MIXED|WEAK|UNSUPPORTED",
  "rationale": "one to two sentence rationale"
}

Do not include citations or source URLs — state only the verdict and rationale.
Respond ONLY with the JSON object.`;

  try {
    const message = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 300,
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
        error: new Error("AI response was not valid JSON"),
      };
    }

    const validated = FactCheckResultSchema.safeParse(parsed);
    if (!validated.success) {
      return {
        ok: false,
        error: new Error(
          `Fact-check output failed validation: ${validated.error.message}`,
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
