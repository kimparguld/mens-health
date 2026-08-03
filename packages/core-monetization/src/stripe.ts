import Stripe from "stripe";

/**
 * Returns a lazy, memoized getStripe() bound to this site's own secret key.
 * Server-only — never import in client components.
 */
export function createStripeClient(secretKey: string | undefined): () => Stripe {
  let _stripe: Stripe | null = null;

  return function getStripe(): Stripe {
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    if (!_stripe) {
      _stripe = new Stripe(secretKey, {
        apiVersion: "2026-06-24.dahlia",
        typescript: true,
      });
    }
    return _stripe;
  };
}
