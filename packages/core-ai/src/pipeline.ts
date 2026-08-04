import { z } from "zod";
import type { AiClient } from "./client";
import type { Result } from "./result";

export type { Result } from "./result";

export type AiPipelineOptions = {
  /** Substituted into every prompt in place of the old hardcoded "MenHealth Digest". */
  siteName: string;
  /**
   * One-clause description of what this site is, substituted into every
   * prompt in place of the old hardcoded "a men's health content curation
   * platform" / "a men's health video review site". E.g. "a men's health
   * content curation platform" or "a platform that reviews trending
   * products, courses, and money-making claims for hype vs. reality".
   */
  domainDescription: string;
  /**
   * One-clause description of who FAQ content is written for, substituted
   * into generateTopicFaq's prompt in place of the old hardcoded "men aged
   * 30–55 who are health-conscious but not medical professionals".
   */
  audienceDescription: string;
};

// --- summarizeVideo ---------------------------------------------------------

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

// --- extractClaims -----------------------------------------------------------

const FactCheckSchema = z.object({
  evidenceStatus: z.enum(["SUPPORTED", "MIXED", "WEAK", "UNSUPPORTED"]),
  rationale: z
    .string()
    .min(1)
    .max(1000)
    .describe("Brief rationale for the evidence status"),
});

const ClaimSchema = z.object({
  text: z.string().min(1).describe("The health claim extracted from the video"),
  category: z.enum([
    "NUTRITION",
    "EXERCISE",
    "HORMONES",
    "MENTAL_HEALTH",
    "SUPPLEMENTS",
    "MEDICATIONS",
    "CANCER",
    "LONGEVITY",
    "SEXUAL_HEALTH",
    "OTHER",
  ]),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  explanation: z
    .string()
    .optional()
    .describe("Brief explanation of why this claim matters or is notable"),
  // Deliberately no "sources"/citations field: the AI provider chain actually
  // reached at runtime (Groq/OpenRouter/OpenAI/Gemini fallback) has no real
  // web-search grounding, so any AI-authored citation would be fabricated.
  // Real sources stay human-added via the claim edit form.
  factCheck: FactCheckSchema.optional().describe(
    "A preliminary fact-check verdict, used to auto-review low-risk claims and pre-fill medium-risk review",
  ),
});

const ClaimsOutputSchema = z.object({
  claims: z.array(ClaimSchema).max(10),
});

export type ExtractedClaim = z.infer<typeof ClaimSchema>;

export type ClaimExtractionInput = {
  title: string;
  description: string;
  shortSummary: string;
};

// --- factCheckClaim -----------------------------------------------------------

const FactCheckResultSchema = z.object({
  evidenceStatus: z.enum(["SUPPORTED", "MIXED", "WEAK", "UNSUPPORTED"]),
  rationale: z.string().min(1).max(1000),
});

export type FactCheckResult = z.infer<typeof FactCheckResultSchema>;

export type FactCheckClaimInput = {
  text: string;
  category: string;
};

// --- generateEditorialTitle ---------------------------------------------------

const EditorialTitleSchema = z.object({
  editorialTitle: z.string().min(1).max(120),
});

export type EditorialTitleInput = {
  title: string;
  shortSummary: string;
  channelTitle: string;
};

// --- generateTopicFaq ----------------------------------------------------------

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

/**
 * Binds the 5 AI content-generation functions to this site's AI client,
 * brand name, and domain/audience description, so callers keep calling
 * `summarizeVideo(input)` etc. exactly as before (see
 * apps/menhealth/lib/ai/pipeline.ts).
 *
 * Note: extractClaims/factCheckClaim's prompt wording and the claim
 * category enum below are still hardcoded to men's-health vocabulary
 * (NUTRITION/HORMONES/CANCER/etc., "TRT, medications, supplements") because
 * they're directly coupled to the Prisma `ClaimCategory` enum, which is
 * itself part of the app's own schema — not something this shared package
 * can parameterize away. A new site in a different topic vertical needs its
 * own category taxonomy end-to-end (Prisma schema + this package's claim
 * prompt + the admin claim editor), not just new siteName/domainDescription
 * values.
 */
