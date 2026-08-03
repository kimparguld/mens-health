import { redirect } from "next/navigation";
import Link from "next/link";
import { getStripe } from "@/lib/stripe/client";
import { env } from "@/env";

type SearchParams = Promise<{ session_id?: string }>;

export default async function UpgradeSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { session_id } = await searchParams;

  // No session_id means the user navigated here directly — send them back.
  if (!session_id) {
    redirect("/upgrade");
  }

  // Verify the checkout session is genuinely complete via the Stripe API.
  // This prevents the success page from being spoofed by anyone who guesses
  // the route without going through a real checkout.
  if (env.STRIPE_SECRET_KEY) {
    try {
      const stripe = getStripe();
      const checkoutSession =
        await stripe.checkout.sessions.retrieve(session_id);
      if (checkoutSession.status !== "complete") {
        redirect("/upgrade");
      }
    } catch {
      // Stripe retrieve failed (invalid session_id, network error, etc.)
      redirect("/upgrade");
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <div className="rounded-2xl border border-green-200 bg-green-50 p-10">
        <span className="text-5xl">🎉</span>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          You&apos;re now a premium member!
        </h1>
        <p className="mt-2 text-gray-600">
          Thank you for supporting evidence-based men&apos;s health content.
          Your subscription is now active.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Back to digest
        </Link>
      </div>
    </main>
  );
}
