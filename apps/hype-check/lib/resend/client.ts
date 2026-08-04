import { env } from "@/env";
import { createResendClient } from "@menhealth/core-newsletter";

export const resend = createResendClient(env.RESEND_API_KEY);
