export type VerdictType =
  | 'LEGIT'
  | 'MISLEADING'
  | 'OVERPRICED'
  | 'RISKY'
  | 'SCAM';

const VERDICT_STYLES: Record<VerdictType, string> = {
  LEGIT: 'border-verdict-legit text-verdict-legit -rotate-2',
  MISLEADING: 'border-verdict-misleading text-verdict-misleading rotate-2',
  OVERPRICED: 'border-verdict-overpriced text-verdict-overpriced -rotate-3',
  RISKY: 'border-verdict-risky text-verdict-risky rotate-3',
  SCAM: 'border-verdict-scam text-verdict-scam -rotate-2',
};

interface VerdictStampProps {
  verdict: VerdictType | null | undefined;
}

export function VerdictStamp({ verdict }: VerdictStampProps) {
  if (!verdict) return null;

  return (
    <span
      className={`inline-block rounded-sm border-[2.5px] px-2.5 py-0.5 font-slab text-xs font-black tracking-widest uppercase ${VERDICT_STYLES[verdict]}`}
    >
      {verdict}
    </span>
  );
}
