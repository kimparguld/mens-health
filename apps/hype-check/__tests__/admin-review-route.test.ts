import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockSubjectFindUnique, mockAdminReviewCreate, mockTransaction } =
  vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockSubjectFindUnique: vi.fn(),
    mockAdminReviewCreate: vi.fn(),
    mockTransaction: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db/prisma", () => ({
  db: {
    subject: { findUnique: mockSubjectFindUnique, update: vi.fn() },
    adminReview: { create: mockAdminReviewCreate },
    claim: { updateMany: vi.fn() },
    $transaction: mockTransaction,
  },
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@menhealth/core-seo", () => ({ submitUrlsToIndexNow: vi.fn() }));
vi.mock("@/lib/creators/notify", () => ({ notifyCreatorIfApplicable: vi.fn() }));

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/admin/videos/subject_1/review", {
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

    mockSubjectFindUnique.mockResolvedValue({
      id: "subject_1",
      slug: "subject-1",
      riskLevel: "LOW",
      sourceVideos: [{ summaries: [{ id: "summary_1" }] }],
    });

    await POST(makeRequest({ action: "REJECTED" }), {
      params: Promise.resolve({ id: "subject_1" }),
    });

    expect(mockAdminReviewCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subjectId: "subject_1",
        action: "REJECTED",
        reviewerEmail: "admin@example.com",
      }),
    });
  });
});
