import { aiClient } from "@/lib/ai/client";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/site-brand";
import { TopicCandidateSchema, type TopicCandidate } from "@menhealth/core-youtube";
import type { Result } from "@menhealth/core-ai";

const CANDIDATE_COUNT = 5;

// Pulled out from discoverTopicCandidates so the parsing/validation step
// can be unit tested without a live AI call.
export function validateCandidatesResponse(
  raw: unknown,
): Result<TopicCandidate[]> {
  const validated = TopicCandidateSchema.array()
    .max(CANDIDATE_COUNT)
    .safeParse(raw);
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

export async function discoverTopicCandidates(
  excludeSlugs: string[],
): Promise<Result<TopicCandidate[]>> {
  const prompt = `You are a content strategist for ${SITE_NAME}. ${SITE_DESCRIPTION}

Suggest ${CANDIDATE_COUNT} new topic ideas this site could add, in the same niche, that are NOT already covered.

Topics already covered (do not repeat these slugs or close variants): ${excludeSlugs.join(", ") || "none"}

Respond with a JSON array of exactly ${CANDIDATE_COUNT} objects:
[{ "slug": "lowercase-kebab-case", "name": "Display Name", "query": "youtube search query for this topic", "description": "one sentence describing the topic" }]

Respond ONLY with the JSON array. No markdown, no explanation.`;

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

    return validateCandidatesResponse(parsed);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
