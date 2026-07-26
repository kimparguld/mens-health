import Groq from "groq-sdk";
import { env } from "@/env";

export const DEFAULT_MODEL = "claude-sonnet-4-6";
const OPENROUTER_MODELS = [
  env.OPENROUTER_MODEL_1 ?? "mistralai/mistral-7b-instruct:free",
  env.OPENROUTER_MODEL_2 ?? "qwen/qwen3-8b:free",
  env.OPENROUTER_MODEL_3 ?? "microsoft/phi-3-mini-128k-instruct:free",
  env.OPENROUTER_MODEL_4 ?? "meta-llama/llama-3.2-3b-instruct:free",
];
const GEMINI_MODEL = "gemini-3.5-flash-lite";

const groq = new Groq({ apiKey: env.GROQ_API_KEY ?? "" });

type Message = { role: string; content: string };

function isRateLimit(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    (err as { status: number }).status === 429
  );
}

async function callAnthropic(
  messages: Message[],
  maxTokens: number,
  model: string,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    const err = Object.assign(new Error(`Anthropic ${res.status}: ${body}`), {
      status: res.status,
    });
    throw err;
  }
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? "";
}

async function callOpenRouter(
  messages: Message[],
  maxTokens: number,
  model: string,
): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    const err = Object.assign(new Error(`OpenRouter ${res.status}: ${body}`), {
      status: res.status,
    });
    throw err;
  }
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? "";
}

async function callOpenAI(
  messages: Message[],
  maxTokens: number,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: maxTokens,
      messages,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    const err = Object.assign(new Error(`OpenAI ${res.status}: ${body}`), {
      status: res.status,
    });
    throw err;
  }
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? "";
}

async function callGemini(
  messages: Message[],
  maxTokens: number,
): Promise<string> {
  const userMessage = messages.findLast((m) => m.role === "user");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: userMessage?.content ?? "" }] },
        ],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    const err = Object.assign(new Error(`Gemini ${res.status}: ${body}`), {
      status: res.status,
    });
    throw err;
  }
  const data = (await res.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

/**
 * Thin adapter that exposes the same `anthropic.messages.create()` call shape
 * used across lib/ai/*.ts.
 *
 * Provider fallback chain: Groq → OpenRouter → Gemini.
 * Each provider is skipped if its API key is not set.
 * On a 429 rate-limit error the next provider is tried automatically.
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
      messages: Message[];
    }) {
      // 1️⃣ Anthropic

      try {
        const text = await callAnthropic(
          messages,
          max_tokens,
          model ?? DEFAULT_MODEL,
        );
        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(
          `[AI] Anthropic rate limit hit — ${message} — falling back to Groq`,
        );
      }

      // 1️⃣ Groq
      if (env.GROQ_API_KEY) {
        try {
          const completion = await groq.chat.completions.create({
            model: model ?? DEFAULT_MODEL,
            max_tokens,
            messages: messages as Groq.Chat.ChatCompletionMessageParam[],
          });
          const text = completion.choices[0]?.message?.content ?? "";
          return { content: [{ type: "text" as const, text }] };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn(
            `[AI] Groq rate limit hit — ${message} — falling back to OpenRouter`,
          );
        }
      }

      // // 2️⃣ OpenRouter — try each model slot in order, skip on any error
      if (env.OPENROUTER_API_KEY) {
        for (const orModel of OPENROUTER_MODELS) {
          try {
            const text = await callOpenRouter(messages, max_tokens, orModel);
            return { content: [{ type: "text" as const, text }] };
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.warn(
              `[AI] OpenRouter model "${orModel}" failed — ${message}`,
            );
          }
        }
        console.warn(
          "[AI] All OpenRouter models failed — falling back to OpenAI/Gemini",
        );
      }

      // // 3️⃣ OpenAI
      if (env.OPENAI_API_KEY) {
        try {
          const text = await callOpenAI(messages, max_tokens);
          return { content: [{ type: "text" as const, text }] };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn(
            `[AI] OpenAI rate limit hit — ${message} — falling back to Gemini`,
          );
        }
      }

      // 4️⃣ Gemini
      if (env.GEMINI_API_KEY) {
        try {
          const text = await callGemini(messages, max_tokens);
          return { content: [{ type: "text" as const, text }] };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn(`[AI] Gemini rate limit hit — ${message}`);
        }
      }

      throw new Error(
        "All AI providers exhausted or unconfigured. Set GROQ_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY.",
      );
    },
  },
};
