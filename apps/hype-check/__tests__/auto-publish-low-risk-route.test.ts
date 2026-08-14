import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockFindMany, mockCount, mockTransaction } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db/prisma", () => ({
  db: {
    subject: { findMany: mockFindMany, count: mockCount, updateMany: vi.fn() },
    adminReview: { create: vi.fn() },
    $transaction: mockTransaction,
  },
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

function makeRequest() {
  return new NextRequest(
    "http://localhost/api/admin/videos/auto-publish-low-risk",
    { method: "POST" },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { isAdmin: true, email: "admin@example.com" } });
  mockCount.mockResolvedValue(0);
  mockTransaction.mockResolvedValue([]);
});

describe("POST /api/admin/videos/auto-publish-low-risk — claimExtractionFailed exclusion", () => {
  it("excludes subjects whose claim extraction failed from the sweep query", async () => {
    const { POST } = await import(
      "@/app/api/admin/videos/auto-publish-low-risk/route"
    );

    mockFindMany.mockResolvedValue([]);

    await POST(makeRequest());

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        status: "REVIEW",
        sourceVideos: { some: { summaries: { some: {} } } },
        claimExtractionFailed: false,
      },
      select: {
        id: true,
        riskLevel: true,
        claims: {
          select: { evidenceStatus: true, autoReviewed: true, humanConfirmedAt: true },
        },
      },
    });
  });
});
