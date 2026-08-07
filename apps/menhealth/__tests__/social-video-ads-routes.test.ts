import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAuth, mockFindUnique, mockUpdate } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: mockAuth,
}));

vi.mock('@/lib/db/prisma', () => ({
  db: {
    adVideoPackage: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({
    user: { isAdmin: true, email: 'admin@example.com' },
  });
});

describe('video ad approve/reject routes', () => {
  it('approve returns 409 outside PENDING_REVIEW', async () => {
    const { POST } =
      await import('@/app/api/social/video-ads/[id]/approve/route');

    mockFindUnique.mockResolvedValue({
      id: 'cmadpkga0000000000000001',
      status: 'RENDERING',
    });

    const response = await POST(
      new NextRequest(
        'http://localhost/api/social/video-ads/cmadpkga0000000000000001/approve',
        {
          method: 'POST',
        }
      ),
      { params: Promise.resolve({ id: 'cmadpkga0000000000000001' }) }
    );

    expect(response.status).toBe(409);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('reject succeeds from PENDING_REVIEW', async () => {
    const { POST } =
      await import('@/app/api/social/video-ads/[id]/reject/route');

    mockFindUnique.mockResolvedValue({
      id: 'cmadpkga0000000000000002',
      status: 'PENDING_REVIEW',
    });
    mockUpdate.mockResolvedValue({
      id: 'cmadpkga0000000000000002',
      status: 'REJECTED',
    });

    const response = await POST(
      new NextRequest(
        'http://localhost/api/social/video-ads/cmadpkga0000000000000002/reject',
        {
          method: 'POST',
          body: JSON.stringify({ reason: 'Off-brand tone' }),
          headers: { 'Content-Type': 'application/json' },
        }
      ),
      { params: Promise.resolve({ id: 'cmadpkga0000000000000002' }) }
    );

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'cmadpkga0000000000000002' },
      data: { status: 'REJECTED' },
    });
  });
});

describe('video ad download route', () => {
  it('returns 404 unless package is APPROVED', async () => {
    const { GET } =
      await import('@/app/api/social/video-ads/[id]/download/route');

    mockFindUnique.mockResolvedValue({
      id: 'cmadpkga0000000000000003',
      status: 'PENDING_REVIEW',
    });

    const response = await GET(
      new NextRequest(
        'http://localhost/api/social/video-ads/cmadpkga0000000000000003/download',
        {
          method: 'GET',
        }
      ),
      { params: Promise.resolve({ id: 'cmadpkga0000000000000003' }) }
    );

    expect(response.status).toBe(404);
  });

  it('returns a zip when package is APPROVED', async () => {
    const { GET } =
      await import('@/app/api/social/video-ads/[id]/download/route');

    mockFindUnique.mockResolvedValue({
      id: 'cmadpkga0000000000000004',
      status: 'APPROVED',
      caption: 'Caption',
      hashtags: ['#MensHealth'],
      disclaimerLine: 'Educational only. Not medical advice.',
      utmUrl: 'https://example.com',
      landscapeUrl: 'https://assets.test/landscape.mp4',
      verticalUrl: 'https://assets.test/vertical.mp4',
      squareUrl: 'https://assets.test/square.mp4',
      thumbnailUrl: 'https://assets.test/thumbnail.png',
      subtitleUrl: 'https://assets.test/subtitles.srt',
    });

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(new Uint8Array([1, 2, 3]));
    });

    const response = await GET(
      new NextRequest(
        'http://localhost/api/social/video-ads/cmadpkga0000000000000004/download',
        {
          method: 'GET',
        }
      ),
      { params: Promise.resolve({ id: 'cmadpkga0000000000000004' }) }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/zip');
    expect(response.headers.get('Content-Disposition')).toContain(
      'ad-video-package-cmadpkga0000000000000004.zip'
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(5);
  });
});
