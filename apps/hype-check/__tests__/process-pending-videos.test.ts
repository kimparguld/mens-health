import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  processingJob: { updateMany: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  channel: { findUnique: vi.fn() },
  subject: { findUnique: vi.fn(), update: vi.fn() },
  adminReview: { create: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({ db: mockDb }));
vi.mock("@/lib/videos/process-video-pipeline", () => ({
  generateSummaryAndClaims: vi.fn(),
}));
vi.mock("@/lib/ai/generate-editorial-title", () => ({
  generateEditorialTitle: vi.fn(),
}));
vi.mock("@/lib/publishing/auto-publish-gate", () => ({
  isEligibleForAutoPublish: vi.fn(),
}));
vi.mock("@menhealth/core-seo", () => ({ submitUrlsToIndexNow: vi.fn() }));
vi.mock("@/lib/creators/notify", () => ({ notifyCreatorIfApplicable: vi.fn() }));

import { processPendingVideos } from "@/jobs/process-pending-videos";
import { generateSummaryAndClaims } from "@/lib/videos/process-video-pipeline";

const mockGenerateSummaryAndClaims = vi.mocked(generateSummaryAndClaims);

describe("processPendingVideos — atomic job claiming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.processingJob.updateMany.mockResolvedValue({ count: 0 });
  });

  it("skips a job that a concurrent run already claimed, without calling the AI pipeline", async () => {
    mockDb.processingJob.findMany.mockResolvedValue([
      {
        id: "job_1",
        sourceVideo: {
          id: "source-video-1",
          channelId: "channel_1",
          subject: { id: "subject-1", riskLevel: "LOW" },
        },
      },
    ]);

    const result = await processPendingVideos();

    expect(mockDb.processingJob.updateMany).toHaveBeenCalledWith({
      where: { id: "job_1", status: "QUEUED" },
      data: { status: "RUNNING", startedAt: expect.any(Date) },
    });
    expect(mockGenerateSummaryAndClaims).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 0, failed: 0 });
  });
});
