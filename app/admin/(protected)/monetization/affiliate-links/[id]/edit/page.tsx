import { notFound } from "next/navigation";
import { db } from "@/lib/db/prisma";
import { TOPIC_SEEDS } from "@/lib/youtube/topics";
import { AffiliateLinkForm } from "../../new/AffiliateLinkForm";

type Params = Promise<{ id: string }>;

export default async function EditAffiliateLinkPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const link = await db.affiliateLink.findUnique({ where: { id } });
  if (!link) notFound();

  const topics = TOPIC_SEEDS.map((t) => ({ slug: t.slug, name: t.name }));

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-gray-900">
        Edit affiliate link
      </h1>
      <AffiliateLinkForm
        linkId={link.id}
        topics={topics}
        defaultValues={{
          label: link.label,
          url: link.url,
          productName: link.productName,
          commission: link.commission ?? "",
          topicSlug: link.topicSlug ?? "",
        }}
      />
    </div>
  );
}
