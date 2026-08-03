import { notFound } from "next/navigation";
import { db } from "@/lib/db/prisma";
import { SponsorForm } from "../../new/SponsorForm";

type Params = Promise<{ id: string }>;

export default async function EditSponsorPage({ params }: { params: Params }) {
  const { id } = await params;
  const sponsor = await db.sponsor.findUnique({ where: { id } });
  if (!sponsor) notFound();

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Edit sponsor</h1>
      <SponsorForm
        sponsorId={sponsor.id}
        defaultValues={{
          name: sponsor.name,
          copyText: sponsor.copyText,
          ctaText: sponsor.ctaText,
          ctaUrl: sponsor.ctaUrl,
          isActive: sponsor.isActive,
          startDate: sponsor.startDate?.toISOString().split("T")[0] ?? "",
          endDate: sponsor.endDate?.toISOString().split("T")[0] ?? "",
        }}
      />
    </div>
  );
}
