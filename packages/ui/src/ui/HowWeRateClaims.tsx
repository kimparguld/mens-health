import { twMerge } from 'tailwind-merge';

const RATINGS = ({ site }: { site?: string }) => {
  const isHypeCheck = site === 'hype-check';

  return [
    {
      label: 'Strong evidence',
      className: isHypeCheck ? 'border-verdict-legit text-verdict-legit rotate-1' : 'bg-emerald-100 text-emerald-800',
      description: 'Supported by multiple high-quality human studies or clinical guidelines.',
    },
    {
      label: 'Moderate evidence',
      className: isHypeCheck ? 'border-verdict-legit text-verdict-legit rotate-1' : 'bg-teal-100 text-teal-800',
      description: 'Supported, but still context-dependent or limited to certain populations.',
    },
    {
      label: 'Mixed / early',
      className: isHypeCheck
        ? 'border-verdict-misleading text-verdict-misleading rotate-1'
        : 'bg-amber-100 text-amber-800',
      description: 'Promising but uncertain. Results vary across studies or populations.',
    },
    {
      label: 'Weak evidence',
      className: isHypeCheck
        ? 'border-verdict-overpriced text-verdict-overpriced -rotate-1'
        : 'bg-orange-100 text-orange-800',
      description: 'Mostly anecdotal, small studies, animal studies, or influencer claims.',
    },
    {
      label: 'Not supported',
      className: isHypeCheck ? 'border-verdict-scam text-verdict-scam -rotate-1' : 'bg-red-100 text-red-800',
      description: 'Contradicted by existing evidence or scientifically implausible.',
    },
    {
      label: 'Not reviewed',
      className: isHypeCheck ? 'border-ink-muted/40 text-ink-muted/60' : 'bg-gray-100 text-gray-600',
      description: 'We have not yet reviewed the claims in this video.',
    },
  ];
};

type Props = {
  site?: string;
};

export function HowWeRateClaims({ site }: Props) {
  const isHypeCheck = site === 'hype-check';
  const baseClass = !isHypeCheck
    ? 'inline-block rounded-full px-2.5 py-0.5 text-sm font-medium'
    : 'inline-block rounded-sm border-[1.5px] px-2.5 py-0.5 font-slab text-sm font-bold tracking-wide uppercase';

  return (
    <section className="border-hairline border-t bg-gray-50 py-14">
      <div className="mx-auto max-w-[1120px] px-4">
        <h2 className="mb-2 text-2xl font-bold text-gray-900">How our evidence labels work</h2>
        <p className="mb-8 text-gray-700">Every claim we review gets one of five evidence ratings.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RATINGS({ site }).map(({ label, className, description }) => (
            <div key={label} className="border-hairline rounded-md border bg-white p-4">
              <span className={twMerge(baseClass, className)}>{label}</span>
              <p className="mt-3 text-sm leading-relaxed text-gray-700">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
