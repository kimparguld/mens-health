import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/prisma";
import { ClaimEditForm } from "./ClaimEditForm";

export default async function AdminClaimEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const claim = await db.claim.findUnique({
    where: { id },
    include: {
      video: { select: { id: true, title: true, slug: true } },
      sources: { orderBy: { year: "desc" } },
    },
  });

  if (!claim) notFound();

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/claims"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Claims
        </Link>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <p className="mb-1 text-xs font-medium text-gray-500 uppercase">
          Claim
        </p>
        <p className="mb-3 text-gray-900">{claim.text}</p>
        <Link
          href={`/admin/videos/${claim.video.id}`}
          className="text-xs text-blue-600 hover:underline"
        >
          From video: {claim.video.title} →
        </Link>
        {claim.slug && (
          <Link
            href={`/claims/${claim.slug}`}
            target="_blank"
            className="ml-4 text-xs text-gray-400 hover:text-blue-600"
          >
            View live →
          </Link>
        )}
      </div>

      <ClaimEditForm
        claimId={claim.id}
        initialEvidenceStatus={claim.evidenceStatus}
        initialRiskLevel={claim.riskLevel}
        initialExplanation={claim.explanation}
        initialSources={claim.sources.map((s) => ({
          id: s.id,
          title: s.title,
          url: s.url,
          source: s.source,
          year: s.year,
          summary: s.summary,
        }))}
      />
    </div>
  );
}
