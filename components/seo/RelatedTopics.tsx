import Link from "next/link";

type Topic = {
  slug: string;
  name: string;
  description?: string | null;
};

type Props = {
  topics: Topic[];
  heading?: string;
};

export function RelatedTopics({ topics, heading = "Related topics" }: Props) {
  if (topics.length === 0) return null;

  return (
    <aside className="my-8">
      <h2 className="mb-3 text-base font-semibold text-gray-900">{heading}</h2>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <Link
            key={topic.slug}
            href={`/topics/${topic.slug}`}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
            title={topic.description ?? undefined}
          >
            {topic.name}
          </Link>
        ))}
      </div>
    </aside>
  );
}
