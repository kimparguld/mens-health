import { auth } from '@/lib/auth';
import { generateAdVideoPackage } from '@/lib/social/generate-ad-video-package';
import { GenerateAdVideoPackageSchema } from '@/lib/social/validation';
import { NextRequest, NextResponse } from 'next/server';
import 'server-only';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is valid for this endpoint.
  }

  const parsed = GenerateAdVideoPackageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const result = await generateAdVideoPackage();
  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json(result.value, { status: 201 });
}
