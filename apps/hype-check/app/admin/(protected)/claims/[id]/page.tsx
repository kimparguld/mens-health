import { db } from '@/lib/db/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClaimEditForm } from './ClaimEditForm';

export default async function AdminClaimEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const claim = await db.claim.findUnique({
    where: { id },
    include: {
      subject: {
        select: { id: true, name: true, editorialTitle: true, slug: true },
      },
      evidenceItems: { orderBy: { year: 'desc' } },
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
          href={`/admin/videos/${claim.subject.id}`}
          className="text-accent text-xs hover:underline"
        >
          From video: {claim.subject.editorialTitle ?? claim.subject.name} →
        </Link>
        {claim.slug && (
          <Link
            href={`/claims/${claim.slug}`}
            target="_blank"
            className="hover:text-accent ml-4 text-xs text-gray-400"
          >
            View live →
          </Link>
        )}
      </div>

      <ClaimEditForm
        claimId={claim.id}
        initialEvidenceStatus={claim.evidenceStatus}
        initialRiskLevel={claim.riskLevel}
        initialCategory={claim.claimType}
        initialExplanation={claim.explanation}
        initialSources={claim.evidenceItems.map((s) => ({
          id: s.id,
          title: s.title,
          url: s.url,
          source: s.source,
          year: s.year,
          summary: s.summary,
        }))}
        autoReviewed={claim.autoReviewed}
        needsConfirmation={
          claim.humanConfirmedAt === null &&
          claim.evidenceStatus !== 'NOT_CHECKED'
        }
      />
    </div>
  );
}
