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
  // The renderer makes 3 execFile calls: scenes pass, a duration probe
  // (`ffmpeg -i <file>`, no output arg), then the final mux pass. Both
  // render passes succeed and get a fake output file written; the probe
  // call is detected by its distinct 2-arg shape and gets a Duration line
  // in stderr instead.
  mockExecFile.mockImplementation(
    (
      _cmd: string,
      args: string[],
      _opts: unknown,
      callback: (err: Error | null, stdout: string, stderr: string) => void,
    ) => {
      if (args[0] === "-i" && args.length === 2) {
        callback(null, "", "Duration: 00:00:03.03, start: 0.000000, bitrate: 32 kb/s");
        return;
      }
      const outputPath = args[args.length - 1] as string;
      writeFileSync(outputPath, "fake-mp4-bytes");
      callback(null, "", "");
    },
  );
});

describe("renderVerticalVideo", () => {
  it("runs scenes + probe + mux passes and returns the rendered buffer", async () => {
    const result = await renderVerticalVideo({
      narrationAudio: Buffer.from("fake-mp3-bytes"),
      captionChunks: ["First line", "Second line"],
    });

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe("fake-mp4-bytes");
    expect(mockExecFile).toHaveBeenCalledTimes(3);

    const firstPassArgs = mockExecFile.mock.calls[0]![1] as string[];
    expect(firstPassArgs.join(" ")).toContain("1080x1920");

    const probeArgs = mockExecFile.mock.calls[1]![1] as string[];
    expect(probeArgs).toEqual(["-i", expect.stringContaining("narration.mp3")]);

    const secondPassArgs = mockExecFile.mock.calls[2]![1] as string[];
    expect(secondPassArgs).toContain("-shortest");
    expect(secondPassArgs).toContain("-t");
    expect(secondPassArgs).toContain("3.03");
    // -stream_loop must be a finite count, never "-1" (which does not
    // reliably respect -shortest and can loop until memory exhaustion).
    const loopIndex = secondPassArgs.indexOf("-stream_loop");
    expect(secondPassArgs[loopIndex + 1]).not.toBe("-1");
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
