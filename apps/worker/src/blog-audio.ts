import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma, type Prisma } from "@mykavo/database";
import { getDefaultStorage } from "@mykavo/scanner/storage";
import {
  buildNarration,
  chunkSegments,
  waveformPeaks,
  type NarrationScript,
} from "@mykavo/shared/blog-narration";
import { TIMELINE_VERSION, type TimelineSegment } from "@mykavo/shared/read-along";
import { logger } from "./logger";

/**
 * "Listen to this article": narrates published blog posts with ElevenLabs.
 *
 * Each sweep picks the posts whose audio is missing or no longer matches the
 * post's text (the narration hash changed), and for each one:
 *
 *   1. builds the narration script (packages/shared/blog-narration.ts),
 *   2. asks ElevenLabs for raw PCM, chunk by chunk, stitching every request
 *      to the ones before it so the voice keeps one tone across the post,
 *   3. joins the chunks with a short pause between chapters, measuring each
 *      chapter's start time and the waveform from the samples themselves,
 *   4. encodes ONE MP3 with ffmpeg (a single lossy pass over lossless audio)
 *      and stores it in object storage,
 *   5. records duration, chapters and waveform in blog_audio.
 *
 * Off unless ELEVENLABS_API_KEY is set. Bounded by a daily character cap and
 * a per-sweep post limit, so a bug can never spend the account dry.
 */

const API_BASE = "https://api.elevenlabs.io/v1";
// "Jessica - Playful, Bright, Warm", an ElevenLabs premade American voice
// (no need to add it to the account). Override with BLOG_AUDIO_VOICE_ID.
// Changing the voice narrates every post again in the new one.
const DEFAULT_VOICE_ID = "cgSgspJ2msm6clMCkdW9";
// ElevenLabs' most natural model for long-form narration, and the one that
// supports request stitching.
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";
const PAUSE_BETWEEN_CHAPTERS_MS = 700;
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_ATTEMPTS = 3;

interface AudioConfig {
  apiKey: string;
  voiceId: string;
  modelId: string;
  dailyChars: number;
  postsPerSweep: number;
}

function config(): AudioConfig | null {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    voiceId: process.env.BLOG_AUDIO_VOICE_ID?.trim() || DEFAULT_VOICE_ID,
    modelId: process.env.BLOG_AUDIO_MODEL_ID?.trim() || DEFAULT_MODEL_ID,
    dailyChars: Number(process.env.BLOG_AUDIO_DAILY_CHARS ?? 2_500_000),
    postsPerSweep: Number(process.env.BLOG_AUDIO_POSTS_PER_SWEEP ?? 8),
  };
}

/** A failure that should stop the whole sweep, not just this post. */
class FatalAudioError extends Error {}

/** Characters billed in the last 24 hours, failed attempts included. */
let spentWindow: Array<{ at: number; chars: number }> = [];
function spentLastDay(): number {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  spentWindow = spentWindow.filter((s) => s.at > cutoff);
  return spentWindow.reduce((sum, s) => sum + s.chars, 0);
}

interface Synthesized {
  pcm: Buffer;
  requestId: string | null;
  /** Start time in seconds of each character of the request text, when ElevenLabs returned one per character. */
  charStarts: number[] | null;
}

