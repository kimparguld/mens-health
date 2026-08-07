import { z } from "zod";
import type { Platform } from "@prisma/client";
import type { Result } from "@menhealth/core-social";
import { aiClient } from "@/lib/ai/client";

export const VideoPlanSchema = z.object({
  narration: z
    .string()
    .min(40)
    .max(900)
    .describe("Full spoken narration for a ~30-45 second vertical video"),
  captionChunks: z
    .array(z.string().min(1).max(100))
    .min(3)
    .max(6)
    .describe(
      "Short on-screen caption lines shown in sequence while the narration plays",
    ),
});

export type VideoPlan = z.infer<typeof VideoPlanSchema>;

export type CreateVideoPlanInput = {
  hook: string;
  script: string;
  platform: Platform;
};

function buildVideoPlanPrompt(input: CreateVideoPlanInput): string {
  return `You are turning an existing social media draft into a short vertical video.

Platform: ${input.platform}
Hook: ${input.hook}
Script: ${input.script}

Use only information contained in the hook and script above. You may rewrite
them for concise, natural spoken delivery, but you must not introduce any new:
- medical claims
- efficacy claims
- diagnoses
- dosages
- statistics
- treatment recommendations
- conclusions stronger than the supplied content

Preserve uncertainty where the source content is uncertain.

Return strict JSON matching this shape, with no other text:
{
  "narration": string, // full spoken narration, 40-900 characters
  "captionChunks": string[] // 3-6 short on-screen caption lines, each under 100 characters, in the order they should appear
}`;
}

export async function createVideoPlan(
  input: CreateVideoPlanInput,
): Promise<Result<VideoPlan>> {
  const message = await aiClient.anthropic.messages.create({
    model: aiClient.defaultModel,
    max_tokens: 800,
    messages: [{ role: "user", content: buildVideoPlanPrompt(input) }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { ok: false, error: new Error("No text block in AI response") };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    return { ok: false, error: new Error("AI response was not valid JSON") };
  }

  const validated = VideoPlanSchema.safeParse(parsed);
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
