import Link from "next/link";

export default function UpgradeSuccessPage() {
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
