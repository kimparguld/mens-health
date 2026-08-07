import { auth } from '@/lib/auth';
import { db } from '@/lib/db/prisma';
import { ApprovePostSchema } from '@/lib/social/validation';
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
  const parsed = ApprovePostSchema.safeParse({ postId: id });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid package ID' }, { status: 422 });
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
      { error: 'Ad package must be in PENDING_REVIEW status to approve' },
      { status: 409 }
    );
  }

  const approverEmail = session?.user?.email ?? 'admin';
  const updated = await db.adVideoPackage.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedBy: approverEmail,
    },
  });

  return NextResponse.json({ packageId: updated.id, status: updated.status });
}
