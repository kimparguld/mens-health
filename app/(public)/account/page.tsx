import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { SignOutButton } from "./SignOutButton";

export const dynamic = "force-dynamic";

type SessionUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
  isPremium?: boolean;
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const user = session.user as SessionUser;

  // Fetch live subscription record so status is always current
  const subscription = user.id
    ? await db.subscription.findUnique({ where: { userId: user.id } })
    : null;

  const isPremium =
    subscription?.status === "ACTIVE" || subscription?.status === "TRIALING";
  const periodEnd = subscription?.currentPeriodEnd;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Your account</h1>

      {/* Profile */}
      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-gray-500 uppercase">
          Profile
        </h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Email</dt>
            <dd className="font-medium text-gray-900">{user.email ?? "—"}</dd>
          </div>
          {user.name && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Name</dt>
              <dd className="font-medium text-gray-900">{user.name}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Subscription */}
      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-gray-500 uppercase">
          Subscription
        </h2>
        {isPremium ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                Premium active
              </span>
            </div>
            {periodEnd && (
              <p className="text-gray-500">
                {subscription?.cancelAtPeriodEnd
                  ? `Cancels on ${periodEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                  : `Renews on ${periodEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">You are on the free plan.</p>
            <Link
              href="/upgrade"
              className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Upgrade to premium — $9/mo
            </Link>
          </div>
        )}
      </section>

      {/* Actions */}
      <div className="flex justify-end">
        <SignOutButton />
      </div>
    </main>
  );
}
