import Image from 'next/image';
import Link from 'next/link';
import { EvidenceBadge } from '../ui/EvidenceBadge';
import { RiskBadge } from '../ui/RiskBadge';

type VideoCardProps = {
  slug: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  shortSummary: string | null;
  trendScore: number;
  topicNames?: string[];
  topics?: Array<{ name: string; slug: string }>;
  riskLevel?: string;
  evidenceLabel?: string;
  durationSeconds?: number;
  customSizes?: string;
  priority?: boolean;
};

export function VideoCard({
  slug,
  title,
  channelTitle,
  thumbnailUrl,
  shortSummary,
  topicNames = [],
  topics,
  riskLevel,
  evidenceLabel,
  durationSeconds,
  customSizes,
  priority,
}: VideoCardProps) {
  const watchTimeMin = durationSeconds ? Math.ceil(durationSeconds / 60) : null;

  const sizes = customSizes ?? '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';

  return (
    <div className="border-hairline group flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md">
      {((topics && topics.length > 0) || topicNames.length > 0 || (riskLevel && riskLevel !== 'LOW')) && (
        <div className="flex flex-wrap items-center gap-1.5 px-2 py-2">
          {topics
            ? topics.slice(0, 2).map((t) => (
                <Link
                  key={t.slug}
                  href={`/topics/${t.slug}`}
                  className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 hover:bg-emerald-200"
                >
                  {t.name}
                </Link>
              ))
            : topicNames.slice(0, 2).map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                >
                  {name}
                </span>
              ))}
          {riskLevel && riskLevel !== 'LOW' && <RiskBadge level={riskLevel} className="text-xs" />}
        </div>
      )}
      <Link href={`/videos/${slug}`} className="flex flex-1 flex-col">
        {thumbnailUrl && (
          <div className="relative aspect-video w-full bg-gray-100">
            <Image src={thumbnailUrl} alt={title} fill className="object-cover" sizes={sizes} priority={priority} />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-2 p-4">
          {(evidenceLabel || watchTimeMin) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {evidenceLabel && <EvidenceBadge status={evidenceLabel} />}
              {watchTimeMin && <span className="text-xs text-gray-500">{watchTimeMin} min watch</span>}
            </div>
          )}
          <h3 className="line-clamp-2 text-base font-semibold text-gray-900 group-hover:text-emerald-700">{title}</h3>
          {shortSummary && <p className="line-clamp-2 text-sm text-gray-700">{shortSummary}</p>}
          <p className="mt-auto text-xs text-gray-500">{channelTitle}</p>
        </div>
      </Link>
    </div>
  );
}
