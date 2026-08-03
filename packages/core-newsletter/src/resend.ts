import { Resend } from "resend";

declare global {
  var __resend: Resend | undefined;
}

/** Server-only singleton — never import in client components. */
export function createResendClient(apiKey: string | undefined): Resend {
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return globalThis.__resend ?? (globalThis.__resend = new Resend(apiKey));
}
