import { NewsletterSignupForm } from "@/components/ui/NewsletterSignupForm";

export function NewsletterFooterCTA() {
  return (
    <section className="border-t border-gray-200 bg-gray-50 py-12">
      <div className="mx-auto max-w-xl px-4 text-center">
        <p className="mb-1 text-xs font-semibold tracking-wide text-emerald-700 uppercase">
          Free newsletter
        </p>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          The 5-Minute Men&apos;s Health Digest
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          Trending videos summarised, claims checked, practical takeaways —
          every week. No miracle cures, no fear-mongering.
        </p>
        <NewsletterSignupForm />
        <p className="mt-3 text-xs text-gray-400">
          Unsubscribe any time. No spam.
        </p>
      </div>
    </section>
  );
}
