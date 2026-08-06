import { EvidenceStamp } from '@/components/ui/EvidenceStamp';
import { RiskStamp } from '@/components/ui/RiskStamp';
import { auth } from '@/lib/auth';
import { premium } from '@/lib/flags/feature-flags';
import { PremiumGate } from '@menhealth/ui';
type Claim = {
  id: string;
  text: string;
  riskLevel: string;
  evidenceStatus: string;
  explanation: string | null;
};

export async function PremiumSection({ claims }: { claims: Claim[] }) {
  const session = await auth();
  const isPremium =
    (session?.user as { isPremium?: boolean } | undefined)?.isPremium === true;

  return (
    <PremiumGate
      isPremium={isPremium}
      premiumEnabled={premium?.isEnabled() ?? false}
    >
      <div className="space-y-4">
        {claims.map((claim) => (
          <div key={claim.id} className="border-hairline rounded-lg border p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <RiskStamp level={claim.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH'} />
              <EvidenceStamp
                status={
                  claim.evidenceStatus as
                    | 'SUPPORTED'
                    | 'MIXED'
                    | 'WEAK'
                    | 'UNSUPPORTED'
                    | 'NOT_CHECKED'
                }
              />
            </div>
            <p className="text-muted text-sm font-medium">{claim.text}</p>
            {claim.explanation && (
              <p className="text-muted/60 mt-1 text-sm">{claim.explanation}</p>
            )}
          </div>
        ))}
      </div>
    </PremiumGate>
  );
}
