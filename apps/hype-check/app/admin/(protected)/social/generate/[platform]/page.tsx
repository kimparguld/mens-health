import { db } from '@/lib/db/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DraftActions from '../../drafts/[id]/DraftActions';
import DraftGenerateAction from './DraftGenerateAction';
import EditDraftForm from './EditDraftForm';
import RedditPreview from './RedditPreview';
import TikTokPreview from './TikTokPreview';
import XPreview from './XPreview';
import YouTubeCommunityPreview from './YouTubeCommunityPreview';

const PLATFORMS = ['X', 'REDDIT', 'YOUTUBE_COMMUNITY', 'TIKTOK'] as const;
type Platform = (typeof PLATFORMS)[number];

const PLATFORM_LABELS: Record<Platform, string> = {
  X: 'X',
  REDDIT: 'Reddit',
  YOUTUBE_COMMUNITY: 'YouTube Community',
  TIKTOK: 'TikTok',
};

// A post is "active" for this page if it's still somewhere in the pipeline —
// terminal statuses (PUBLISHED/REJECTED/FAILED) fall through to the empty
// Generate state instead, same as clicking the old bulk button again would.
const NON_TERMINAL_STATUSES = new Set([
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'SCHEDULED',
]);
const REGENERATABLE_STATUSES = new Set(['DRAFT', 'PENDING_REVIEW']);

function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}

export default async function GenerateSocialDraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ platform: string }>;
  searchParams: Promise<{ videoId?: string }>;
}) {
  const { platform: platformParam } = await params;
  const { videoId } = await searchParams;

  if (!isPlatform(platformParam) || !videoId) notFound();
  const platform = platformParam;

  const video = await db.sourceVideo.findUnique({
    where: { id: videoId },
    select: { id: true, title: true },
  });

  if (!video) notFound();

  const latestPost = await db.socialPost.findFirst({
    where: { sourceId: videoId, platform },
    orderBy: { createdAt: 'desc' },
  });

  const post =
    latestPost && NON_TERMINAL_STATUSES.has(latestPost.status)
      ? latestPost
      : null;

  const hook = post?.hook ?? '';
  const script = post?.script ?? '';
  const caption = post?.caption ?? '';
  const hashtags = post?.hashtags ?? [];
  const previewProps = { hook, script, caption, hashtags };

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/admin/videos/${videoId}`}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          &larr; {video.title}
        </Link>
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
          {PLATFORM_LABELS[platform]}
        </span>
        {post && (
          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
            {post.status}
          </span>
        )}
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Preview</h2>
          {platform === 'X' && <XPreview {...previewProps} />}
          {platform === 'REDDIT' && <RedditPreview {...previewProps} />}
          {platform === 'YOUTUBE_COMMUNITY' && (
            <YouTubeCommunityPreview {...previewProps} />
          )}
          {platform === 'TIKTOK' && <TikTokPreview {...previewProps} />}
        </section>

        {post ? (
          <>
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                Edit draft
              </h2>
              <EditDraftForm
                key={post.updatedAt.toISOString()}
                postId={post.id}
                initialHook={hook}
                initialScript={script}
                initialCaption={caption}
                initialHashtags={hashtags}
                showScript={platform === 'TIKTOK'}
              />
            </section>

            {REGENERATABLE_STATUSES.has(post.status) && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-gray-700">
                  Regenerate
                </h2>
                <DraftGenerateAction mode="regenerate" postId={post.id} />
              </section>
            )}

            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                Actions
              </h2>
              <DraftActions
                postId={post.id}
                platform={post.platform}
                status={post.status}
                riskLevel={post.riskLevel}
                requiresReview={post.requiresReview}
                initialScheduledAt={post.scheduledAt?.toISOString() ?? null}
                caption={post.caption}
              />
            </section>
          </>
        ) : (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">
              Generate
            </h2>
            <DraftGenerateAction
              mode="generate"
              videoId={videoId}
              platform={platform}
            />
          </section>
        )}
      </div>
    </div>
  );
}
