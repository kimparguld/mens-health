import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockAuth,
  mockVideoFindMany,
  mockVideoUpdate,
  mockGenerateSummaryAndClaims,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockVideoFindMany: vi.fn(),
  mockVideoUpdate: vi.fn(),
  mockGenerateSummaryAndClaims: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db/prisma", () => ({
  db: { video: { findMany: mockVideoFindMany, update: mockVideoUpdate } },
}));
vi.mock("@/lib/videos/process-video-pipeline", () => ({
  generateSummaryAndClaims: mockGenerateSummaryAndClaims,
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

function makeRequest(ids: string[]) {
  return new NextRequest(
    "http://localhost/api/admin/videos/bulk-generate-summaries",
    { method: "POST", body: JSON.stringify({ ids }) },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({
    user: { isAdmin: true, email: "admin@example.com" },
  });
});

describe("POST /api/admin/videos/bulk-generate-summaries — persists claimExtractionFailed", () => {
  it("persists claimExtractionFailed: true on the video when the pipeline reports it", async () => {
    const { POST } = await import(
      "@/app/api/admin/videos/bulk-generate-summaries/route"
    );

    mockVideoFindMany.mockResolvedValue([
      {
        id: "video_1",
        title: "Some Video",
        slug: "video-1",
        channel: { title: "Some Channel" },
      },
    ]);
    mockGenerateSummaryAndClaims.mockResolvedValue({
      ok: true,
      value: { summary: {}, claims: [], claimExtractionFailed: true },
    });

    await POST(makeRequest(["cln1a2b3c4d5e6f7g8h9i0j1"]));

    expect(mockVideoUpdate).toHaveBeenCalledWith({
      where: { id: "video_1" },
      data: { claimExtractionFailed: true },
    });
  });
});
