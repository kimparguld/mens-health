import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe/client";
import { env } from "@/env";

// Stripe SDK requires Node.js runtime (uses Node crypto/http internals).
export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 },
    );
  }

  try {
    const stripe = getStripe();
    const appUrl = env.NEXT_PUBLIC_APP_URL;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
      customer_email: session.user.email,
      client_reference_id: (session.user as { id?: string }).id ?? undefined,
      subscription_data: {
        metadata: {
          userId: (session.user as { id?: string }).id ?? "",
        },
      },
      success_url: `${appUrl}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/upgrade`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    // Log the raw error server-side for debugging; never expose Stripe internals to the client.
    const message = err instanceof Error ? err.message : String(err);

    // Detect the common misconfiguration of passing a product ID instead of a price ID.
    if (
      message.includes("No such price") &&
      env.STRIPE_PRICE_ID?.startsWith("prod_")
    ) {
      console.error(
        "[stripe/checkout] Misconfiguration: STRIPE_PRICE_ID is set to a product ID ('%s'). It must be a price ID (starts with 'price_'). Update the environment variable in Vercel.",
        env.STRIPE_PRICE_ID,
      );
    } else {
      console.error("[stripe/checkout]", message);
    }

    return NextResponse.json(
      { error: "Payment service unavailable. Please try again shortly." },
      { status: 502 },
    );
  }
}
