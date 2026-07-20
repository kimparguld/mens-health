import { Resend } from "resend";
import { env } from "@/env";

declare global {
  var __resend: Resend | undefined;
}

function createResendClient(): Resend {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
}

export const resend: Resend =
  globalThis.__resend ?? (globalThis.__resend = createResendClient());
