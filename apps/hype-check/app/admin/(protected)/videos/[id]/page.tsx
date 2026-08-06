import { db } from '@/lib/db/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CostItemsEditor } from './CostItemsEditor';
import { DisclosuresEditor } from './DisclosuresEditor';
import GenerateSocialButton from './GenerateSocialButton';
import GenerateSummaryButton from './GenerateSummaryButton';
import GenerateWarningsButton from './GenerateWarningsButton';
import ReviewActions from './ReviewActions';
import ReviewerForm from './ReviewerForm';
import VerdictPanel from './VerdictPanel';
import { WarningSignsEditor } from './WarningSignsEditor';

const riskColors: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-red-100 text-red-700',
};

const evidenceColors: Record<string, string> = {
  SUPPORTED: 'text-green-700',
  MIXED: 'text-yellow-700',
  WEAK: 'text-orange-600',
  UNSUPPORTED: 'text-red-700',
  NOT_CHECKED: 'text-gray-500',
};

export default async function AdminVideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const subject = await db.subject.findUnique({
    where: { id },
    include: {
      channel: true,
      sourceVideos: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        include: { summaries: { orderBy: { createdAt: 'desc' }, take: 1 } },
      },
      claims: { orderBy: { riskLevel: 'desc' } },
      warningSigns: true,
      costItems: true,
      disclosures: true,
      adminReviews: { orderBy: { createdAt: 'desc' }, take: 5 },
      topics: { include: { topic: true } },
      verdict: true,
      verdictHistory: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });

  if (!subject) notFound();

  const sourceVideo = subject.sourceVideos[0];
  const summary = sourceVideo?.summaries[0];
  const title = subject.editorialTitle ?? sourceVideo?.title ?? subject.name;
  const takeaways = summary ? (summary.takeaways as string[]) : [];
  const warnings = summary ? ((summary.warnings as string[] | null) ?? []) : [];
  const redFlags = summary ? ((summary.redFlags as string[] | null) ?? []) : [];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/videos"
            className="text-accent mb-2 inline-block text-sm hover:underline"
          >
            &larr; Back to queue
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {subject.channel?.title ?? 'Unknown creator'} &bull;{' '}
            {subject.publishedAt?.toLocaleDateString() ?? '—'} &bull;{' '}
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${riskColors[subject.riskLevel] ?? ''}`}
            >
              {subject.riskLevel} risk
            </span>{' '}
            &bull;{' '}
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {subject.status}
            </span>
          </p>
        </div>

        {/* Review action buttons */}
        <div className="flex flex-col items-end gap-2">
          <ReviewActions
            videoId={subject.id}
            currentStatus={subject.status}
            hasSummary={!!summary}
            riskLevel={subject.riskLevel}
          />
          {subject.status === 'PUBLISHED' && (
            <GenerateSocialButton videoId={subject.id} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content — left 2 cols */}
        <div className="col-span-2 space-y-6">
          {/* YouTube embed */}
          {sourceVideo && (
            <div className="overflow-hidden rounded-lg border bg-black">
              <div className="relative aspect-video">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${sourceVideo.youtubeVideoId}`}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            </div>
          )}

          {/* AI Summary */}
          {summary ? (
            <section className="rounded-lg border bg-white p-5">
              <h2 className="mb-3 font-semibold text-gray-900">AI Summary</h2>
              <p className="mb-4 text-sm text-gray-700">
                {summary.shortSummary}
              </p>
              <p className="text-sm text-gray-600">{summary.longSummary}</p>

              {takeaways.length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-medium text-gray-700">
                    Key takeaways
                  </h3>
                  <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                    {takeaways.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              {warnings.length > 0 && (
                <div className="mt-4 rounded bg-yellow-50 p-3">
                  <h3 className="mb-1 text-sm font-medium text-yellow-800">
                    Warnings
                  </h3>
                  <ul className="list-inside list-disc space-y-1 text-sm text-yellow-700">
                    {warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {redFlags.length > 0 && (
                <div className="mt-4 rounded bg-red-50 p-3">
                  <h3 className="mb-1 text-sm font-medium text-red-800">
                    Red flags
                  </h3>
                  <ul className="list-inside list-disc space-y-1 text-sm text-red-700">
                    {redFlags.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              <ReviewerForm
                videoId={subject.id}
                initialName={summary.reviewerName}
                initialCredentials={summary.reviewerCredentials}
              />
            </section>
          ) : (
            <div className="rounded-lg border bg-gray-50 p-5">
              <p className="mb-3 text-sm text-gray-500">
                No AI summary generated yet.
              </p>
              <GenerateSummaryButton videoId={subject.id} />
            </div>
          )}

          {/* Claims */}
          {subject.claims.length > 0 && (
            <section className="rounded-lg border bg-white p-5">
              <h2 className="mb-4 font-semibold text-gray-900">
                Extracted claims ({subject.claims.length})
              </h2>
              <div className="space-y-3">
                {subject.claims.map(
                  (claim: (typeof subject.claims)[number]) => (
                    <div key={claim.id} className="rounded border p-3 text-sm">
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-medium ${riskColors[claim.riskLevel] ?? ''}`}
                        >
                          {claim.riskLevel}
                        </span>
                        <span className="text-xs text-gray-500">
                          {claim.claimType}
                        </span>
                        <span
                          className={`ml-auto text-xs font-medium ${evidenceColors[claim.evidenceStatus] ?? ''}`}
                        >
                          {claim.evidenceStatus === 'NOT_CHECKED'
                            ? 'Not checked'
                            : claim.evidenceStatus}
                        </span>
                      </div>
                      <p className="text-gray-800">{claim.text}</p>
                      {claim.explanation && (
                        <p className="mt-1 text-gray-500">
                          {claim.explanation}
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          {/* Warning signs, costs & disclosures */}
          <section className="rounded-lg border bg-white p-5">
            <h2 className="mb-4 font-semibold text-gray-900">
              Warning signs, costs &amp; disclosures
            </h2>
            {subject.warningSigns.length === 0 &&
              subject.costItems.length === 0 &&
              subject.disclosures.length === 0 && (
                <div className="mb-4">
                  <p className="mb-3 text-sm text-gray-500">
                    Nothing generated yet for this video.
                  </p>
                  <GenerateWarningsButton videoId={subject.id} />
                </div>
              )}
            <div className="space-y-6">
              <WarningSignsEditor
                subjectId={subject.id}
                initialItems={subject.warningSigns}
              />
              <CostItemsEditor
                subjectId={subject.id}
                initialItems={subject.costItems}
              />
              <DisclosuresEditor
                subjectId={subject.id}
                initialItems={subject.disclosures}
              />
            </div>
          </section>
        </div>

        {/* Sidebar — right col */}
        <div className="space-y-6">
          <VerdictPanel
            subjectId={subject.id}
            currentVerdict={subject.verdict}
            history={subject.verdictHistory}
          />

          {/* Topics */}
          {subject.topics.length > 0 && (
            <div className="rounded-lg border bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">
                Topics
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {subject.topics.map(
                  ({ topic }: (typeof subject.topics)[number]) => (
                    <span
                      key={topic.id}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        topic.isHighRisk
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {topic.name}
                    </span>
                  )
                )}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="rounded-lg border bg-white p-4 text-sm">
            <h3 className="mb-3 font-semibold text-gray-700">Stats</h3>
            <dl className="space-y-1">
              <div className="flex justify-between text-gray-600">
                <dt>Views</dt>
                <dd>{subject.viewCount?.toLocaleString() ?? '—'}</dd>
              </div>
              <div className="flex justify-between text-gray-600">
                <dt>Likes</dt>
                <dd>{subject.likeCount?.toLocaleString() ?? '—'}</dd>
              </div>
              <div className="flex justify-between text-gray-600">
                <dt>Trend score</dt>
                <dd>{subject.trendScore.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between text-gray-600">
                <dt>Relevance score</dt>
                <dd>{subject.relevanceScore.toFixed(2)}</dd>
              </div>
            </dl>
          </div>

          {/* Review history */}
          {subject.adminReviews.length > 0 && (
            <div className="rounded-lg border bg-white p-4 text-sm">
              <h3 className="mb-3 font-semibold text-gray-700">
                Review history
              </h3>
              <ol className="space-y-2">
                {subject.adminReviews.map(
                  (review: (typeof subject.adminReviews)[number]) => (
                    <li key={review.id} className="text-gray-600">
                      <span className="font-medium text-gray-800">
                        {review.action}
                      </span>
                      {review.note && (
                        <span className="ml-1 text-gray-500">
                          — {review.note}
                        </span>
                      )}
                      <span className="ml-1 text-xs text-gray-400">
                        {review.createdAt.toLocaleDateString()}
                      </span>
                    </li>
                  )
                )}
              </ol>
            </div>
          )}

          {/* YouTube link */}
          {sourceVideo && (
            <a
              href={`https://www.youtube.com/watch?v=${sourceVideo.youtubeVideoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent block rounded-lg border bg-white p-4 text-sm hover:underline"
            >
              Open on YouTube &rarr;
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
