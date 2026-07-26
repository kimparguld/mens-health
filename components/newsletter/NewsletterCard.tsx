import { NewsletterSignupForm } from "@/components/ui/NewsletterSignupForm";

export function NewsletterCard() {
  return (
    <aside className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="mb-1 text-xs font-semibold tracking-wide text-emerald-700 uppercase">
        Free weekly digest
      </p>
      <h3 className="mb-2 text-lg font-bold text-gray-900">
        Stay ahead of trending men&apos;s health claims
      </h3>
      <ul className="mb-4 space-y-1 text-sm text-gray-600">
        <li>✓ 5 trending videos summarised</li>
        <li>✓ 3 claims checked against evidence</li>
        <li>✓ 1 practical takeaway per week</li>
        <li>✓ No hype. No miracle cures.</li>
      </ul>
      <NewsletterSignupForm />
    </aside>
  );
}
