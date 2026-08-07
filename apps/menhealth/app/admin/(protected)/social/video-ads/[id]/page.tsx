import { db } from '@/lib/db/prisma';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import VideoAdActions from './VideoAdActions';
import VideoPreviewTabs from './VideoPreviewTabs';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  RENDERING: 'bg-indigo-100 text-indigo-800',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  FAILED: 'bg-red-200 text-red-900',
};

export default async function VideoAdPackageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const adPackage = await db.adVideoPackage.findUnique({ where: { id } });

  if (!adPackage) notFound();

  const videos = [
    adPackage.landscapeUrl
      ? { label: 'Landscape 1920x1080', url: adPackage.landscapeUrl }
      : null,
    adPackage.verticalUrl
      ? { label: 'Vertical 1080x1920', url: adPackage.verticalUrl }
      : null,
    adPackage.squareUrl
      ? { label: 'Square 1080x1080', url: adPackage.squareUrl }
      : null,
  ].filter((item): item is { label: string; url: string } => Boolean(item));

  const subtitleText = adPackage.subtitleUrl
    ? await fetchSubtitleText(adPackage.subtitleUrl)
    : null;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/social/video-ads"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Ad video packages
        </Link>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[adPackage.status] ?? 'bg-gray-100 text-gray-700'}`}
        >
          {adPackage.status.replace('_', ' ')}
        </span>
      </div>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Script</h2>
        <pre className="text-sm whitespace-pre-wrap text-gray-900">
          {adPackage.script}
        </pre>
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Caption</h2>
        <pre className="text-sm whitespace-pre-wrap text-gray-900">
          {adPackage.caption}
        </pre>
        <div className="mt-3 flex flex-wrap gap-2">
          {adPackage.hashtags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Video previews
        </h2>
        <VideoPreviewTabs videos={videos} />
      </section>

      {adPackage.thumbnailUrl && (
        <section className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Thumbnail
          </h2>
          <Image
            src={adPackage.thumbnailUrl}
            alt="Ad package thumbnail"
            width={1200}
            height={675}
            className="h-auto w-full rounded border object-contain"
          />
        </section>
      )}

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Subtitles</h2>
        {subtitleText ? (
          <pre className="max-h-64 overflow-auto text-xs whitespace-pre-wrap text-gray-800">
            {subtitleText}
          </pre>
        ) : (
          <p className="text-sm text-gray-500">
            Subtitles are not available yet.
          </p>
        )}
      </section>

      {adPackage.errorMessage && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-5">
          <h2 className="mb-2 text-sm font-semibold text-red-700">
            Latest error
          </h2>
          <p className="text-sm text-red-700">{adPackage.errorMessage}</p>
        </section>
      )}

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Actions</h2>
        <VideoAdActions packageId={adPackage.id} status={adPackage.status} />
      </section>
    </div>
  );
}

async function fetchSubtitleText(subtitleUrl: string): Promise<string | null> {
  try {
    const response = await fetch(subtitleUrl, { cache: 'no-store' });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}