async function synthesize(
  cfg: AudioConfig,
  text: string,
  sampleRate: number,
  previousRequestIds: string[],
  nextText: string | undefined,
): Promise<Synthesized> {
  // The with-timestamps variant returns the same audio plus the start time
  // of every character, which is what read-along highlighting runs on.
  const url = `${API_BASE}/text-to-speech/${encodeURIComponent(cfg.voiceId)}/with-timestamps?output_format=pcm_${sampleRate}`;
  const body: Record<string, unknown> = {
    text,
    model_id: cfg.modelId,
    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true },
  };
  if (previousRequestIds.length > 0) body.previous_request_ids = previousRequestIds.slice(-3);
  if (nextText) body.next_text = nextText.slice(0, 1000);

  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "xi-api-key": cfg.apiKey, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (res.ok) {
        spentWindow.push({ at: Date.now(), chars: text.length });
        const json = (await res.json()) as {
          audio_base64?: string;
          alignment?: { characters?: string[]; character_start_times_seconds?: number[] } | null;
        };
        if (!json.audio_base64) throw new Error("ElevenLabs returned no audio");
        const chars = json.alignment?.characters;
        const starts = json.alignment?.character_start_times_seconds;
        const charStarts =
          chars && starts && starts.length === text.length && chars.join("") === text ? starts : null;
        return {
          pcm: Buffer.from(json.audio_base64, "base64"),
          requestId: res.headers.get("request-id"),
          charStarts,
        };
      }
      const detail = (await res.text()).slice(0, 400);
      lastError = `ElevenLabs ${res.status}: ${detail}`;
      // Bad key, no credits, unknown voice, format not on this plan: no
      // retry fixes these, and every later post would hit them too.
      if (res.status === 401 || res.status === 402 || /quota|voice_not_found|output_format/i.test(detail)) {
        throw new FatalAudioError(lastError);
      }
      if (res.status < 500 && res.status !== 429) throw new Error(lastError);
    } catch (err) {
      if (err instanceof FatalAudioError) throw err;
      lastError = err instanceof Error ? err.message : String(err);
      if (!/ElevenLabs (429|5\d\d)|abort|fetch failed|ECONNRESET|ETIMEDOUT/i.test(lastError)) throw err;
    } finally {
      clearTimeout(timer);
    }
    await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
  }
  throw new Error(lastError || "ElevenLabs request failed");
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d: Buffer) => {
      stderr = (stderr + d.toString()).slice(-2000);
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`)),
    );
  });
}

interface Narrated {
  mp3: Buffer;
  durationMs: number;
  chapters: Array<{ title: string; startMs: number }>;
  peaks: number[];
  timeline: TimelineSegment[];
}

async function narrate(cfg: AudioConfig, script: NarrationScript, title: string): Promise<Narrated> {
  const plan = script.chapters.map((chapter) => ({ chapter, chunks: chunkSegments(chapter.segments) }));
  const flat = plan.flatMap((p) => p.chunks.map((c) => c.text));

  // 44.1 kHz where the plan allows it, else 24 kHz; decided on the first
  // request and kept for the whole post (one file, one sample rate).
  let sampleRate = 44100;
  const parts: Buffer[] = [];
  const chapters: Narrated["chapters"] = [];
  const timeline: TimelineSegment[] = [];
  const requestIds: string[] = [];
  let bytes = 0;
  let index = 0;
  const msAt = (byteOffset: number) => (byteOffset / 2 / sampleRate) * 1000;

  for (const [chapterIndex, { chapter, chunks }] of plan.entries()) {
    if (parts.length > 0) {
      const pause = Buffer.alloc(Math.round((sampleRate * PAUSE_BETWEEN_CHAPTERS_MS) / 1000) * 2);
      parts.push(pause);
      bytes += pause.length;
    }
    chapters.push({ title: chapter.title, startMs: Math.round(msAt(bytes)) });
    // One timeline entry per segment of this chapter, filled chunk by chunk.
    const entries = new Map<number, TimelineSegment>();

    for (const chunk of chunks) {
      const next = flat[index + 1];
      let result: Synthesized;
      try {
        result = await synthesize(cfg, chunk.text, sampleRate, requestIds, next);
      } catch (err) {
        if (index === 0 && sampleRate === 44100 && err instanceof FatalAudioError && /output_format/i.test(err.message)) {
          sampleRate = 24000;
          result = await synthesize(cfg, chunk.text, sampleRate, requestIds, next);
        } else {
          throw err;
        }
      }
      // 16-bit samples: keep the byte count even.
      const pcm = result.pcm.length % 2 === 0 ? result.pcm : result.pcm.subarray(0, result.pcm.length - 1);
      const chunkStartMs = msAt(bytes);
      const chunkMs = msAt(pcm.length);

      for (const part of chunk.parts) {
        let entry = entries.get(part.segment);
        if (!entry) {
          entry = { c: chapterIndex, t: chapter.segments[part.segment]!, w: [] };
          entries.set(part.segment, entry);
          timeline.push(entry);
        }
        const partText = chunk.text.slice(part.start, part.start + part.length);
        for (const m of partText.matchAll(/\S+/g)) {
          const at = part.start + (m.index ?? 0);
          const offset = result.charStarts
            ? (result.charStarts[at] ?? 0) * 1000
            : // No per-character timing: spread the words evenly over the chunk.
              (at / Math.max(1, chunk.text.length)) * chunkMs;
          entry.w.push(Math.round(chunkStartMs + offset));
        }
      }

      parts.push(pcm);
      bytes += pcm.length;
      if (result.requestId) requestIds.push(result.requestId);
      index += 1;
    }
  }

  const pcm = Buffer.concat(parts, bytes);
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
  const peaks = waveformPeaks(samples);
  const durationMs = Math.round((samples.length / sampleRate) * 1000);

  const dir = await mkdtemp(join(tmpdir(), "blog-audio-"));
  try {
    const rawPath = join(dir, "narration.raw");
    const mp3Path = join(dir, "narration.mp3");
    await writeFile(rawPath, pcm);
    await runFfmpeg([
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "s16le", "-ar", String(sampleRate), "-ac", "1", "-i", rawPath,
      "-c:a", "libmp3lame", "-b:a", "128k",
      "-metadata", `title=${title}`, "-metadata", "artist=MyKavo",
      mp3Path,
    ]);
    return { mp3: await readFile(mp3Path), durationMs, chapters, peaks, timeline };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function storageKeyFor(slug: string, hash: string): string {
  const safe = slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 80) || "post";
  return `blog-audio/${safe}-${hash.slice(0, 12)}.mp3`;
}

let running = false;

export async function runBlogAudioSweep(now: Date = new Date()): Promise<void> {
  const cfg = config();
  if (!cfg || running) return;
  running = true;
  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: "PUBLISHED", publishedAt: { lte: now } },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        authorName: true,
        content: true,
        audio: {
          select: {
            narrationHash: true,
            status: true,
            attempts: true,
            storageKey: true,
            timelineVersion: true,
            voiceId: true,
          },
        },
      },
    });

    const due = posts
      .map((post) => ({ post, script: buildNarration(post) }))
      .filter(({ post, script }) => {
        const audio = post.audio;
        if (!audio || audio.narrationHash !== script.hash) return true;
        if (audio.status === "failed") return audio.attempts < MAX_ATTEMPTS;
        // Narrated before read-along existed, or in another voice: narrate
        // again. `attempts` counts the first narration too, hence the +1.
        const outdated = audio.timelineVersion < TIMELINE_VERSION || audio.voiceId !== cfg.voiceId;
        return outdated && audio.attempts < MAX_ATTEMPTS + 1;
      })
      .slice(0, cfg.postsPerSweep);
    if (due.length === 0) return;

    for (const { post, script } of due) {
      if (spentLastDay() + script.characters > cfg.dailyChars) {
        logger.info("blog audio paused: daily character cap reached", {
          spent: spentLastDay(),
          cap: cfg.dailyChars,
        });
        return;
      }
      const sameText = post.audio?.narrationHash === script.hash;
      const attempts = sameText ? (post.audio?.attempts ?? 0) + 1 : 1;
      const started = Date.now();
      try {
        const result = await narrate(cfg, script, post.title);
        const key = storageKeyFor(post.slug, script.hash);
        await getDefaultStorage().put(key, result.mp3, "audio/mpeg");
        const data = {
          status: "ready",
          narrationHash: script.hash,
          storageKey: key,
          voiceId: cfg.voiceId,
          modelId: cfg.modelId,
          durationMs: result.durationMs,
          byteSize: result.mp3.length,
          characters: script.characters,
          chapters: result.chapters as unknown as Prisma.InputJsonValue,
          peaks: result.peaks as unknown as Prisma.InputJsonValue,
          timeline: result.timeline as unknown as Prisma.InputJsonValue,
          timelineVersion: TIMELINE_VERSION,
          error: null,
          // A success starts the retry budget over (re-narrations count up from here).
          attempts: 1,
          generatedAt: new Date(),
        };
        await prisma.blogAudio.upsert({
          where: { postId: post.id },
          create: { postId: post.id, ...data },
          update: data,
        });
        const old = post.audio?.storageKey;
        if (old && old !== key) {
          await getDefaultStorage()
            .delete(old)
            .catch((err) => logger.error("blog audio: old file not deleted", { key: old }, err));
        }
        logger.info("blog audio ready", {
          slug: post.slug,
          characters: script.characters,
          durationMs: result.durationMs,
          bytes: result.mp3.length,
          tookMs: Date.now() - started,
        });
      } catch (err) {
        const message = (err instanceof Error ? err.message : String(err)).slice(0, 500);
        if (sameText && post.audio?.status === "ready") {
          // Only adding read-along timings to audio that already plays:
          // keep it live and just note the failure.
          await prisma.blogAudio.update({ where: { postId: post.id }, data: { error: message, attempts } });
          logger.error("blog audio re-narration failed", { slug: post.slug, attempts }, err);
          if (err instanceof FatalAudioError) return;
          continue;
        }
        // Keep a working file for the old text rather than wiping it: the
        // page hides a player whose hash no longer matches anyway.
        await prisma.blogAudio.upsert({
          where: { postId: post.id },
          create: {
            postId: post.id,
            status: "failed",
            narrationHash: script.hash,
            voiceId: cfg.voiceId,
            modelId: cfg.modelId,
            characters: script.characters,
            error: message,
            attempts,
          },
          update: { status: "failed", narrationHash: script.hash, error: message, attempts },
        });
        logger.error("blog audio failed", { slug: post.slug, attempts }, err);
        if (err instanceof FatalAudioError) return;
      }
    }
  } finally {
    running = false;
  }
}
