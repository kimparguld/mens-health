import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockAuth,
  mockSubjectFindMany,
  mockSubjectUpdate,
  mockGenerateSummaryAndClaims,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockSubjectFindMany: vi.fn(),
  mockSubjectUpdate: vi.fn(),
  mockGenerateSummaryAndClaims: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db/prisma", () => ({
  db: {
    subject: { findMany: mockSubjectFindMany, update: mockSubjectUpdate },
  },
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
  it("persists claimExtractionFailed: true on the subject when the pipeline reports it", async () => {
    const { POST } = await import(
      "@/app/api/admin/videos/bulk-generate-summaries/route"
    );

    mockSubjectFindMany.mockResolvedValue([
      {
        id: "subject_1",
        name: "Some Subject",
        slug: "subject-1",
        riskLevel: "LOW",
        channel: { title: "Some Channel" },
        sourceVideos: [
          {
            id: "source_video_1",
            title: "Some Source Video",
            description: "desc",
            durationSeconds: 600,
          },
        ],
      },
    ]);
    mockGenerateSummaryAndClaims.mockResolvedValue({
      ok: true,
      value: { summary: {}, claims: [], claimExtractionFailed: true },
    });

    await POST(makeRequest(["cln1a2b3c4d5e6f7g8h9i0j1"]));

    expect(mockSubjectUpdate).toHaveBeenCalledWith({
      where: { id: "subject_1" },
      data: { claimExtractionFailed: true },
    });
  });
});
