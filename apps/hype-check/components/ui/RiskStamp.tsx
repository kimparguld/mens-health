import { STAMP_BASE_CLASS } from './stampStyles';

const RISK_CONFIG: Record<string, { label: string; className: string }> = {
  LOW: {
    label: 'Low risk',
    className: 'border-ink-muted/40 text-ink-muted/60 rotate-3',
  },
  MEDIUM: {
    label: 'Medium risk',
    className: 'border-verdict-misleading text-verdict-misleading rotate-1',
  },
  HIGH: {
    label: 'High risk',
    className: 'border-verdict-risky text-verdict-risky -rotate-3',
  },
};

export function RiskStamp({ level }: { level: string }) {
  const config = RISK_CONFIG[level] ?? RISK_CONFIG['LOW'];

  return (
    <span className={`${STAMP_BASE_CLASS} ${config?.className}`}>
      {config?.label}
    </span>
  );
}
