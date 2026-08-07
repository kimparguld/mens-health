import { auth } from '@/lib/auth';
import { db } from '@/lib/db/prisma';
import { RejectPostSchema } from '@/lib/social/validation';
import { NextRequest, NextResponse } from 'next/server';
import 'server-only';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // reason is optional
  }

  const parsed = RejectPostSchema.safeParse({
    postId: id,
    ...(body as object),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const adPackage = await db.adVideoPackage.findUnique({ where: { id } });
  if (!adPackage) {
    return NextResponse.json(
      { error: 'Ad package not found' },
      { status: 404 }
    );
  }

  if (adPackage.status !== 'PENDING_REVIEW') {
    return NextResponse.json(
      { error: 'Ad package must be in PENDING_REVIEW status to reject' },
      { status: 409 }
    );
  }

  const updated = await db.adVideoPackage.update({
    where: { id },
    data: { status: 'REJECTED' },
  });

  return NextResponse.json({ packageId: updated.id, status: updated.status });
}
