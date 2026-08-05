const RISK_CONFIG: Record<string, { label: string; className: string }> = {
  LOW: {
    label: 'Low risk',
    className: 'bg-gray-100 text-gray-600',
  },
  MEDIUM: {
    label: 'Medium risk',
    className: 'bg-amber-100 text-amber-800',
  },
  HIGH: {
    label: 'High risk',
    className: 'bg-red-100 text-red-800',
  },
};

export function RiskBadge({ level }: { level: string }) {
  const config = RISK_CONFIG[level] ?? RISK_CONFIG['LOW'];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${config?.className}`}
    >
      {config?.label}
    </span>
  );
}
