export type EvidenceRatingKey = 'strong' | 'moderate' | 'mixed' | 'weak' | 'unsupported' | 'none';

const RATINGS: { key: EvidenceRatingKey; label: string; description: string }[] = [
  {
    key: 'strong',
    label: 'Strong evidence',
    description: 'Supported by multiple high-quality human studies or clinical guidelines.',
  },
  {
    key: 'moderate',
    label: 'Moderate evidence',
    description: 'Supported, but still context-dependent or limited to certain populations.',
  },
  {
    key: 'mixed',
    label: 'Mixed / early',
    description: 'Promising but uncertain. Results vary across studies or populations.',
  },
  {
    key: 'weak',
    label: 'Weak evidence',
    description: 'Mostly anecdotal, small studies, animal studies, or influencer claims.',
  },
  {
    key: 'unsupported',
    label: 'Not supported',
    description: 'Contradicted by existing evidence or scientifically implausible.',
  },
  {
    key: 'none',
    label: 'Not reviewed',
    description: 'We have not yet reviewed the claims in this video.',
  },
];

type Props = {
  badgeClassName: (key: EvidenceRatingKey) => string;
};

export function HowWeRateClaims({ badgeClassName }: Props) {
  return (
    <section className="border-hairline bg-bg-muted border-t py-14">
      <div className="mx-auto max-w-[1120px] px-4">
        <h2 className="text-text-primary mb-2 text-2xl font-bold">How our evidence labels work</h2>
        <p className="text-text-muted mb-8">Every claim we review gets one of five evidence ratings.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RATINGS.map(({ key, label, description }) => (
            <div key={key} className="border-hairline bg-bg-surface rounded-md border p-4">
              <span className={badgeClassName(key)}>{label}</span>
              <p className="text-text-muted mt-3 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
