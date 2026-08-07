'use client';

import { useState } from 'react';

type PreviewVideo = {
  label: string;
  url: string;
};

export default function VideoPreviewTabs({
  videos,
}: {
  videos: PreviewVideo[];
}) {
  const [index, setIndex] = useState(0);

  if (videos.length === 0) {
    return (
      <p className="text-sm text-gray-500">No rendered videos available yet.</p>
    );
  }

  const activeVideo = videos[index] ?? videos[0]!;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {videos.map((video, videoIndex) => (
          <button
            key={video.label}
            type="button"
            onClick={() => setIndex(videoIndex)}
            className={`rounded px-3 py-1.5 text-xs font-medium ${videoIndex === index ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {video.label}
          </button>
        ))}
      </div>

      <video
        key={activeVideo.url}
        controls
        className="w-full rounded-lg border bg-black"
        src={activeVideo.url}
      >
        <track kind="captions" />
      </video>
    </div>
  );
}
