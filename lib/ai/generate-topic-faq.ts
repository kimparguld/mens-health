import { z } from "zod";
import { anthropic, DEFAULT_MODEL } from "./client";
import type { Result } from "./summarize-video";

const FaqItemSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

const FaqOutputSchema = z.object({
  intro: z.string().min(1),
  faq: z.array(FaqItemSchema).min(1).max(5),
});

export type FaqOutput = z.infer<typeof FaqOutputSchema>;

export type FaqGenerationInput = {
  topicName: string;
  topicDescription: string;
  videoSummaries: Array<{ title: string; shortSummary: string }>;
};

export async function generateTopicFaq(
  input: FaqGenerationInput,
): Promise<Result<FaqOutput>> {
  const videoContext =
    input.videoSummaries.length > 0
      ? input.videoSummaries
          .map((v, i) => `${i + 1}. "${v.title}": ${v.shortSummary}`)
          .join("\n")
      : "No videos available yet.";

  const prompt = `You are an editorial analyst for MenHealth Digest, a men's health content curation platform.

Generate an SEO-optimised intro paragraph and 3–5 Frequently Asked Questions for the topic: "${input.topicName}".

Topic description: ${input.topicDescription}

Recent published videos on this topic:
${videoContext}

RULES:
- Write for men aged 30–55 who are health-conscious but not medical professionals.
- Do NOT present content as medical advice. Use neutral, evidence-aware language.
- Questions must be things people actually search for.
- Answers must be factual, concise (2–4 sentences), and reference established evidence where possible.
- The intro should be 2–3 sentences summarising what the topic is and why it matters.

Respond with a JSON object:
{
  "intro": "string",
  "faq": [
    { "question": "string", "answer": "string" }
  ]
}

Respond ONLY with the JSON object. No markdown, no explanation.`;

  try {
    const message = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ok: false, error: new Error("No text content in AI response") };
    }

    const parsed = JSON.parse(textBlock.text) as unknown;
    const validated = FaqOutputSchema.safeParse(parsed);
    if (!validated.success) {
      return {
        ok: false,
        error: new Error(`Invalid AI output: ${validated.error.message}`),
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
