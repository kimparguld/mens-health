import { twMerge } from 'tailwind-merge';
import { STAMP_BASE_CLASS } from './stampStyles';

const RISK_CONFIG: Record<string, { label: string; className: string }> = {
  LOW: {
    label: 'Low risk',
    className:
      'border-ink-muted/40 text-ink-muted/60 relative -top-0.5 rotate-2',
  },
  MEDIUM: {
    label: 'Medium risk',
    className:
      'border-verdict-misleading text-verdict-misleading relative -top-0.5 rotate-0.5',
  },
  HIGH: {
    label: 'High risk',
    className:
      'border-verdict-risky text-verdict-risky -rotate-2 relative -top-0.5',
  },
};

export function RiskStamp({ level }: { level: string }) {
  const config = RISK_CONFIG[level] ?? RISK_CONFIG['LOW'];

  return (
    <span className={twMerge(STAMP_BASE_CLASS, config?.className)}>
      {config?.label}
    </span>
  );
}
