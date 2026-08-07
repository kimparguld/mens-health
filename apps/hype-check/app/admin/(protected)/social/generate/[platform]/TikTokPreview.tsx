type Props = { hook: string; script: string; caption: string; hashtags: string[] };

export default function TikTokPreview({ hook, script, caption, hashtags }: Props) {
  return (
    <div className="max-w-md rounded-lg border bg-black p-4 text-white">
      <p className="mb-2 text-xs font-semibold text-gray-300">On-camera script</p>
      <p className="mb-3 text-sm font-semibold text-white">{hook}</p>
      <pre className="mb-3 whitespace-pre-wrap text-sm text-gray-100">{script}</pre>
      <p className="mb-1 text-xs font-semibold text-gray-300">Caption</p>
      <p className="whitespace-pre-wrap text-sm text-gray-200">{caption}</p>
      {hashtags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {hashtags.map((tag) => (
            <span key={tag} className="text-xs text-blue-300">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
