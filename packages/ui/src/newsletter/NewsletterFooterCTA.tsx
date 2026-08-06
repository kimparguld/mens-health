import { twMerge } from 'tailwind-merge';
import { NewsletterSignupForm } from '../ui/NewsletterSignupForm';

type Props = {
  headline: string;
  description: string;
  site?: string;
};

export function NewsletterFooterCTA({ headline, description, site = 'menhealth' }: Props) {
  let wrapperClass = 'border-hairline bg-gray-50 py-12';
  let titleClass = 'text-emerald-700';
  let headlineClass = 'text-2xl text-gray-900';
  let descriptionClass = 'text-base text-gray-700';

  if (site === 'hype-check') {
    wrapperClass = 'border-hairline bg-ink-muted rounded-xl border px-6 py-8 text-center';
    titleClass = 'text-ink';
    headlineClass = 'text-xl text-white';
    descriptionClass = 'text-sm text-white/60';
  }

  return (
    <section className={twMerge('border-t', wrapperClass)}>
      <div className="mx-auto max-w-xl px-4 text-center">
        <p className={twMerge('mb-1 text-xs font-semibold tracking-wide uppercase', titleClass)}>Free newsletter</p>
        <h2 className={twMerge('mb-2  font-bold ', headlineClass)}>{headline}</h2>
        <p className={twMerge('mb-6 ', descriptionClass)}>{description}</p>
        <NewsletterSignupForm />
        <p className="mt-3 text-sm text-gray-600">Unsubscribe any time. No spam.</p>
      </div>
    </section>
  );
}
