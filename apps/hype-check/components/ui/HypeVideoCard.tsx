import Image from 'next/image';
import Link from 'next/link';
import { EvidenceBadge, RiskBadge } from '@menhealth/ui';
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
      className="group flex flex-col overflow-hidden rounded-md border border-hairline bg-surface transition-colors hover:border-ink"
    >
      {thumbnailUrl && (
        <div className="relative aspect-video w-full bg-hairline/40">
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
              className="rounded-full border border-hairline px-2 py-0.5 text-xs font-medium text-ink-muted"
            >
              {name}
            </span>
          ))}
          {riskLevel && riskLevel !== 'LOW' && <RiskBadge level={riskLevel} />}
        </div>
        {(verdict || evidenceLabel || watchTimeMin) && (
          <div className="flex flex-wrap items-center gap-1.5">
            <VerdictStamp verdict={verdict} />
            {!verdict && evidenceLabel && (
              <EvidenceBadge status={evidenceLabel} />
            )}
            {watchTimeMin && (
              <span className="text-xs text-ink-muted">
                {watchTimeMin} min watch
              </span>
            )}
          </div>
        )}
        <h3 className="line-clamp-2 font-slab text-base font-bold text-ink">
          {title}
        </h3>
        {shortSummary && (
          <p className="line-clamp-2 text-xs text-ink-muted">{shortSummary}</p>
        )}
        <p className="mt-auto text-xs text-ink-muted">{channelTitle}</p>
      </div>
    </Link>
  );
}
