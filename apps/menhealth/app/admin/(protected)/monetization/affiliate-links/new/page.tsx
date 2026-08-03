import { TOPIC_SEEDS } from "@/lib/youtube/topics";
import { AffiliateLinkForm } from "./AffiliateLinkForm";

export default function NewAffiliateLinkPage() {
  const topics = TOPIC_SEEDS.map((t) => ({ slug: t.slug, name: t.name }));

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-gray-900">
        New affiliate link
      </h1>
      <AffiliateLinkForm topics={topics} />
    </div>
  );
}
