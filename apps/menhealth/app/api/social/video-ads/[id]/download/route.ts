import { auth } from '@/lib/auth';
import { db } from '@/lib/db/prisma';
import { ApprovePostSchema } from '@/lib/social/validation';
import { createZip } from '@/lib/social/zip';
import { NextRequest, NextResponse } from 'next/server';
import 'server-only';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const parsed = ApprovePostSchema.safeParse({ postId: id });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid package ID' }, { status: 422 });
  }

  const adPackage = await db.adVideoPackage.findUnique({ where: { id } });
  if (!adPackage || adPackage.status !== 'APPROVED') {
    return NextResponse.json(
      { error: 'Ad package not found' },
      { status: 404 }
    );
  }

  if (
    !adPackage.landscapeUrl ||
    !adPackage.verticalUrl ||
    !adPackage.squareUrl ||
    !adPackage.thumbnailUrl ||
    !adPackage.subtitleUrl
  ) {
    return NextResponse.json(
      { error: 'Approved package is missing one or more generated assets' },
      { status: 409 }
    );
  }

  const [landscape, vertical, square, thumbnail, subtitles] = await Promise.all(
    [
      fetchAsset(adPackage.landscapeUrl),
      fetchAsset(adPackage.verticalUrl),
      fetchAsset(adPackage.squareUrl),
      fetchAsset(adPackage.thumbnailUrl),
      fetchAsset(adPackage.subtitleUrl),
    ]
  );

  const publishingCopy = [
    adPackage.caption,
    '',
    adPackage.hashtags.join(' '),
    '',
    adPackage.disclaimerLine,
    '',
    adPackage.utmUrl,
    '',
  ].join('\n');

  const zipBytes = createZip([
    { fileName: 'video-landscape-1920x1080.mp4', content: landscape },
    { fileName: 'video-vertical-1080x1920.mp4', content: vertical },
    { fileName: 'video-square-1080x1080.mp4', content: square },
    { fileName: 'thumbnail.png', content: thumbnail },
    { fileName: 'subtitles.srt', content: subtitles },
    {
      fileName: 'publishing_copy.txt',
      content: new TextEncoder().encode(publishingCopy),
    },
  ]);
  const zipPayload = Uint8Array.from(zipBytes);

  return new NextResponse(new Blob([zipPayload], { type: 'application/zip' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="ad-video-package-${adPackage.id}.zip"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

async function fetchAsset(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to fetch asset (${response.status}): ${details}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}
