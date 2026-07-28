"use client";

import { useRef } from "react";

type YouTubePlayerProps = {
  videoId: string;
  title: string;
  loading?: "lazy" | "eager";
};

export function YouTubePlayer({
  videoId,
  title,
  loading = "lazy",
}: YouTubePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <iframe
        ref={iframeRef}
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="h-full w-full"
        loading={loading}
      />
    </div>
  );
}
