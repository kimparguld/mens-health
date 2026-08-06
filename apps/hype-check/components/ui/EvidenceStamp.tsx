import { twMerge } from 'tailwind-merge';
import { STAMP_BASE_CLASS } from './stampStyles';

const EVIDENCE_CONFIG: Record<string, { label: string; className: string }> = {
  SUPPORTED: {
    label: 'Claim checked — strong evidence',
    className: 'border-verdict-legit text-verdict-legit rotate-1',
  },
  MODERATE: {
    label: 'Claim checked — moderate evidence',
    className: 'border-verdict-moderate text-verdict-moderate rotate-1',
  },
  MIXED: {
    label: 'Claim checked — mixed / early',
    className: 'border-verdict-misleading text-verdict-misleading rotate-1',
  },
  WEAK: {
    label: 'Claim checked — weak evidence',
    className: 'border-verdict-overpriced text-verdict-overpriced -rotate-1',
  },
  UNSUPPORTED: {
    label: 'Claim checked — not supported',
    className: 'border-verdict-scam text-verdict-scam -rotate-1',
  },
  NOT_CHECKED: {
    label: 'Claim extracted — not yet reviewed',
    className: 'border-muted/40 text-muted/60',
  },
};

export function EvidenceStamp({
  status,
  showNotChecked = false,
}: {
  status: string;
  showNotChecked?: boolean;
}) {
  if (status === 'NOT_CHECKED' && !showNotChecked) return null;
  const config = EVIDENCE_CONFIG[status] ?? EVIDENCE_CONFIG['NOT_CHECKED'];

  return (
    <span className={twMerge(STAMP_BASE_CLASS, 'my-1', config?.className)}>
      {config?.label}
    </span>
  );
}
