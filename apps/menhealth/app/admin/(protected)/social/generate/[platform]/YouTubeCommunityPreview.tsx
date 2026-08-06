type Props = { hook: string; script: string; caption: string; hashtags: string[] };

export default function YouTubeCommunityPreview({ hook, caption, hashtags }: Props) {
  return (
    <div className="max-w-md rounded-lg border bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-gray-200" />
        <p className="text-sm font-semibold text-gray-900">Your channel</p>
      </div>
      {hook && <p className="mb-1 text-sm font-medium text-gray-900">{hook}</p>}
      <p className="whitespace-pre-wrap text-sm text-gray-800">{caption}</p>
      {hashtags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {hashtags.map((tag) => (
            <span key={tag} className="text-xs text-blue-600">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
