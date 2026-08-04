import Link from "next/link";
import { TOPIC_SEEDS } from "@/lib/youtube/topics";
import { getRelatedTopicSlugs } from "@/lib/seo/related-topics";

export function RelatedTopics({ currentSlug }: { currentSlug: string }) {
  const relatedSlugs = getRelatedTopicSlugs(currentSlug);
  const relatedTopics = TOPIC_SEEDS.filter((t) =>
    relatedSlugs.includes(t.slug),
  );

  if (relatedTopics.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        Related topics
      </h2>
      <div className="flex flex-wrap gap-2">
        {relatedTopics.map((topic) => (
          <Link
            key={topic.slug}
            href={`/topics/${topic.slug}`}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-indigo-300 hover:text-indigo-700"
          >
            {topic.name} →
          </Link>
        ))}
      </div>
    </section>
  );
}
