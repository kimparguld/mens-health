import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockAuth,
  mockSubjectFindUnique,
  mockSubjectUpdate,
  mockGenerateSummaryAndClaims,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockSubjectFindUnique: vi.fn(),
  mockSubjectUpdate: vi.fn(),
  mockGenerateSummaryAndClaims: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db/prisma", () => ({
  db: {
    subject: { findUnique: mockSubjectFindUnique, update: mockSubjectUpdate },
  },
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
  it("persists claimExtractionFailed: true on the subject when the pipeline reports it", async () => {
    const { POST } = await import(
      "@/app/api/admin/videos/[id]/summarize/route"
    );

    mockSubjectFindUnique.mockResolvedValue({
      id: "subject_1",
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
    });
    mockGenerateSummaryAndClaims.mockResolvedValue({
      ok: true,
      value: { summary: {}, claims: [], claimExtractionFailed: true },
    });

    await POST(makeRequest("subject_1"), {
      params: Promise.resolve({ id: "subject_1" }),
    });

    expect(mockSubjectUpdate).toHaveBeenCalledWith({
      where: { id: "subject_1" },
      data: { claimExtractionFailed: true },
    });
  });
});
