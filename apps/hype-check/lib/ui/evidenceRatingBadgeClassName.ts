import type { EvidenceRatingKey } from '@menhealth/ui';
import { twMerge } from 'tailwind-merge';

const BASE =
  'inline-block rounded-sm border-[1.5px] px-2.5 py-0.5 font-slab text-sm font-bold tracking-wide uppercase';

const COLOR_CLASS: Record<EvidenceRatingKey, string> = {
  strong: 'border-status-strong text-status-strong rotate-1',
  moderate: 'border-status-strong text-status-strong rotate-1',
  mixed: 'border-status-mixed text-status-mixed rotate-1',
  weak: 'border-status-weak text-status-weak -rotate-1',
  unsupported: 'border-status-unsupported text-status-unsupported -rotate-1',
  none: 'border-ink-muted/40 text-ink-muted/60',
};

export function evidenceRatingBadgeClassName(key: EvidenceRatingKey): string {
  return twMerge(BASE, COLOR_CLASS[key]);
}
