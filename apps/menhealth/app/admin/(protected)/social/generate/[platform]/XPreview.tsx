type Props = { hook: string; script: string; caption: string; hashtags: string[] };

const X_CAPTION_LIMIT = 280;

export default function XPreview({ caption, hashtags }: Props) {
  return (
    <div className="max-w-md rounded-2xl border bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-gray-200" />
        <div>
          <p className="text-sm font-semibold text-gray-900">Your handle</p>
          <p className="text-xs text-gray-500">@handle</p>
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm text-gray-900">{caption}</p>
      <p
        className={`mt-2 text-right text-xs ${
          caption.length > X_CAPTION_LIMIT ? "text-red-600" : "text-gray-400"
        }`}
      >
        {caption.length} / {X_CAPTION_LIMIT}
      </p>
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
