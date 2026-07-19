import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe/client";
import { env } from "@/env";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  if (!env.STRIPE_PRICE_ID) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  const appUrl = env.NEXT_PUBLIC_APP_URL;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
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
}
