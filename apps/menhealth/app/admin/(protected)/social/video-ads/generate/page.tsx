import Link from 'next/link';
import GenerateAdPackageButton from './GenerateAdPackageButton';

export default function GenerateVideoAdPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/admin/social/video-ads"
        className="text-sm text-gray-500 hover:text-gray-900"
      >
        ← Ad video packages
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Generate ad package
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Creates a new AI-scripted promo package, synthesizes voiceover, and
          starts async rendering for landscape, vertical, and square formats.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">
          How it works
        </h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-600">
          <li>Generate script, caption, and hashtags.</li>
          <li>Run compliance checks before rendering.</li>
          <li>
            Render the 3 aspect ratios, thumbnail, and subtitles asynchronously.
          </li>
          <li>Review and explicitly approve before download.</li>
        </ol>
      </div>

      <GenerateAdPackageButton />
    </div>
  );
}
