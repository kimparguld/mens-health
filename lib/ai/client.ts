import Groq from "groq-sdk";
import { env } from "@/env";

export const DEFAULT_MODEL = "llama-3.3-70b-versatile";

const groq = new Groq({ apiKey: env.GROQ_API_KEY ?? "" });

/**
 * Thin adapter that exposes the same `anthropic.messages.create()` call shape
 * used across lib/ai/*.ts, backed by Groq.
 */
export const anthropic = {
  messages: {
    async create({
      model,
      max_tokens,
      messages,
    }: {
      model: string;
      max_tokens: number;
      messages: Array<{ role: string; content: string }>;
    }) {
      const completion = await groq.chat.completions.create({
        model: model ?? DEFAULT_MODEL,
        max_tokens,
        messages: messages as Groq.Chat.ChatCompletionMessageParam[],
      });
      const text = completion.choices[0]?.message?.content ?? "";
      return {
        content: [{ type: "text" as const, text }],
      };
    },
  },
};
