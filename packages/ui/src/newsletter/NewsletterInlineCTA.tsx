"use client";

import { NewsletterSignupForm } from "../ui/NewsletterSignupForm";

type Props = {
  sourcePage?: string;
  headline?: string;
};

export function NewsletterInlineCTA({
  headline = "Get the weekly men's health digest",
}: Props) {
  return (
    <section className="my-8 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-6">
      <h3 className="mb-1 text-base font-semibold text-emerald-900">
        {headline}
      </h3>
      <p className="mb-4 text-sm text-emerald-700">
        5 trending videos summarised · 3 claims checked · 1 practical takeaway —
        every week. No miracle-cure nonsense.
      </p>
      <NewsletterSignupForm />
    </section>
  );
}
