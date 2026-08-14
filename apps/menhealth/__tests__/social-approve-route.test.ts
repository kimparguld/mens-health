import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockFindUnique, mockUpdate } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db/prisma", () => ({
  db: { socialPost: { findUnique: mockFindUnique, update: mockUpdate } },
}));

function makeRequest(id: string) {
  return new NextRequest(`http://localhost/api/social/drafts/${id}/approve`, {
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { isAdmin: true, email: "admin@example.com" } });
});

describe("POST /api/social/drafts/[id]/approve — FAILED recovery", () => {
  it("allows re-approving a FAILED, non-high-risk post", async () => {
    const { POST } = await import("@/app/api/social/drafts/[id]/approve/route");

    const postId = "clh2p7x8k00001a8k8b4z5z0z";
    mockFindUnique.mockResolvedValue({
      id: postId,
      status: "FAILED",
      requiresReview: false,
    });
    mockUpdate.mockResolvedValue({ id: postId, status: "APPROVED" });

    const response = await POST(makeRequest(postId), {
      params: Promise.resolve({ id: postId }),
    });

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: postId },
      data: { status: "APPROVED" },
    });
  });

  it("allows re-approving a FAILED, high-risk post without re-requiring PENDING_REVIEW", async () => {
    const { POST } = await import("@/app/api/social/drafts/[id]/approve/route");

    const postId = "clh2p7x8k00002a8k8b4z5z0z";
    mockFindUnique.mockResolvedValue({
      id: postId,
      status: "FAILED",
      requiresReview: true,
    });
    mockUpdate.mockResolvedValue({ id: postId, status: "APPROVED" });

    const response = await POST(makeRequest(postId), {
      params: Promise.resolve({ id: postId }),
    });

    expect(response.status).toBe(200);
  });
});
