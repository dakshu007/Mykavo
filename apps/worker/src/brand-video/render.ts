/**
 * MP4 export: opens the composed video document (packages/brand-video
 * composeVideoHtml, mode "render") in its own headless Chromium, steps the
 * shared animation clock one frame at a time, and pipes each frame into
 * ffmpeg (H.264, yuv420p, faststart: plays everywhere, starts instantly).
 *
 * The document is our own, built from escaped text and data: images; the
 * only network it may reach is Google Fonts. Everything else is blocked, so
 * a page under render can never fetch anything else. Chromium keeps its
 * sandbox (same rule as the scanner).
 */
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser } from "playwright";
import { BASE_SIZE, VIDEO_FPS, type VideoFormat } from "@mykavo/brand-video/pure";

export class RenderError extends Error {
  constructor(
    public readonly code: "no_ffmpeg" | "timeout" | "ffmpeg" | "page",
    message: string,
  ) {
    super(message);
    this.name = "RenderError";
  }
}

export interface RenderInput {
  html: string;
  format: VideoFormat;
  /** 720 renders the canvas 1:1, 1080 at 1.5x. */
  quality: 720 | 1080;
  durationSec: number;
  onProgress?: (fraction: number) => void | Promise<void>;
  /** Hard limit for the whole export. */
  timeoutMs?: number;
}

export interface RenderOutput {
  mp4: Buffer;
  poster: Buffer;
  width: number;
  height: number;
  frames: number;
}

const ALLOWED_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);

let ffmpegChecked: boolean | null = null;
export async function ffmpegAvailable(): Promise<boolean> {
  if (ffmpegChecked !== null) return ffmpegChecked;
  ffmpegChecked = await new Promise<boolean>((resolve) => {
    const p = spawn("ffmpeg", ["-hide_banner", "-version"], { stdio: "ignore" });
    p.on("error", () => resolve(false));
    p.on("exit", (code) => resolve(code === 0));
  });
  return ffmpegChecked;
}

async function launch(): Promise<Browser> {
  return chromium.launch({
    // Only for running the worker outside its image (local tests).
    ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}),
    args: ["--disable-dev-shm-usage", "--hide-scrollbars", "--font-render-hinting=none", "--disable-gpu"],
  });
}

export async function renderVideo(input: RenderInput): Promise<RenderOutput> {
  if (!(await ffmpegAvailable())) {
    throw new RenderError("no_ffmpeg", "Video export isn't available on this server yet. Please try again later.");
  }
  const base = BASE_SIZE[input.format];
  const scale = input.quality === 1080 ? 1.5 : 1;
  const width = Math.round(base.width * scale);
  const height = Math.round(base.height * scale);
  const frames = Math.max(1, Math.round(input.durationSec * VIDEO_FPS));
  const deadline = Date.now() + (input.timeoutMs ?? 12 * 60_000);

  const dir = await mkdtemp(join(tmpdir(), "mk-video-"));
  const out = join(dir, "out.mp4");
  const browser = await launch();
  let ffmpeg: ReturnType<typeof spawn> | null = null;
  try {
    const context = await browser.newContext({
      viewport: base,
      deviceScaleFactor: scale,
      locale: "en-US",
      timezoneId: "UTC",
      reducedMotion: "no-preference",
    });
    await context.route("**/*", (route) => {
      const url = route.request().url();
      if (url.startsWith("data:") || url.startsWith("about:")) return route.continue();
      try {
        const u = new URL(url);
        if (u.protocol === "https:" && ALLOWED_HOSTS.has(u.hostname)) return route.continue();
      } catch {
        /* fall through */
      }
      return route.abort("blockedbyclient");
    });
    const page = await context.newPage();
    await page.setContent(input.html, { waitUntil: "load", timeout: 45_000 });
    const ready = await page
      .evaluate(
        `Promise.race([window.__mkReady, new Promise((r) => setTimeout(() => r("timeout"), 20000))])`,
      )
      .catch(() => "error");
    if (ready !== true) {
      // Fonts or images took too long: render anyway with what loaded.
      await page.evaluate("window.__mkSeek && window.__mkSeek(0)").catch(() => {});
    }
    const cdp = await context.newCDPSession(page);

    ffmpeg = spawn(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "image2pipe",
        "-framerate",
        String(VIDEO_FPS),
        "-c:v",
        "mjpeg",
        "-i",
        "-",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-vf",
        `scale=${width}:${height}:flags=lanczos`,
        "-r",
        String(VIDEO_FPS),
        "-movflags",
        "+faststart",
        out,
      ],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    let ffmpegErr = "";
    ffmpeg.stderr?.on("data", (d: Buffer) => {
      ffmpegErr = (ffmpegErr + d.toString()).slice(-2000);
    });
    const exited = new Promise<number>((resolve, reject) => {
      ffmpeg!.on("error", reject);
      ffmpeg!.on("exit", (code) => resolve(code ?? 1));
    });
    const stdin = ffmpeg.stdin!;
    const write = (buf: Buffer) =>
      new Promise<void>((resolve, reject) => {
        if (stdin.write(buf)) resolve();
        else {
          stdin.once("drain", resolve);
          stdin.once("error", reject);
        }
      });

    let poster: Buffer | null = null;
    const posterFrame = Math.min(frames - 1, Math.round(Math.min(input.durationSec * 0.4, 6) * VIDEO_FPS));
    let lastReported = -1;
    for (let i = 0; i < frames; i += 1) {
      if (Date.now() > deadline) throw new RenderError("timeout", "The export took too long and was stopped. Please try again.");
      await page.evaluate(`window.__mkSeek(${(i / VIDEO_FPS).toFixed(4)})`);
      const shot = (await cdp.send("Page.captureScreenshot", {
        format: "jpeg",
        quality: 92,
        optimizeForSpeed: true,
        captureBeyondViewport: false,
      })) as { data: string };
      const buf = Buffer.from(shot.data, "base64");
      if (i === posterFrame) poster = buf;
      await write(buf);
      const pct = Math.floor((i / frames) * 100);
      if (input.onProgress && pct >= lastReported + 5) {
        lastReported = pct;
        await input.onProgress(i / frames);
      }
    }
    stdin.end();
    const code = await exited;
    ffmpeg = null;
    if (code !== 0) throw new RenderError("ffmpeg", `ffmpeg exited with ${code}: ${ffmpegErr.slice(-300)}`);
    const mp4 = await readFile(out);
    return { mp4, poster: poster ?? Buffer.alloc(0), width, height, frames };
  } finally {
    if (ffmpeg) ffmpeg.kill("SIGKILL");
    await browser.close().catch(() => {});
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
