"use client";

import Image from "next/image";
import { useState } from "react";

type YouTubePlayerProps = {
  videoId: string;
  title: string;
  thumbnailUrl?: string | null;
  loading?: "lazy" | "eager";
};

export function YouTubePlayer({
  videoId,
  title,
  thumbnailUrl,
  loading = "lazy",
}: YouTubePlayerProps) {
  const [playing, setPlaying] = useState(false);

  if (!playing && thumbnailUrl) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={`Play video: ${title}`}
        className="group relative aspect-video w-full overflow-hidden rounded-lg bg-black"
      >
        <Image
          src={thumbnailUrl}
          alt={title}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-hover:scale-105">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="ml-1 h-7 w-7 text-red-600"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1${playing ? "&autoplay=1" : ""}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="h-full w-full"
        loading={loading}
      />
    </div>
  );
}
