import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockCreateVideoPlan,
  mockSynthesizeNarrationAudio,
  mockRenderVerticalVideo,
  mockUploadToBlob,
} = vi.hoisted(() => ({
  mockCreateVideoPlan: vi.fn(),
  mockSynthesizeNarrationAudio: vi.fn(),
  mockRenderVerticalVideo: vi.fn(),
  mockUploadToBlob: vi.fn(),
}));

vi.mock("@/lib/social/video-plan", () => ({
  createVideoPlan: mockCreateVideoPlan,
}));
vi.mock("@/lib/social/video-narration-audio", () => ({
  synthesizeNarrationAudio: mockSynthesizeNarrationAudio,
}));
vi.mock("@/lib/social/video-render", () => ({
  renderVerticalVideo: mockRenderVerticalVideo,
}));
vi.mock("@/lib/social/blob-storage", () => ({
  uploadToBlob: mockUploadToBlob,
}));

import { generateSocialVideo } from "@/lib/social/generate-social-video";

const VALID_PLAN = {
  narration:
    "Creatine is one of the most studied supplements for strength training.",
  captionChunks: ["Creatine: one of the most studied supplements"],
};

const INPUT = {
  hook: "Is creatine actually worth it?",
  script: "Creatine is one of the most studied supplements...",
  platform: "TIKTOK" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateVideoPlan.mockResolvedValue({ ok: true, value: VALID_PLAN });
  mockSynthesizeNarrationAudio.mockResolvedValue(Buffer.from("audio"));
  mockRenderVerticalVideo.mockResolvedValue(Buffer.from("video"));
  mockUploadToBlob.mockResolvedValue("https://blob.test/social-videos/1.mp4");
});

describe("generateSocialVideo", () => {
  it("returns the uploaded video URL on success, rendering silent (narration audio disabled)", async () => {
    const result = await generateSocialVideo(INPUT);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.value.videoUrl).toBe(
      "https://blob.test/social-videos/1.mp4",
    );
    expect(mockSynthesizeNarrationAudio).not.toHaveBeenCalled();
    expect(mockRenderVerticalVideo).toHaveBeenCalledWith({
      narrationAudio: undefined,
      captionChunks: VALID_PLAN.captionChunks,
    });
  });

  it("fails without calling TTS or rendering when the plan step fails", async () => {
    mockCreateVideoPlan.mockResolvedValue({
      ok: false,
      error: new Error("AI output failed validation"),
    });

    const result = await generateSocialVideo(INPUT);

    expect(result.ok).toBe(false);
    expect(mockSynthesizeNarrationAudio).not.toHaveBeenCalled();
    expect(mockRenderVerticalVideo).not.toHaveBeenCalled();
  });

  it("fails without calling TTS or rendering when the narration violates forbidden-pattern rules", async () => {
    mockCreateVideoPlan.mockResolvedValue({
      ok: true,
      value: {
        narration: "This cures low testosterone fast.",
        captionChunks: ["This cures low testosterone fast."],
      },
    });

    const result = await generateSocialVideo(INPUT);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure result");
    expect(result.error.message).toMatch(/forbidden/i);
    expect(mockSynthesizeNarrationAudio).not.toHaveBeenCalled();
    expect(mockRenderVerticalVideo).not.toHaveBeenCalled();
  });

  it("fails when rendering throws", async () => {
    mockRenderVerticalVideo.mockRejectedValue(new Error("ffmpeg failed"));

    const result = await generateSocialVideo(INPUT);

    expect(result.ok).toBe(false);
    expect(mockUploadToBlob).not.toHaveBeenCalled();
  });

  it("fails when the upload throws", async () => {
    mockUploadToBlob.mockRejectedValue(new Error("blob upload failed"));

    const result = await generateSocialVideo(INPUT);

    expect(result.ok).toBe(false);
  });
});
