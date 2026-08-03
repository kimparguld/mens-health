import Groq from "groq-sdk";

export type AiMessage = { role: string; content: string };

export type AiClientConfig = {
  anthropicApiKey?: string;
  groqApiKey?: string;
  /** Defaults to "openai/gpt-oss-120b" (Groq's own model catalog). */
  groqModel?: string;
  openRouterApiKey?: string;
  /**
   * Defaults to 4 free-tier OpenRouter models, tried in order. Free-tier
   * models rotate frequently — re-check https://openrouter.ai/models?max_price=0
   * periodically and override if any get delisted.
   */
  openRouterModels?: string[];
  openAiApiKey?: string;
  geminiApiKey?: string;
  /**
   * Model ID for the Anthropic branch only. Defaults to Haiku — this
   * pipeline is high-volume background content generation, not a place to
   * default to Sonnet pricing.
   */
  defaultModel?: string;
};

const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const DEFAULT_OPENROUTER_MODELS = [
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",
  "mistralai/mistral-7b-instruct:free",
  "microsoft/phi-3-mini-128k-instruct:free",
];
const GEMINI_MODEL = "gemini-3.5-flash-lite";

async function callAnthropic(
  messages: AiMessage[],
  maxTokens: number,
  model: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
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
    content: Array<{ type: string; text?: string }>;
  };
  return data.content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");
}

async function callOpenRouter(
  messages: AiMessage[],
  maxTokens: number,
  model: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
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
  messages: AiMessage[],
  maxTokens: number,
  apiKey: string,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
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
  messages: AiMessage[],
  maxTokens: number,
  apiKey: string,
): Promise<string> {
  const userMessage = messages.findLast((m) => m.role === "user");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
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

export type AiClient = {
  anthropic: {
    messages: {
      create(input: {
        model: string;
        max_tokens: number;
        messages: AiMessage[];
      }): Promise<{ content: Array<{ type: "text"; text: string }> }>;
    };
  };
  /** This site's configured default model (Anthropic branch). */
  defaultModel: string;
};

/**
 * Binds the provider fallback chain to this site's own API keys once, so
 * callers keep using `client.anthropic.messages.create({...})` — the same
 * `anthropic.messages.create()`-shaped wrapper used throughout the AI
 * pipeline — exactly as before (see apps/menhealth/lib/ai/client.ts).
 *
 * Provider fallback chain: Anthropic → Groq → OpenRouter → OpenAI → Gemini.
 * Each provider is skipped if its API key is not set. On a 429 rate-limit
 * error the next provider is tried automatically.
 */
export function createAiClient(config: AiClientConfig): AiClient {
  const defaultModel = config.defaultModel ?? DEFAULT_ANTHROPIC_MODEL;
  const groqModel = config.groqModel ?? DEFAULT_GROQ_MODEL;
  const openRouterModels = config.openRouterModels ?? DEFAULT_OPENROUTER_MODELS;
  const groq = new Groq({ apiKey: config.groqApiKey ?? "" });

  return {
    defaultModel,
    anthropic: {
      messages: {
        async create({ model, max_tokens, messages }) {
          // 1️⃣ Anthropic
          if (config.anthropicApiKey) {
            try {
              const text = await callAnthropic(
                messages,
                max_tokens,
                model ?? defaultModel,
                config.anthropicApiKey,
              );
              return { content: [{ type: "text" as const, text }] };
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.warn(
                `[AI] Anthropic rate limit hit — ${message} — falling back to Groq`,
              );
            }
          }

          // 2️⃣ Groq
          if (config.groqApiKey) {
            try {
              const completion = await groq.chat.completions.create({
                model: groqModel,
                max_tokens,
                // gpt-oss models spend hidden reasoning tokens out of the same
                // max_tokens budget as the visible answer — on "default" effort
                // they can burn the whole budget on reasoning and return empty
                // content (finish_reason "length"). "low" keeps enough budget
                // free for the actual JSON output.
                reasoning_effort: "low",
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

          // 3️⃣ OpenRouter — try each model slot in order, skip on any error
          if (config.openRouterApiKey) {
            for (const orModel of openRouterModels) {
              try {
                const text = await callOpenRouter(
                  messages,
                  max_tokens,
                  orModel,
                  config.openRouterApiKey,
                );
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

          // 4️⃣ OpenAI
          if (config.openAiApiKey) {
            try {
              const text = await callOpenAI(
                messages,
                max_tokens,
                config.openAiApiKey,
              );
              return { content: [{ type: "text" as const, text }] };
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.warn(
                `[AI] OpenAI rate limit hit — ${message} — falling back to Gemini`,
              );
            }
          }

          // 5️⃣ Gemini
          if (config.geminiApiKey) {
            try {
              const text = await callGemini(
                messages,
                max_tokens,
                config.geminiApiKey,
              );
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
    },
  };
}
