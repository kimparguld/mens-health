import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockAuth,
  mockFindUnique,
  mockUpdateMany,
  mockUpdate,
  mockTransaction,
  mockValidate,
  mockPublish,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdateMany: vi.fn(),
  mockUpdate: vi.fn(),
  mockTransaction: vi.fn(),
  mockValidate: vi.fn(),
  mockPublish: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

vi.mock("@/lib/db/prisma", () => ({
  db: {
    socialPost: {
      findUnique: mockFindUnique,
      updateMany: mockUpdateMany,
      update: mockUpdate,
    },
    socialPublishAttempt: { create: vi.fn() },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/social/adapters/tiktok", () => ({
  TikTokAdapter: class {
    validate = mockValidate;
    publish = mockPublish;
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
  mockValidate.mockResolvedValue({ ok: true });
  mockPublish.mockResolvedValue({
    ok: true,
    platformPostId: "pub_1",
    platformUrl: "https://www.tiktok.com/@x/video/1",
  });
  mockUpdate.mockResolvedValue({});
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

  it("releases the claim (reverts to the original pre-claim status) when validation fails, instead of leaving the post stuck in PUBLISHING", async () => {
    const { POST } = await import("@/app/api/social/drafts/[id]/publish/route");

    // Original status is SCHEDULED (not APPROVED) specifically to prove the
    // revert uses the post's actual original status rather than a
    // hardcoded value.
    mockFindUnique.mockResolvedValue({
      id: "post_2",
      platform: "TIKTOK",
      status: "SCHEDULED",
    });
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockValidate.mockResolvedValue({
      ok: false,
      errors: ["Caption exceeds platform limit"],
    });

    const response = await POST(makeRequest("post_2"), {
      params: Promise.resolve({ id: "post_2" }),
    });

    expect(response.status).toBe(422);
    // adapter.publish must never be reached for a validation failure.
    expect(mockPublish).not.toHaveBeenCalled();
    // The claim must be released back to the post's original status, not
    // left as PUBLISHING and not hardcoded to APPROVED.
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "post_2" },
      data: { status: "SCHEDULED" },
    });
  });
});
