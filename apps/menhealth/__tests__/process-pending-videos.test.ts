import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Summary } from "@prisma/client";

const mockDb = vi.hoisted(() => ({
  processingJob: { updateMany: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  channel: { findUnique: vi.fn() },
  video: { findUnique: vi.fn(), update: vi.fn() },
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
import { generateEditorialTitle } from "@/lib/ai/generate-editorial-title";
import { isEligibleForAutoPublish } from "@/lib/publishing/auto-publish-gate";

const mockGenerateSummaryAndClaims = vi.mocked(generateSummaryAndClaims);
const mockGenerateEditorialTitle = vi.mocked(generateEditorialTitle);
const mockIsEligibleForAutoPublish = vi.mocked(isEligibleForAutoPublish);

describe("processPendingVideos — atomic job claiming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.processingJob.updateMany.mockResolvedValue({ count: 0 });
  });

  it("skips a job that a concurrent run already claimed, without calling the AI pipeline", async () => {
    mockDb.processingJob.findMany.mockResolvedValue([
      {
        id: "job_1",
        video: { id: "video_1", channelId: "channel_1", riskLevel: "LOW" },
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

  it("persists claimExtractionFailed on the video when the pipeline reports it", async () => {
    // processPendingVideos calls processingJob.updateMany twice: once to
    // recover stale RUNNING jobs (return value unchecked), once to claim
    // this job (return value gates whether processing proceeds) — both
    // calls need a resolved value here so the second (the claim) is {count: 1}.
    mockDb.processingJob.updateMany.mockResolvedValueOnce({ count: 1 });
    mockDb.processingJob.updateMany.mockResolvedValueOnce({ count: 1 });
    mockDb.processingJob.findMany.mockResolvedValue([
      {
        id: "job_1",
        video: { id: "video_1", channelId: "channel_1", riskLevel: "LOW" },
      },
    ]);
    mockDb.channel.findUnique.mockResolvedValue({ title: "Some Channel" });
    mockGenerateSummaryAndClaims.mockResolvedValue({
      ok: true,
      value: {
        summary: { shortSummary: "short" } as unknown as Summary,
        claims: [],
        claimExtractionFailed: true,
      },
    });
    mockGenerateEditorialTitle.mockResolvedValue({
      ok: true,
      value: "Editorial Title",
    });
    mockIsEligibleForAutoPublish.mockReturnValue(false);
    mockDb.video.findUnique.mockResolvedValue({ riskLevel: "LOW" });

    await processPendingVideos();

    expect(mockDb.video.update).toHaveBeenCalledWith({
      where: { id: "video_1" },
      data: expect.objectContaining({ claimExtractionFailed: true }),
    });
  });
});
