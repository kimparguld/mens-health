import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockAuth,
  mockVideoFindUnique,
  mockVideoUpdate,
  mockGenerateSummaryAndClaims,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockVideoFindUnique: vi.fn(),
  mockVideoUpdate: vi.fn(),
  mockGenerateSummaryAndClaims: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db/prisma", () => ({
  db: { video: { findUnique: mockVideoFindUnique, update: mockVideoUpdate } },
}));
vi.mock("@/lib/videos/process-video-pipeline", () => ({
  generateSummaryAndClaims: mockGenerateSummaryAndClaims,
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

function makeRequest(id: string) {
  return new NextRequest(
    `http://localhost/api/admin/videos/${id}/summarize`,
    { method: "POST" },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({
    user: { isAdmin: true, email: "admin@example.com" },
  });
});

describe("POST /api/admin/videos/[id]/summarize — persists claimExtractionFailed", () => {
  it("persists claimExtractionFailed: true on the video when the pipeline reports it", async () => {
    const { POST } = await import(
      "@/app/api/admin/videos/[id]/summarize/route"
    );

    mockVideoFindUnique.mockResolvedValue({
      id: "video_1",
      slug: "video-1",
      channel: { title: "Some Channel" },
    });
    mockGenerateSummaryAndClaims.mockResolvedValue({
      ok: true,
      value: { summary: {}, claims: [], claimExtractionFailed: true },
    });

    await POST(makeRequest("video_1"), {
      params: Promise.resolve({ id: "video_1" }),
    });

    expect(mockVideoUpdate).toHaveBeenCalledWith({
      where: { id: "video_1" },
      data: { claimExtractionFailed: true },
    });
  });
});
