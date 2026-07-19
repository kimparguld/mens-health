import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { db } from "@/lib/db/prisma";
import { env } from "@/env";

// Stripe requires the raw request body to verify webhook signatures.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 },
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await upsertSubscription(sub);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await db.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status: "CANCELED" },
      });
      // Revoke premium access
      const record = await db.subscription.findFirst({
        where: { stripeSubscriptionId: sub.id },
        select: { userId: true },
      });
      if (record) {
        await db.user.update({
          where: { id: record.userId },
          data: { isPremium: false },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function upsertSubscription(sub: Stripe.Subscription) {
  const userId = sub.metadata?.userId;
  if (!userId) return;

  const priceId = sub.items.data[0]?.price.id ?? "";
  // Stripe API 2026-06-24.dahlia replaced current_period_end with billing_schedules
  const periodEndTs = sub.billing_schedules[0]?.bill_until?.computed_timestamp;
  const periodEnd = periodEndTs
    ? new Date(periodEndTs * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // fallback: +30 days
  const isActive = sub.status === "active" || sub.status === "trialing";

  const statusMap: Record<string, string> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    trialing: "TRIALING",
    incomplete: "INCOMPLETE",
    paused: "PAUSED",
  };
  const status = statusMap[sub.status] ?? "INCOMPLETE";

  await db.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: {
      userId,
      stripeCustomerId: sub.customer as string,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      status: status as Parameters<
        typeof db.subscription.create
      >[0]["data"]["status"],
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    update: {
      status: status as Parameters<
        typeof db.subscription.create
      >[0]["data"]["status"],
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      stripePriceId: priceId,
    },
  });

  await db.user.update({
    where: { id: userId },
    data: { isPremium: isActive },
  });
}
