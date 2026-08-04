import { EvidenceStamp } from '@/components/ui/EvidenceStamp';
import { RiskStamp } from '@/components/ui/RiskStamp';
import Image from 'next/image';
import Link from 'next/link';
import { VerdictStamp, type VerdictType } from './VerdictStamp';

type HypeVideoCardProps = {
  slug: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  shortSummary: string | null;
  trendScore: number;
  topicNames: string[];
  riskLevel?: string;
  evidenceLabel?: string;
  verdict?: VerdictType | null;
  durationSeconds?: number;
  customSizes?: string;
  priority?: boolean;
};

export function HypeVideoCard({
  slug,
  title,
  channelTitle,
  thumbnailUrl,
  shortSummary,
  topicNames,
  riskLevel,
  evidenceLabel,
  verdict,
  durationSeconds,
  customSizes,
  priority,
}: HypeVideoCardProps) {
  const watchTimeMin = durationSeconds ? Math.ceil(durationSeconds / 60) : null;

  const sizes =
    customSizes ?? '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';

  return (
    <Link
      href={`/videos/${slug}`}
      className="group border-hairline flex flex-col overflow-hidden rounded-md border bg-white shadow-sm transition-shadow hover:shadow-xl"
    >
      {thumbnailUrl && (
        <div className="bg-hairline/40 relative aspect-video w-full">
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover"
            sizes={sizes}
            priority={priority}
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {topicNames.slice(0, 2).map((name) => (
            <span
              key={name}
              className="border-hairline text-ink-muted rounded-full border px-2 py-0.5 text-xs font-medium"
            >
              {name}
            </span>
          ))}
          {riskLevel && riskLevel !== 'LOW' && <RiskStamp level={riskLevel} />}
        </div>
        {(verdict || evidenceLabel || watchTimeMin) && (
          <div className="flex flex-wrap items-center gap-1.5">
            <VerdictStamp verdict={verdict} />
            {!verdict && evidenceLabel && (
              <EvidenceStamp status={evidenceLabel} />
            )}
            {watchTimeMin && (
              <span className="text-xs text-gray-500">
                {watchTimeMin} min watch
              </span>
            )}
          </div>
        )}
        <h3 className="text-ink line-clamp-2 text-base font-semibold">
          {title}
        </h3>
        {shortSummary && (
          <p className="text-ink-muted line-clamp-2 text-xs">{shortSummary}</p>
        )}
        <p className="mt-auto text-xs text-gray-500">{channelTitle}</p>
      </div>
    </Link>
  );
}
