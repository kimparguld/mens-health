import { STAMP_BASE_CLASS } from './stampStyles';

const EVIDENCE_CONFIG: Record<string, { label: string; className: string }> = {
  SUPPORTED: {
    label: 'Claim checked — strong evidence',
    className: 'border-verdict-legit text-verdict-legit',
  },
  MODERATE: {
    label: 'Claim checked — moderate evidence',
    className: 'border-verdict-legit text-verdict-legit',
  },
  MIXED: {
    label: 'Claim checked — mixed / early',
    className: 'border-verdict-misleading text-verdict-misleading',
  },
  WEAK: {
    label: 'Claim checked — weak evidence',
    className: 'border-verdict-overpriced text-verdict-overpriced',
  },
  UNSUPPORTED: {
    label: 'Claim checked — not supported',
    className: 'border-verdict-scam text-verdict-scam',
  },
  NOT_CHECKED: {
    label: 'Claim extracted — not yet reviewed',
    className: 'border-ink-muted/40 text-ink-muted/60',
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
    <span
      className={`${STAMP_BASE_CLASS} ${config?.className}`}
    >
      {config?.label}
    </span>
  );
}
