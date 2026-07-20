const EVIDENCE_CONFIG: Record<string, { label: string; className: string }> = {
  SUPPORTED: {
    label: "Strong evidence",
    className: "bg-emerald-100 text-emerald-800",
  },
  MIXED: {
    label: "Mixed / early",
    className: "bg-amber-100 text-amber-800",
  },
  WEAK: {
    label: "Weak evidence",
    className: "bg-orange-100 text-orange-800",
  },
  UNSUPPORTED: {
    label: "Not supported",
    className: "bg-red-100 text-red-800",
  },
  NOT_CHECKED: {
    label: "Not reviewed",
    className: "bg-gray-100 text-gray-600",
  },
};

export function EvidenceBadge({ status }: { status: string }) {
  const config = EVIDENCE_CONFIG[status] ?? EVIDENCE_CONFIG["NOT_CHECKED"];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
