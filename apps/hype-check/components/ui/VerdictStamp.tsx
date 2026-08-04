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

const SIZE_STYLES: Record<'sm' | 'lg', string> = {
  sm: 'px-2.5 py-0.5 text-xs',
  lg: 'px-4 py-1.5 text-base',
};

interface VerdictStampProps {
  verdict: VerdictType | null | undefined;
  size?: 'sm' | 'lg';
}

export function VerdictStamp({ verdict, size = 'sm' }: VerdictStampProps) {
  if (!verdict) return null;

  return (
    <span
      className={`inline-block rounded-sm border-[2.5px] font-slab font-black tracking-widest uppercase ${SIZE_STYLES[size]} ${VERDICT_STYLES[verdict]}`}
    >
      {verdict}
    </span>
  );
}
