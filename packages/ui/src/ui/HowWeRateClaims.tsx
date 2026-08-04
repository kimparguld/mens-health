const RATINGS = [
  {
    label: 'Strong evidence',
    className: 'bg-emerald-100 text-emerald-800',
    description: 'Supported by multiple high-quality human studies or clinical guidelines.',
  },
  {
    label: 'Moderate evidence',
    className: 'bg-teal-100 text-teal-800',
    description: 'Supported, but still context-dependent or limited to certain populations.',
  },
  {
    label: 'Mixed / early',
    className: 'bg-amber-100 text-amber-800',
    description: 'Promising but uncertain. Results vary across studies or populations.',
  },
  {
    label: 'Weak evidence',
    className: 'bg-orange-100 text-orange-800',
    description: 'Mostly anecdotal, small studies, animal studies, or influencer claims.',
  },
  {
    label: 'Not supported',
    className: 'bg-red-100 text-red-800',
    description: 'Contradicted by existing evidence or scientifically implausible.',
  },
  {
    label: 'Not reviewed',
    className: 'bg-gray-100 text-gray-600',
    description: 'We have not yet reviewed the claims in this video.',
  },
];

export function HowWeRateClaims() {
  return (
    <section className="bg-gray-50 py-14">
      <div className="mx-auto max-w-[1120px] px-4">
        <h2 className="mb-2 text-2xl font-bold text-gray-900">How our evidence labels work</h2>
        <p className="mb-8 text-gray-600">Every claim we review gets one of five evidence ratings.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RATINGS.map(({ label, className, description }) => (
            <div key={label} className="border-hairline rounded-md border bg-white p-3">
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
                {label}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
