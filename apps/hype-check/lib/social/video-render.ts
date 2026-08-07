import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";

const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;
const SCENE_BACKGROUND_COLORS = ["#0f172a", "#111827"];
const WORDS_PER_SECOND = 2.5;
const MIN_SCENE_SECONDS = 2.5;
const MAX_SCENE_SECONDS = 6;
const BRAND_LINE = "Hype Check";
const FONT_PATH = join(
  process.cwd(),
  "assets",
  "fonts",
  "social-video-caption.ttf",
);

export type RenderVerticalVideoInput = {
  narrationAudio?: Buffer;
  captionChunks: string[];
};

function sceneDurationSeconds(text: string): number {
  const words = text.trim().split(/\s+/).length;
  const estimate = words / WORDS_PER_SECOND;
  return Math.min(Math.max(estimate, MIN_SCENE_SECONDS), MAX_SCENE_SECONDS);
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg-static did not resolve a binary path"));
      return;
    }
    execFile(ffmpegPath, args, { maxBuffer: 1024 * 1024 * 32 }, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(`ffmpeg failed: ${error.message}\n${stderr}`));
        return;
      }
      resolve();
    });
  });
}

const DURATION_PATTERN = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/;

// ffmpeg-static ships no ffprobe binary, so duration is read off ffmpeg's own
// stderr banner. `ffmpeg -i <file>` with no output always exits non-zero —
// that's expected here, only the Duration line in stderr is used.
function probeDurationSeconds(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg-static did not resolve a binary path"));
      return;
    }
    execFile(
      ffmpegPath,
      ["-i", filePath],
      { maxBuffer: 1024 * 1024 * 32 },
      (_error, _stdout, stderr) => {
        const match = DURATION_PATTERN.exec(stderr);
        if (!match) {
          reject(
            new Error(
              `Could not determine duration of ${filePath} from ffmpeg output`,
            ),
          );
          return;
        }
        const [, hours, minutes, seconds] = match;
        resolve(Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds));
      },
    );
  });
}

export async function renderVerticalVideo(
  input: RenderVerticalVideoInput,
): Promise<Buffer> {
  const workDir = await mkdtemp(join(tmpdir(), "social-video-"));

  try {
    const sceneFilterInputs: string[] = [];
    const drawTextFilters: string[] = [];
    const sceneLabels: string[] = [];
    let totalSceneSeconds = 0;

    for (const [index, chunk] of input.captionChunks.entries()) {
      const duration = sceneDurationSeconds(chunk);
      totalSceneSeconds += duration;
      const color = SCENE_BACKGROUND_COLORS[index % SCENE_BACKGROUND_COLORS.length];

      sceneFilterInputs.push(
        "-f",
        "lavfi",
        "-i",
        `color=c=${color}:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:d=${duration}`,
      );

      const textPath = join(workDir, `scene-${index}.txt`);
      await writeFile(textPath, `${chunk}\n\n${BRAND_LINE}`, "utf8");

      const label = `v${index}`;
      sceneLabels.push(label);
      drawTextFilters.push(
        `[${index}:v]drawtext=fontfile='${FONT_PATH}':textfile='${textPath}':fontsize=64:fontcolor=white:` +
          `line_spacing=16:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.4:boxborderw=30[${label}]`,
      );
    }

    const concatFilter = `${sceneLabels.map((label) => `[${label}]`).join("")}concat=n=${sceneLabels.length}:v=1:a=0[slides]`;
    const filterComplex = [...drawTextFilters, concatFilter].join(";");

    const scenesPath = join(workDir, "scenes.mp4");
    await runFfmpeg([
      "-y",
      ...sceneFilterInputs,
      "-filter_complex",
      filterComplex,
      "-map",
      "[slides]",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-r",
      "30",
      "-movflags",
      "+faststart",
      scenesPath,
    ]);

    if (!input.narrationAudio) {
      return await readFile(scenesPath);
    }

    const narrationPath = join(workDir, "narration.mp3");
    await writeFile(narrationPath, input.narrationAudio);

    // ffmpeg's `-stream_loop -1` (infinite loop) does not reliably respect
    // `-shortest` — verified to loop indefinitely regardless of -c:v copy vs.
    // re-encode, eventually exhausting memory. Loop a known finite number of
    // times instead (enough to cover the narration), then hard-trim with -t.
    const narrationDurationSeconds = await probeDurationSeconds(narrationPath);
    const loopCount = Math.max(
      0,
      Math.ceil(narrationDurationSeconds / totalSceneSeconds) - 1,
    );

    const outputPath = join(workDir, "output.mp4");
    await runFfmpeg([
      "-y",
      "-stream_loop",
      String(loopCount),
      "-i",
      scenesPath,
      "-i",
      narrationPath,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-t",
      String(narrationDurationSeconds),
      "-shortest",
      "-movflags",
      "+faststart",
      outputPath,
    ]);

    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
