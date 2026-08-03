import Link from "next/link";
import Image from "next/image";

type RelatedVideo = {
  slug: string;
  title: string;
  thumbnailUrl: string | null;
  channelTitle: string;
};

type Props = {
  videos: RelatedVideo[];
  heading?: string;
};

export function RelatedVideos({ videos, heading = "Related videos" }: Props) {
  if (videos.length === 0) return null;

  return (
    <aside className="my-8">
      <h2 className="mb-3 text-base font-semibold text-gray-900">{heading}</h2>
      <ul className="space-y-3">
        {videos.map((video) => (
          <li key={video.slug}>
            <Link
              href={`/videos/${video.slug}`}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-emerald-300"
            >
              {video.thumbnailUrl && (
                <div className="relative h-14 w-24 flex-shrink-0 overflow-hidden rounded">
                  <Image
                    src={video.thumbnailUrl}
                    alt={video.title}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-medium text-gray-900">
                  {video.title}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {video.channelTitle}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
