import { env } from '@/env';
import { pollAdVideoRenders } from '@/jobs/poll-ad-video-renders';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await pollAdVideoRenders();
  return NextResponse.json(result);
}
