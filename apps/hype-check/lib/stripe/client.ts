import { env } from "@/env";
import { createStripeClient } from "@menhealth/core-monetization";

export const getStripe = createStripeClient(env.STRIPE_SECRET_KEY);