export function createAiPipeline(client: AiClient, options: AiPipelineOptions) {
  const { siteName, domainDescription, audienceDescription } = options;

  async function summarizeVideo(
    input: SummaryInput,
  ): Promise<Result<SummaryOutput>> {
    const prompt = `You are an editorial analyst for ${siteName}, ${domainDescription}.

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
      const message = await client.anthropic.messages.create({
        model: client.defaultModel,
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

  async function extractClaims(
    input: ClaimExtractionInput,
  ): Promise<Result<ExtractedClaim[]>> {
    const prompt = `You are a health claims analyst for ${siteName}.

Extract factual health claims from the following video content. Focus on claims that are:
- Specific and verifiable (e.g. "X increases testosterone by Y%")
- Health-relevant (not general lifestyle advice)
- Either well-supported or potentially misleading

Risk level guide:
- HIGH: Claims about medications, TRT, hormones, sexual health, mental health treatment, cancer, supplements as cures
- MEDIUM: Diet claims, specific supplement dosages, training frequency claims with quantified outcomes
- LOW: General lifestyle advice, widely accepted recommendations

For each claim, also provide a preliminary fact-check verdict ("factCheck") based on general medical/scientific consensus you're aware of — evidenceStatus (SUPPORTED/MIXED/WEAK/UNSUPPORTED) plus a one-sentence rationale. Omit "factCheck" entirely if you're not confident enough to give a verdict. Do not include citations or source URLs — state only the verdict and rationale.

Video content:
Title: ${input.title}
Description: ${input.description.slice(0, 1000)}
Summary: ${input.shortSummary}

Respond with a JSON object:
{
  "claims": [
    {
      "text": "string",
      "category": "NUTRITION|EXERCISE|HORMONES|MENTAL_HEALTH|SUPPLEMENTS|MEDICATIONS|CANCER|LONGEVITY|SEXUAL_HEALTH|OTHER",
      "riskLevel": "LOW|MEDIUM|HIGH",
      "explanation": "string (optional)",
      "factCheck": {
        "evidenceStatus": "SUPPORTED|MIXED|WEAK|UNSUPPORTED",
        "rationale": "string"
      }
    }
  ]
}

Extract 0–10 claims. If there are no notable health claims, return an empty array.
Respond ONLY with the JSON object.`;

    try {
      const message = await client.anthropic.messages.create({
        model: client.defaultModel,
        max_tokens: 1000,
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
          error: new Error(`AI response was not valid JSON`),
        };
      }

      const validated = ClaimsOutputSchema.safeParse(parsed);
      if (!validated.success) {
        return {
          ok: false,
          error: new Error(
            `Claims output failed validation: ${validated.error.message}`,
          ),
        };
      }

      return { ok: true, value: validated.data.claims };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  // Fact-checks a single already-extracted claim in isolation (no video
  // context needed) — used to backfill evidence review for claims created
  // before auto-review existed. Deliberately no "sources"/citations: the AI
  // provider chain reached at runtime has no real web-search grounding, so
  // any AI-authored citation would be fabricated. Real sources stay
  // human-added via the claim edit form.
  async function factCheckClaim(
    input: FactCheckClaimInput,
  ): Promise<Result<FactCheckResult>> {
    const prompt = `You are a health claims fact-checker for ${siteName}.

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
      const message = await client.anthropic.messages.create({
        model: client.defaultModel,
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

  async function generateEditorialTitle(
    input: EditorialTitleInput,
  ): Promise<Result<string>> {
    const prompt = `You are an SEO editor for ${siteName}, ${domainDescription}.

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
      const message = await client.anthropic.messages.create({
        model: client.defaultModel,
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

  async function generateTopicFaq(
    input: FaqGenerationInput,
  ): Promise<Result<FaqOutput>> {
    const videoContext =
      input.videoSummaries.length > 0
        ? input.videoSummaries
            .map((v, i) => `${i + 1}. "${v.title}": ${v.shortSummary}`)
            .join("\n")
        : "No videos available yet.";

    const prompt = `You are an editorial analyst for ${siteName}, ${domainDescription}.

Generate an SEO-optimised intro paragraph and 3–5 Frequently Asked Questions for the topic: "${input.topicName}".

Topic description: ${input.topicDescription}

Recent published videos on this topic:
${videoContext}

RULES:
- Write for ${audienceDescription}.
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
      const message = await client.anthropic.messages.create({
        model: client.defaultModel,
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

  return {
    summarizeVideo,
    extractClaims,
    factCheckClaim,
    generateEditorialTitle,
    generateTopicFaq,
  };
}
