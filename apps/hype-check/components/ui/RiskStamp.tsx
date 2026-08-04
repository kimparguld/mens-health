const RISK_CONFIG: Record<string, { label: string; className: string }> = {
  LOW: {
    label: 'Low risk',
    className: 'border-ink-muted/40 text-ink-muted/60',
  },
  MEDIUM: {
    label: 'Medium risk',
    className: 'border-verdict-misleading text-verdict-misleading',
  },
  HIGH: {
    label: 'High risk',
    className: 'border-verdict-risky text-verdict-risky',
  },
};

export function RiskStamp({ level }: { level: string }) {
  const config = RISK_CONFIG[level] ?? RISK_CONFIG['LOW'];

  return (
    <span
      className={`inline-block rounded-sm border-[1.5px] px-2 py-0.5 font-slab text-[0.65rem] font-bold tracking-wide uppercase ${config?.className}`}
    >
      {config?.label}
    </span>
  );
}
