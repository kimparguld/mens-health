import { VerdictStamp, type VerdictType } from './VerdictStamp';

interface VerdictHeroProps {
  verdict: VerdictType | null | undefined;
  rationale?: string | null;
}

export function VerdictHero({ verdict, rationale }: VerdictHeroProps) {
  return (
    <div className="border-hairline bg-paper mb-8 rounded-lg border p-6">
      {verdict ? (
        <>
          <VerdictStamp verdict={verdict} size="lg" />
          {rationale && (
            <p className="text-ink-muted mt-3 text-sm leading-relaxed">
              {rationale}
            </p>
          )}
        </>
      ) : (
        <p className="text-ink-muted/60 text-sm font-semibold tracking-wide uppercase">
          Not yet verdicted
        </p>
      )}
    </div>
  );
}
