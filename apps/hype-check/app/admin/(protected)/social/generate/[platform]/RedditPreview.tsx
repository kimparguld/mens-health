type Props = { hook: string; script: string; caption: string; hashtags: string[] };

export default function RedditPreview({ hook, caption }: Props) {
  return (
    <div className="max-w-lg rounded-lg border bg-white p-4">
      <p className="mb-1 text-xs text-gray-500">Posted in r/yoursubreddit</p>
      <h3 className="mb-2 text-base font-semibold text-gray-900">{hook}</h3>
      <p className="whitespace-pre-wrap text-sm text-gray-700">{caption}</p>
    </div>
  );
}
