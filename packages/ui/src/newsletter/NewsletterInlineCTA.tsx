'use client';

import { NewsletterSignupForm } from '../ui/NewsletterSignupForm';

type Props = {
  headline: string;
  description: string;
  site?: string;
};

export function NewsletterInlineCTA({ headline, description, site = 'menhealth' }: Props) {
  let wrapperClass = 'border-emerald-200 bg-emerald-50';
  let titleClass = 'text-emerald-900';
  let descriptionClass = 'text-emerald-700';

  if (site === 'hype-check') {
    wrapperClass = 'border-hairline bg-ink-muted rounded-xl border px-6 py-8';
    titleClass = 'text-ink';
    descriptionClass = 'text-white/60';
  }

  return (
    <section className={`my-8 rounded-xl border px-6 py-6 ${wrapperClass}`}>
      <h3 className={`mb-1 text-lg font-semibold ${titleClass}`}>{headline}</h3>
      <p className={`mb-4 text-sm ${descriptionClass}`}>{description}</p>
      <NewsletterSignupForm />
    </section>
  );
}
