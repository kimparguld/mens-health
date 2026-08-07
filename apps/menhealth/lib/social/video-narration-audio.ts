import { env } from "@/env";

const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";
const OPENAI_TTS_MODEL = "tts-1";
const DEFAULT_TTS_VOICE = "alloy";

export async function synthesizeNarrationAudio(
  narration: string,
): Promise<Buffer> {
  const response = await fetch(OPENAI_TTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_TTS_MODEL,
      voice: DEFAULT_TTS_VOICE,
      input: narration,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `OpenAI TTS request failed (${response.status}): ${details}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
