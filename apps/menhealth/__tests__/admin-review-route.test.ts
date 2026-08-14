import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockVideoFindUnique, mockAdminReviewCreate, mockTransaction } =
  vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockVideoFindUnique: vi.fn(),
    mockAdminReviewCreate: vi.fn(),
    mockTransaction: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db/prisma", () => ({
  db: {
    video: { findUnique: mockVideoFindUnique, update: vi.fn() },
    adminReview: { create: mockAdminReviewCreate },
    claim: { updateMany: vi.fn() },
    $transaction: mockTransaction,
  },
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@menhealth/core-seo", () => ({ submitUrlsToIndexNow: vi.fn() }));
vi.mock("@/lib/creators/notify", () => ({ notifyCreatorIfApplicable: vi.fn() }));

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/admin/videos/video_1/review", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { isAdmin: true, email: "admin@example.com" } });
  mockTransaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));
});

describe("POST /api/admin/videos/[id]/review — reviewer audit trail", () => {
  it("records the acting admin's email on a REJECTED action, not just HIGH-risk publish acknowledgment", async () => {
    const { POST } = await import("@/app/api/admin/videos/[id]/review/route");

    mockVideoFindUnique.mockResolvedValue({
      id: "video_1",
      slug: "video-1",
      riskLevel: "LOW",
      _count: { summaries: 1 },
    });

    await POST(makeRequest({ action: "REJECTED" }), {
      params: Promise.resolve({ id: "video_1" }),
    });

    expect(mockAdminReviewCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        videoId: "video_1",
        action: "REJECTED",
        reviewerEmail: "admin@example.com",
      }),
    });
  });
});
