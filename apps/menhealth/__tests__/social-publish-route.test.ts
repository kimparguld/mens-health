import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockFindUnique, mockUpdateMany, mockTransaction } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdateMany: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

vi.mock("@/lib/db/prisma", () => ({
  db: {
    socialPost: {
      findUnique: mockFindUnique,
      updateMany: mockUpdateMany,
      update: vi.fn(),
    },
    socialPublishAttempt: { create: vi.fn() },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/social/adapters/tiktok", () => ({
  TikTokAdapter: class {
    validate = vi.fn().mockResolvedValue({ ok: true });
    publish = vi.fn().mockResolvedValue({
      ok: true,
      platformPostId: "pub_1",
      platformUrl: "https://www.tiktok.com/@x/video/1",
    });
  },
}));

function makeRequest(id: string) {
  return new NextRequest(`http://localhost/api/social/drafts/${id}/publish`, {
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { isAdmin: true, email: "admin@example.com" } });
  mockTransaction.mockResolvedValue([]);
});

describe("POST /api/social/drafts/[id]/publish — atomic claim", () => {
  it("rejects a second concurrent publish attempt once the first has claimed the post", async () => {
    const { POST } = await import("@/app/api/social/drafts/[id]/publish/route");

    mockFindUnique.mockResolvedValue({
      id: "post_1",
      platform: "TIKTOK",
      status: "APPROVED",
    });
    // First call claims the row (count 1); second call finds it already
    // claimed (count 0) — exactly what Postgres returns for two concurrent
    // UPDATE ... WHERE status = 'APPROVED' statements racing the same row.
    mockUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    const first = await POST(makeRequest("post_1"), {
      params: Promise.resolve({ id: "post_1" }),
    });
    const second = await POST(makeRequest("post_1"), {
      params: Promise.resolve({ id: "post_1" }),
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    const secondBody = (await second.json()) as { error: string };
    expect(secondBody.error).toMatch(/not in a publishable state/i);
  });
});
