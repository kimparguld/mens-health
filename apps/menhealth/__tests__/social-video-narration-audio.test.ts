import { beforeEach, describe, expect, it, vi } from "vitest";
import { synthesizeNarrationAudio } from "@/lib/social/video-narration-audio";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});

describe("synthesizeNarrationAudio", () => {
  it("returns a Buffer of the returned audio bytes", async () => {
    const fakeAudio = new Uint8Array([1, 2, 3, 4]);
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => fakeAudio.buffer,
    });

    const result = await synthesizeNarrationAudio("Hello there.");

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(Array.from(result)).toEqual([1, 2, 3, 4]);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/audio/speech",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws with the response status when the request fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "invalid api key",
    });

    await expect(synthesizeNarrationAudio("Hello there.")).rejects.toThrow(
      /401/,
    );
  });
});
