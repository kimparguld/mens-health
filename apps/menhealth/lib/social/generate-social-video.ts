import type { Platform } from "@prisma/client";
import type { Result } from "@menhealth/core-social";
import { env } from "@/env";
import { createVideoPlan } from "./video-plan";
import { synthesizeNarrationAudio } from "./video-narration-audio";
import { renderVerticalVideo } from "./video-render";
import { uploadToBlob } from "./blob-storage";
import { checkForbiddenPatterns } from "./platform-rules";

export type GenerateSocialVideoInput = {
  hook: string;
  script: string;
  platform: Platform;
};

// Narration audio requires a paid OpenAI TTS tier. Disabled for now — videos
// render as a silent caption slideshow until this is turned back on.
const NARRATION_AUDIO_ENABLED = false;

function isAiConfigured(): boolean {
  return Boolean(
    env.ANTHROPIC_API_KEY ||
      env.GROQ_API_KEY ||
      env.OPENROUTER_API_KEY ||
      env.OPENAI_API_KEY ||
      env.GEMINI_API_KEY,
  );
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export async function generateSocialVideo(
  input: GenerateSocialVideoInput,
): Promise<Result<{ videoUrl: string }>> {
  if (!isAiConfigured()) {
    return { ok: false, error: new Error("No AI provider is configured.") };
  }
  if (NARRATION_AUDIO_ENABLED && !env.OPENAI_API_KEY) {
    return {
      ok: false,
      error: new Error(
        "Video generation requires OPENAI_API_KEY for narration audio.",
      ),
    };
  }
  if (!env.BLOB_READ_WRITE_TOKEN) {
    return {
      ok: false,
      error: new Error(
        "Video generation requires BLOB_READ_WRITE_TOKEN for asset storage.",
      ),
    };
  }

  const planResult = await createVideoPlan(input);
  if (!planResult.ok) return planResult;
  const plan = planResult.value;

  const combinedText = [plan.narration, ...plan.captionChunks].join(" ");
  const forbiddenCheck = checkForbiddenPatterns(combinedText);
  if (forbiddenCheck.matched) {
    return {
      ok: false,
      error: new Error(
        `Generated video content contains forbidden patterns: ${forbiddenCheck.violations
          .map((v) => v.reason)
          .join(", ")}`,
      ),
    };
  }

  let narrationAudio: Buffer | undefined;
  if (NARRATION_AUDIO_ENABLED) {
    try {
      narrationAudio = await synthesizeNarrationAudio(plan.narration);
    } catch (error) {
      return { ok: false, error: toError(error) };
    }
  }

  let videoBuffer: Buffer;
  try {
    videoBuffer = await renderVerticalVideo({
      narrationAudio,
      captionChunks: plan.captionChunks,
    });
  } catch (error) {
    return { ok: false, error: toError(error) };
  }

  try {
    const videoUrl = await uploadToBlob({
      pathname: `social-videos/${Date.now()}.mp4`,
      body: videoBuffer,
      contentType: "video/mp4",
      token: env.BLOB_READ_WRITE_TOKEN,
    });
    return { ok: true, value: { videoUrl } };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
