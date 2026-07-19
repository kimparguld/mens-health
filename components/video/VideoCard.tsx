import Image from "next/image";
import Link from "next/link";

type VideoCardProps = {
  slug: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  shortSummary: string | null;
  trendScore: number;
  topicNames: string[];
};

export function VideoCard({
  slug,
  title,
  channelTitle,
  thumbnailUrl,
  shortSummary,
  topicNames,
}: VideoCardProps) {
  return (
    <Link
      href={`/videos/${slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {thumbnailUrl && (
        <div className="relative aspect-video w-full bg-gray-100">
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap gap-1">
          {topicNames.slice(0, 2).map((name) => (
            <span
              key={name}
              className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
            >
              {name}
            </span>
          ))}
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-blue-700">
          {title}
        </h3>
        {shortSummary && (
          <p className="line-clamp-2 text-xs text-gray-500">{shortSummary}</p>
        )}
        <p className="mt-auto text-xs text-gray-400">{channelTitle}</p>
      </div>
    </Link>
  );
}
