import Link from "next/link";

const PLATFORMS = [
  { value: "X", label: "Generate for X" },
  { value: "REDDIT", label: "Generate for Reddit" },
  { value: "YOUTUBE_COMMUNITY", label: "Generate for YouTube Community" },
  { value: "TIKTOK", label: "Generate for TikTok" },
] as const;

export default function GenerateSocialButton({ videoId }: { videoId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PLATFORMS.map((p) => (
        <Link
          key={p.value}
          href={`/admin/social/generate/${p.value}?videoId=${videoId}`}
          className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          {p.label}
        </Link>
      ))}
    </div>
  );
}
