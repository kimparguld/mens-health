import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockFindUnique, mockUpdate, mockGenerateSocialVideo } =
  vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockFindUnique: vi.fn(),
    mockUpdate: vi.fn(),
    mockGenerateSocialVideo: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

vi.mock("@/lib/db/prisma", () => ({
  db: {
    socialPost: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}));

vi.mock("@/lib/social/generate-social-video", () => ({
  generateSocialVideo: mockGenerateSocialVideo,
}));

function makeRequest(id: string) {
  return new NextRequest(
    `http://localhost/api/social/drafts/${id}/video`,
    { method: "POST" },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({
    user: { isAdmin: true, email: "admin@example.com" },
  });
  mockUpdate.mockResolvedValue({});
});

describe("POST /api/social/drafts/[id]/video", () => {
  it("generates and persists a video for a supported draft", async () => {
    const { POST } = await import("@/app/api/social/drafts/[id]/video/route");

    mockFindUnique.mockResolvedValue({
      id: "post_1",
      platform: "TIKTOK",
      hook: "hook",
      script: "script",
    });
    mockGenerateSocialVideo.mockResolvedValue({
      ok: true,
      value: { videoUrl: "https://blob.test/social-videos/1.mp4" },
    });

    const response = await POST(makeRequest("post_1"), {
      params: Promise.resolve({ id: "post_1" }),
    });
    const body = (await response.json()) as {
      videoUrl?: string;
      videoStatus?: string;
    };

    expect(response.status).toBe(200);
    expect(body.videoStatus).toBe("READY");
    expect(body.videoUrl).toBe("https://blob.test/social-videos/1.mp4");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "post_1" },
      data: { videoStatus: "GENERATING", videoError: null },
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "post_1" },
      data: {
        videoUrl: "https://blob.test/social-videos/1.mp4",
        videoStatus: "READY",
        videoError: null,
      },
    });
  });

  it("marks the draft FAILED with a useful error when generation fails", async () => {
    const { POST } = await import("@/app/api/social/drafts/[id]/video/route");

    mockFindUnique.mockResolvedValue({
      id: "post_1",
      platform: "TIKTOK",
      hook: "hook",
      script: "script",
    });
    mockGenerateSocialVideo.mockResolvedValue({
      ok: false,
      error: new Error("TTS down"),
    });

    const response = await POST(makeRequest("post_1"), {
      params: Promise.resolve({ id: "post_1" }),
    });

    expect(response.status).toBe(500);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "post_1" },
      data: { videoStatus: "FAILED", videoError: "TTS down" },
    });
  });

  it("rejects platforms that don't support video with 422 and does not call generateSocialVideo", async () => {
    const { POST } = await import("@/app/api/social/drafts/[id]/video/route");

    mockFindUnique.mockResolvedValue({
      id: "post_1",
      platform: "REDDIT",
      hook: "hook",
      script: "",
    });

    const response = await POST(makeRequest("post_1"), {
      params: Promise.resolve({ id: "post_1" }),
    });

    expect(response.status).toBe(422);
    expect(mockGenerateSocialVideo).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown draft id", async () => {
    const { POST } = await import("@/app/api/social/drafts/[id]/video/route");

    mockFindUnique.mockResolvedValue(null);

    const response = await POST(makeRequest("missing"), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 401 for a non-admin session", async () => {
    mockAuth.mockResolvedValue({ user: { isAdmin: false } });
    const { POST } = await import("@/app/api/social/drafts/[id]/video/route");

    const response = await POST(makeRequest("post_1"), {
      params: Promise.resolve({ id: "post_1" }),
    });

    expect(response.status).toBe(401);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});
