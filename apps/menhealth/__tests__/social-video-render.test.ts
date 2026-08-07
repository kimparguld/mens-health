import { writeFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockExecFile } = vi.hoisted(() => ({
  mockExecFile: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFile: mockExecFile,
  default: { execFile: mockExecFile },
}));

import { renderVerticalVideo } from "@/lib/social/video-render";

beforeEach(() => {
  vi.clearAllMocks();
  // Both ffmpeg passes succeed; write a fake output file each time so the
  // renderer has something to read back.
  mockExecFile.mockImplementation(
    (
      _cmd: string,
      args: string[],
      _opts: unknown,
      callback: (err: Error | null, stdout: string, stderr: string) => void,
    ) => {
      const outputPath = args[args.length - 1] as string;
      writeFileSync(outputPath, "fake-mp4-bytes");
      callback(null, "", "");
    },
  );
});

describe("renderVerticalVideo", () => {
  it("runs two ffmpeg passes and returns the rendered buffer", async () => {
    const result = await renderVerticalVideo({
      narrationAudio: Buffer.from("fake-mp3-bytes"),
      captionChunks: ["First line", "Second line"],
    });

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe("fake-mp4-bytes");
    expect(mockExecFile).toHaveBeenCalledTimes(2);

    const firstPassArgs = mockExecFile.mock.calls[0]![1] as string[];
    expect(firstPassArgs.join(" ")).toContain("1080x1920");

    const secondPassArgs = mockExecFile.mock.calls[1]![1] as string[];
    expect(secondPassArgs).toContain("-shortest");
  });

  it("throws when ffmpeg exits with an error", async () => {
    mockExecFile.mockImplementation(
      (
        _cmd: string,
        _args: string[],
        _opts: unknown,
        callback: (err: Error | null, stdout: string, stderr: string) => void,
      ) => {
        callback(new Error("ffmpeg failed"), "", "broken pipe");
      },
    );

    await expect(
      renderVerticalVideo({
        narrationAudio: Buffer.from("fake-mp3-bytes"),
        captionChunks: ["First line"],
      }),
    ).rejects.toThrow();
  });
});
