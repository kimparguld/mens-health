const EVIDENCE_CONFIG: Record<string, { label: string; className: string }> = {
  SUPPORTED: {
    label: 'Claim checked — strong evidence',
    className: 'bg-emerald-100 text-emerald-800',
  },
  MODERATE: {
    label: 'Claim checked — moderate evidence',
    className: 'bg-teal-100 text-teal-800',
  },
  MIXED: {
    label: 'Claim checked — mixed / early',
    className: 'bg-amber-100 text-amber-800',
  },
  WEAK: {
    label: 'Claim checked — weak evidence',
    className: 'bg-orange-100 text-orange-800',
  },
  UNSUPPORTED: {
    label: 'Claim checked — not supported',
    className: 'bg-red-100 text-red-800',
  },
  NOT_CHECKED: {
    label: 'Claim extracted — not yet reviewed',
    className: 'bg-gray-100 text-gray-600',
  },
};

const CHECKED_STATUSES = new Set([
  'SUPPORTED',
  'MODERATE',
  'MIXED',
  'WEAK',
  'UNSUPPORTED',
]);

/** Returns true when the claim has been actively reviewed against evidence. */
export function isClaimChecked(evidenceStatus: string): boolean {
  return CHECKED_STATUSES.has(evidenceStatus);
}

export function EvidenceBadge({
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
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config?.className}`}
    >
      {config?.label}
    </span>
  );
}
