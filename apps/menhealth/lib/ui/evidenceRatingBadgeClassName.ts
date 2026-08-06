import type { EvidenceRatingKey } from '@menhealth/ui';
import { twMerge } from 'tailwind-merge';

const BASE = 'inline-block rounded-full px-2.5 py-0.5 text-sm font-medium';

const COLOR_CLASS: Record<EvidenceRatingKey, string> = {
  strong: 'bg-status-strong-soft text-status-strong',
  moderate: 'bg-status-moderate-soft text-status-moderate',
  mixed: 'bg-status-mixed-soft text-status-mixed',
  weak: 'bg-status-weak-soft text-status-weak',
  unsupported: 'bg-status-unsupported-soft text-status-unsupported',
  none: 'bg-status-none-soft text-status-none',
};

export function evidenceRatingBadgeClassName(key: EvidenceRatingKey): string {
  return twMerge(BASE, COLOR_CLASS[key]);
}
