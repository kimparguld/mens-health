import { z } from "zod";
import { anthropic, DEFAULT_MODEL } from "./client";
import type { Result } from "./summarize-video";

const EditorialTitleSchema = z.object({
  editorialTitle: z.string().min(1).max(120),
});

export type EditorialTitleInput = {
  title: string;
  shortSummary: string;
  channelTitle: string;
};

export async function generateEditorialTitle(
  input: EditorialTitleInput,
): Promise<Result<string>> {
  const prompt = `You are an SEO editor for MenHealth Digest, a men's health video review site.

The video below was reviewed. Its raw YouTube title is often clickbait or doesn't match how people actually search. Write a clear, editorial title for our review page that:
- Describes what the video claims or covers, in plain search-friendly language
- Is phrased as a direct question or descriptive statement, not clickbait
- Does not present anything as medical advice or as settled fact
- Stays under 70 characters where possible, and never exceeds 120

Raw YouTube title: ${input.title}
Channel: ${input.channelTitle}
Summary: ${input.shortSummary}

Respond with a JSON object: { "editorialTitle": "string" }
Respond ONLY with the JSON object. No markdown, no explanation.`;

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
        error: new Error(
          `AI response was not valid JSON: ${textBlock.text.slice(0, 200)}`,
        ),
      };
    }

    const validated = EditorialTitleSchema.safeParse(parsed);
    if (!validated.success) {
      return {
        ok: false,
        error: new Error(
          `AI output failed validation: ${validated.error.message}`,
        ),
      };
    }

    return { ok: true, value: validated.data.editorialTitle };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
