"use client";

import { NewsletterSignupForm } from "../ui/NewsletterSignupForm";

type Props = {
  sourcePage?: string;
  headline: string;
  description: string;
};

export function NewsletterInlineCTA({ headline, description }: Props) {
  return (
    <section className="my-8 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-6">
      <h3 className="mb-1 text-base font-semibold text-emerald-900">
        {headline}
      </h3>
      <p className="mb-4 text-sm text-emerald-700">{description}</p>
      <NewsletterSignupForm />
    </section>
  );
}
