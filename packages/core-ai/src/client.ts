import Groq from 'groq-sdk';

export type AiMessage = { role: string; content: string };

export type AiClientConfig = {
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
  /** Defaults to "gpt-5.6-luna" (OpenAI's current budget model). */
  openAiModel?: string;
  geminiApiKey?: string;
};

const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_OPENROUTER_MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'inclusionai/ling-3.0-flash:free',
  'cohere/north-mini-code:free',
  'poolside/laguna-s-2.1:free',
];
const DEFAULT_OPENAI_MODEL = 'gpt-5.6-luna';
const GEMINI_MODEL = 'gemini-3.5-flash-lite';

/** Labels a provider failure by its actual HTTP status instead of assuming 429. */
function describeFailure(err: unknown): string {
  const status = (err as { status?: number } | undefined)?.status;
  const message = err instanceof Error ? err.message : String(err);
  const reason = status === 429 ? 'rate limit hit' : `request failed${status ? ` (${status})` : ''}`;
  return `${reason} — ${message}`;
}

async function callOpenRouter(
  messages: AiMessage[],
  maxTokens: number,
  model: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
  return data.choices[0]?.message?.content ?? '';
}

async function callOpenAI(messages: AiMessage[], maxTokens: number, model: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
    const err = Object.assign(new Error(`OpenAI ${res.status}: ${body}`), {
      status: res.status,
    });
    throw err;
  }
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? '';
}

async function callGemini(messages: AiMessage[], maxTokens: number, apiKey: string): Promise<string> {
  const userMessage = messages.findLast((m) => m.role === 'user');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userMessage?.content ?? '' }] }],
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
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

export type AiClient = {
  anthropic: {
    messages: {
      create(input: {
        model: string;
        max_tokens: number;
        messages: AiMessage[];
      }): Promise<{ content: Array<{ type: 'text'; text: string }> }>;
    };
  };
  /**
   * This site's configured default model id. Threaded through to `.create()`
   * as `model` for callers that still pass it, but no provider branch below
   * reads it — each hardcodes its own model (`groqModel`, the OpenRouter
   * model list, `openAiModel`, `GEMINI_MODEL`). Kept only so existing callers
   * (e.g. `client.defaultModel` in `pipeline.ts`, `generate-social-post.ts`)
   * don't need to change.
   */
  defaultModel: string;
};

/**
 * Binds the provider fallback chain to this site's own API keys once, so
 * callers keep using `client.anthropic.messages.create({...})` — an
 * `anthropic.messages.create()`-shaped wrapper kept purely for interface
 * compatibility with existing callers (see apps/menhealth/lib/ai/client.ts).
 * No provider below is actually Anthropic.
 *
 * Provider fallback chain: Groq → OpenRouter → OpenAI → Gemini.
 * Each provider is skipped if its API key is not set. On a 429 rate-limit
 * error the next provider is tried automatically.
 */
export function createAiClient(config: AiClientConfig): AiClient {
  const defaultModel = DEFAULT_GROQ_MODEL;
  const groqModel = DEFAULT_GROQ_MODEL;
  const openRouterModels = DEFAULT_OPENROUTER_MODELS;
  const openAiModel = DEFAULT_OPENAI_MODEL;
  const groq = new Groq({ apiKey: config.groqApiKey ?? '' });

  return {
    defaultModel,
    anthropic: {
      messages: {
        async create({ max_tokens, messages }) {
          // 1️⃣ Groq
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
                reasoning_effort: 'low',
                messages: messages as Groq.Chat.ChatCompletionMessageParam[],
              });
              const text = completion.choices[0]?.message?.content ?? '';
              if (text.trim().length === 0) {
                // gpt-oss models can exhaust the whole max_tokens budget on
                // hidden reasoning and return finish_reason "length" with no
                // visible content — that's a 200 OK, so it must be treated
                // as a failure here or the fallback chain never reaches a
                // provider that can actually answer.
                throw new Error(
                  `Groq returned an empty response (finish_reason: ${completion.choices[0]?.finish_reason ?? 'unknown'})`,
                );
              }
              return { content: [{ type: 'text' as const, text }] };
            } catch (err) {
              console.warn(`[AI] Groq ${describeFailure(err)} — falling back to OpenRouter`);
            }
          }

          // 2️⃣ OpenRouter — try each model slot in order, skip on any error
          if (config.openRouterApiKey) {
            for (const orModel of openRouterModels) {
              try {
                const text = await callOpenRouter(messages, max_tokens, orModel, config.openRouterApiKey);
                return { content: [{ type: 'text' as const, text }] };
              } catch (err) {
                console.warn(`[AI] OpenRouter model "${orModel}" ${describeFailure(err)}`);
              }
            }
            console.warn('[AI] All OpenRouter models failed — falling back to OpenAI/Gemini');
          }

          // 3️⃣ OpenAI
          if (config.openAiApiKey) {
            try {
              const text = await callOpenAI(messages, max_tokens, openAiModel, config.openAiApiKey);
              return { content: [{ type: 'text' as const, text }] };
            } catch (err) {
              console.warn(`[AI] OpenAI ${describeFailure(err)} — falling back to Gemini`);
            }
          }

          // 4️⃣ Gemini
          if (config.geminiApiKey) {
            try {
              const text = await callGemini(messages, max_tokens, config.geminiApiKey);
              return { content: [{ type: 'text' as const, text }] };
            } catch (err) {
              console.warn(`[AI] Gemini ${describeFailure(err)}`);
            }
          }

          throw new Error(
            'All AI providers exhausted or unconfigured. Set GROQ_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY.',
          );
        },
      },
    },
  };
}
