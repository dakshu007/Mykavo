"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Headphones, Highlighter, ListOrdered, Loader2, LocateFixed, Pause, Play, X } from "lucide-react";
import { fontDisplay } from "@/components/landing/style";
import { track } from "@/lib/analytics";
import type { TimelineSegment } from "@mykavo/shared/read-along";
import { ReadAlong } from "./read-along";

export interface AudioChapter {
  title: string;
  startMs: number;
  /** Anchor of the matching heading in the post, when there is one. */
  headingId?: string | null;
}

interface Props {
  src: string;
  /** Read-along timeline (word timings), when this narration has one. */
  timelineSrc?: string | null;
  slug: string;
  title: string;
  author: string;
  artwork?: string;
  durationMs: number;
  chapters: AudioChapter[];
  peaks: number[];
  className?: string;
}

const RATES = [1, 1.25, 1.5, 1.75, 2, 0.75] as const;
const SKIP_SECONDS = 15;
const MILESTONES = [25, 50, 75, 100] as const;

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** Brings the block being read into view, unless it already is. */
function scrollToReading(el: HTMLElement, force = false): void {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight;
  if (!force && rect.top >= vh * 0.15 && rect.bottom <= vh * 0.72) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
}

/** Resamples the stored waveform to `count` bars, keeping each slice's peak. */
function resample(peaks: number[], count: number): number[] {
  if (peaks.length === 0) return new Array(count).fill(40);
  if (peaks.length === count) return peaks;
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const start = Math.floor((i * peaks.length) / count);
    const end = Math.max(start + 1, Math.floor(((i + 1) * peaks.length) / count));
    out.push(Math.max(...peaks.slice(start, end)));
  }
  return out;
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: resume simply isn't remembered.
  }
}

function SkipIcon({ forward }: { forward?: boolean }) {
  return (
    <span className="relative grid size-9 place-items-center">
      <svg viewBox="0 0 24 24" className={`size-8 ${forward ? "-scale-x-100" : ""}`} aria-hidden fill="none">
        <path
          d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path d="M6.4 2.9v4.1h4.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="absolute inset-0 grid place-items-center pt-[3px] font-mono text-[8.5px] font-bold">15</span>
    </span>
  );
}

/**
 * "Listen to this article": the post read aloud by an AI narrator.
 *
 * Duration, chapters and waveform come from the server (blog_audio), so the
 * player renders complete without loading a byte of audio; the MP3 is only
 * fetched once someone presses play. While playing, a mini player follows
 * the reader down the page, and lock-screen controls work through the Media
 * Session API.
 */
export function AudioPlayer({ src, timelineSrc = null, slug, title, author, artwork, durationMs, chapters, peaks, className = "" }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const milestonesRef = useRef(new Set<number>());
  const draggingRef = useRef(false);
  const readAlongRef = useRef<ReadAlong | null>(null);
  const activeElRef = useRef<HTMLElement | null>(null);

  const [duration, setDuration] = useState(durationMs / 1000);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [rate, setRate] = useState<number>(1);
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [barCount, setBarCount] = useState(120);
  const [cardVisible, setCardVisible] = useState(true);
  const [miniDismissed, setMiniDismissed] = useState(false);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [started, setStarted] = useState(false);
  // Read-along: highlight what is being read, and keep it in view.
  const [readAlongReady, setReadAlongReady] = useState(false);
  const [readAlongOn, setReadAlongOn] = useState(true);
  const [follow, setFollow] = useState(true);

  const showMini = playing && !cardVisible && !miniDismissed;
  const positionKey = `mk-audio:${slug}`;
  const bars = useMemo(() => resample(peaks, barCount), [peaks, barCount]);
  const progress = duration > 0 ? Math.min(1, time / duration) : 0;
  const shown = hover ?? progress;

  const chapterIndex = useMemo(() => {
    let index = 0;
    chapters.forEach((c, i) => {
      if (c.startMs / 1000 <= time + 0.25) index = i;
    });
    return index;
  }, [chapters, time]);
  const chapter = chapters[chapterIndex];

  // Remembered position and speed: read once after hydration (the server
  // render can't know them).
  useEffect(() => {
    const saved = Number(readStorage(positionKey));
    const savedRate = Number(readStorage("mk-audio-rate"));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from localStorage after hydration
    if (saved > 5 && saved < durationMs / 1000 - 5) setResumeAt(saved);
    if ((RATES as readonly number[]).includes(savedRate)) setRate(savedRate);
    if (readStorage("mk-read-along") === "0") setReadAlongOn(false);
  }, [positionKey, durationMs]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  // As many bars as fit: about one per 5px.
  useEffect(() => {
    const el = waveRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 600;
      setBarCount(Math.max(48, Math.min(180, Math.floor(width / 5))));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The mini player appears once the card scrolls out of view.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setCardVisible(entry?.isIntersecting ?? true), {
      threshold: 0.15,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Smooth playhead while playing; timeupdate alone ticks ~4 times a second.
  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      const audio = audioRef.current;
      if (audio && !draggingRef.current) setTime(audio.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  // Paint the sentence and word being read; follow it down the page.
  useEffect(() => {
    const ra = readAlongRef.current;
    if (!ra || !readAlongReady) return;
    if (!readAlongOn || !started) {
      ra.clear();
      activeElRef.current = null;
      return;
    }
    const { element } = ra.update(time * 1000);
    if (element && element !== activeElRef.current) {
      activeElRef.current = element;
      if (follow && playing) scrollToReading(element);
    }
  }, [time, readAlongOn, readAlongReady, started, follow, playing]);

  useEffect(() => () => readAlongRef.current?.clear(), []);

  // Scrolling by hand means "let me look around": stop following until the
  // reader asks again (the Follow button).
  useEffect(() => {
    if (!playing || !follow || !readAlongOn || !readAlongReady) return;
    const stop = () => setFollow(false);
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable], [role='slider'], button")) return;
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) stop();
    };
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchmove", stop, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
      window.removeEventListener("keydown", onKey);
    };
  }, [playing, follow, readAlongOn, readAlongReady]);

  // While the docked player shows, the page's own bottom bar (the sign-up
  // CTA) steps aside, and the page gets room so nothing hides under it.
  useEffect(() => {
    const root = document.documentElement;
    if (showMini) root.setAttribute("data-audio-dock", "");
    else root.removeAttribute("data-audio-dock");
    return () => root.removeAttribute("data-audio-dock");
  }, [showMini]);

  const resumeFollowing = () => {
    setFollow(true);
    if (activeElRef.current) scrollToReading(activeElRef.current, true);
  };

  const toggleReadAlong = () => {
    const next = !readAlongOn;
    setReadAlongOn(next);
    writeStorage("mk-read-along", next ? null : "0");
    if (next) setFollow(true);
  };

  const seek = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      const target = Math.max(0, Math.min(duration || seconds, seconds));
      setTime(target);
      if (audio) audio.currentTime = target;
    },
    [duration],
  );

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setFailed(false);
    if (!started) {
      setStarted(true);
      // The timeline loads on the first press, never for readers who only read.
      // Derived from the audio URL rather than trusted from the page: a page
      // cached before the post had timings would otherwise never load them.
      const timelineUrl = timelineSrc ?? src.replace(/\.mp3$/, ".json");
      if (!readAlongRef.current) {
        void fetch(timelineUrl)
          .then((res) => (res.ok ? (res.json() as Promise<{ segments?: TimelineSegment[] }>) : null))
          .then((data) => {
            if (!data?.segments?.length) return;
            const ra = new ReadAlong(data.segments);
            if (ra.matchedCount === 0) return;
            readAlongRef.current = ra;
            setReadAlongReady(true);
          })
          .catch(() => {
            // Read-along is an extra; the audio plays without it.
          });
      }
      if (resumeAt !== null) audio.currentTime = resumeAt;
      track("blog_audio_play", { slug, resumed: resumeAt !== null });
      setResumeAt(null);
    }
    audio.playbackRate = rate;
    try {
      await audio.play();
    } catch {
      // Autoplay policy or a load error; the error event shows the message.
    }
  }, [rate, resumeAt, slug, started, timelineSrc, src]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void play();
    else audio.pause();
  }, [play]);

  const cycleRate = () => {
    const next = RATES[(RATES.indexOf(rate as (typeof RATES)[number]) + 1) % RATES.length] ?? 1;
    setRate(next);
    writeStorage("mk-audio-rate", String(next));
  };

  // Lock-screen / headphone controls.
  useEffect(() => {
    if (!("mediaSession" in navigator) || !playing) return;
    const session = navigator.mediaSession;
    session.metadata = new MediaMetadata({
      title,
      artist: author,
      album: "MyKavo Blog",
      artwork: artwork ? [{ src: artwork, sizes: "1200x630", type: "image/png" }] : [],
    });
    const audio = audioRef.current;
    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ["play", () => void play()],
      ["pause", () => audio?.pause()],
      ["seekbackward", () => seek((audio?.currentTime ?? 0) - SKIP_SECONDS)],
      ["seekforward", () => seek((audio?.currentTime ?? 0) + SKIP_SECONDS)],
      ["seekto", (d) => d.seekTime !== undefined && seek(d.seekTime)],
    ];
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Unsupported action on this browser.
      }
    }
  }, [playing, title, author, artwork, play, seek]);

  const onTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!playing) setTime(audio.currentTime);
    if (Math.floor(audio.currentTime) % 5 === 0) writeStorage(positionKey, String(Math.floor(audio.currentTime)));
    const pct = duration > 0 ? (audio.currentTime / duration) * 100 : 0;
    for (const m of MILESTONES) {
      if (pct >= m - (m === 100 ? 1 : 0) && !milestonesRef.current.has(m)) {
        milestonesRef.current.add(m);
        track("blog_audio_progress", { slug, percent: m });
      }
    }
  };

  // Pointer scrubbing on the waveform.
  const fractionAt = (clientX: number) => {
    const rect = waveRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setTime(fractionAt(e.clientX) * duration);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const f = fractionAt(e.clientX);
    if (e.pointerType === "mouse") setHover(f);
    if (draggingRef.current) setTime(f * duration);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    seek(fractionAt(e.clientX) * duration);
    if (!started) void play();
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = { ArrowLeft: -5, ArrowRight: 5, PageDown: -30, PageUp: 30 };
    if (e.key in steps) {
      e.preventDefault();
      seek(time + steps[e.key]!);
    } else if (e.key === "Home") {
      e.preventDefault();
      seek(0);
    } else if (e.key === "End") {
      e.preventDefault();
      seek(duration - 1);
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggle();
    }
  };

  const goToSection = (headingId: string) => {
    document.getElementById(headingId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const playedBars = Math.round(progress * bars.length);
  const hoverBars = hover === null ? -1 : Math.round(hover * bars.length);
  const ring = `conic-gradient(#FFD400 ${progress * 360}deg, rgba(255,255,255,0.14) 0deg)`;
  const remaining = Math.max(0, duration - time);

  return (
    <>
      <section
        ref={cardRef}
        aria-label="Listen to this article"
        className={`relative overflow-visible rounded-2xl border-2 border-[#151515] bg-[#151515] p-5 text-white shadow-[6px_6px_0_#FFD400] sm:p-6 ${className}`}
      >
        <audio
          ref={audioRef}
          src={src}
          preload="none"
          onPlay={() => {
            setPlaying(true);
            setMiniDismissed(false);
          }}
          onPause={() => {
            setPlaying(false);
            const audio = audioRef.current;
            if (audio) writeStorage(positionKey, String(Math.floor(audio.currentTime)));
          }}
          onEnded={() => {
            setPlaying(false);
            writeStorage(positionKey, null);
          }}
          onWaiting={() => setWaiting(true)}
          onPlaying={() => setWaiting(false)}
          onCanPlay={() => setWaiting(false)}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setDuration(d);
          }}
          onTimeUpdate={onTimeUpdate}
          onError={() => {
            setFailed(true);
            setPlaying(false);
            setWaiting(false);
          }}
        />

        <div className="flex items-center gap-4 sm:gap-5">
          {/* Play button with a progress ring around it. */}
          <div className="relative shrink-0">
            {playing && <span aria-hidden className="audio-ping absolute inset-0 rounded-full bg-[#FFD400]" />}
            <span aria-hidden className="absolute -inset-[5px] rounded-full" style={{ background: ring }} />
            <span aria-hidden className="absolute -inset-[2px] rounded-full bg-[#151515]" />
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? "Pause narration" : resumeAt !== null ? `Resume narration at ${formatTime(resumeAt)}` : "Play narration"}
              className="relative grid size-16 place-items-center rounded-full bg-[#FFD400] text-[#151515] transition-transform duration-150 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFD400] active:scale-95 motion-reduce:transition-none sm:size-[72px]"
            >
              {waiting && playing ? (
                <Loader2 className="size-7 animate-spin motion-reduce:animate-none" aria-hidden />
              ) : playing ? (
                <Pause className="size-7 fill-current" aria-hidden />
              ) : (
                <Play className="ml-1 size-7 fill-current" aria-hidden />
              )}
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#FFD400]">
              <Headphones className="size-3.5" aria-hidden />
              Listen to this article
            </p>
            <p className={`${fontDisplay} mt-1 truncate text-[19px] leading-tight sm:text-[22px]`} aria-live="polite">
              {started && chapter ? chapter.title : `${Math.max(1, Math.round(duration / 60))} minute listen`}
            </p>
            <p className="mt-1 truncate text-[12.5px] text-[#9C9E93]">
              {failed
                ? "The audio couldn't load. Try again in a moment."
                : resumeAt !== null
                  ? `Pick up where you left off at ${formatTime(resumeAt)}`
                  : `Narrated by an AI voice · ${chapters.length} chapters`}
            </p>
          </div>

          <div className="hidden items-center gap-1 sm:flex">
            <button
              type="button"
              onClick={() => seek(time - SKIP_SECONDS)}
              aria-label="Back 15 seconds"
              className="rounded-full p-1 text-[#C9CBBF] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#FFD400]"
            >
              <SkipIcon />
            </button>
            <button
              type="button"
              onClick={() => seek(time + SKIP_SECONDS)}
              aria-label="Forward 15 seconds"
              className="rounded-full p-1 text-[#C9CBBF] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#FFD400]"
            >
              <SkipIcon forward />
            </button>
          </div>
        </div>

        {/* Waveform: real loudness of the narration; click or drag to seek. */}
        <div className="relative mt-5">
          {/* Chapter markers */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-2 h-1.5">
            {chapters.slice(1).map((c) => {
              const at = duration > 0 ? c.startMs / 1000 / duration : 0;
              return (
                <span
                  key={`${c.title}-${c.startMs}`}
                  className={`absolute top-0 size-1.5 -translate-x-1/2 rounded-full ${at <= progress ? "bg-[#FFD400]" : "bg-white/30"}`}
                  style={{ left: `${at * 100}%` }}
                />
              );
            })}
          </div>
          <div
            ref={waveRef}
            role="slider"
            tabIndex={0}
            aria-label="Seek narration"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(time)}
            aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => setHover(null)}
            onKeyDown={onKeyDown}
            className="group relative flex h-14 cursor-pointer touch-none items-center gap-[2px] rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFD400]"
          >
            {bars.map((value, i) => {
              const played = i < playedBars;
              const hovered = hover !== null && i < hoverBars && !played;
              const near = playing && Math.abs(i - playedBars) <= 2;
              return (
                <span
                  key={i}
                  aria-hidden
                  className={`flex-1 rounded-full transition-colors duration-150 ${near ? "audio-eq" : ""} ${
                    played ? "bg-[#FFD400]" : hovered ? "bg-white/55" : "bg-white/22"
                  }`}
                  style={{
                    height: `${Math.max(10, value)}%`,
                    animationDelay: near ? `${(i % 3) * 0.15}s` : undefined,
                  }}
                />
              );
            })}
            {hover !== null && (
              <span
                aria-hidden
                className="pointer-events-none absolute -top-8 -translate-x-1/2 rounded-md bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#151515] shadow-[2px_2px_0_#FFD400]"
                style={{ left: `${hover * 100}%` }}
              >
                {formatTime(hover * duration)}
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 text-[12px] text-[#9C9E93]">
          <span className="font-mono tabular-nums text-white">{formatTime(shown * duration)}</span>
          <span className="font-mono tabular-nums">-{formatTime(hover !== null ? duration - hover * duration : remaining)}</span>
          <div className="ml-auto flex items-center gap-2">
            {(timelineSrc || readAlongReady) && (
              <button
                type="button"
                onClick={toggleReadAlong}
                aria-pressed={readAlongOn}
                title="Highlight the words as they are read"
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#FFD400] ${
                  readAlongOn
                    ? "border-[#FFD400] bg-[#FFD400]/15 text-[#FFD400]"
                    : "border-white/20 text-white hover:border-[#FFD400] hover:text-[#FFD400]"
                }`}
              >
                <Highlighter className="size-3.5" aria-hidden />
                <span className="hidden sm:inline">Read along</span>
              </button>
            )}
            {chapters.length > 1 && (
              <button
                type="button"
                onClick={() => setChaptersOpen((v) => !v)}
                aria-expanded={chaptersOpen}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/20 px-3 font-semibold text-white transition-colors hover:border-[#FFD400] hover:text-[#FFD400] focus-visible:outline-2 focus-visible:outline-[#FFD400]"
              >
                <ListOrdered className="size-3.5" aria-hidden />
                Chapters
              </button>
            )}
            <button
              type="button"
              onClick={cycleRate}
              aria-label={`Playback speed ${rate}x, change`}
              className="inline-flex h-8 min-w-14 items-center justify-center rounded-full bg-white px-3 font-mono font-bold text-[#151515] transition-colors hover:bg-[#FFD400] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD400]"
            >
              {rate}×
            </button>
          </div>
        </div>

        {chaptersOpen && (
          <ol className="mt-4 max-h-72 space-y-0.5 overflow-y-auto border-t border-white/10 pt-3">
            {chapters.map((c, i) => {
              const active = started && i === chapterIndex;
              return (
                <li key={`${c.title}-${c.startMs}`} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      seek(c.startMs / 1000);
                      if (audioRef.current?.paused) void play();
                    }}
                    className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left text-[13.5px] transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#FFD400] ${
                      active ? "bg-white/10 text-[#FFD400]" : "text-[#E9EBDF]"
                    }`}
                  >
                    <span className="w-11 shrink-0 font-mono text-[11.5px] tabular-nums text-[#9C9E93]">
                      {formatTime(c.startMs / 1000)}
                    </span>
                    <span className="truncate">{c.title}</span>
                    {active && playing && (
                      <span aria-hidden className="ml-auto flex h-3 items-end gap-[2px]">
                        {[0, 1, 2].map((b) => (
                          <span key={b} className="audio-eq h-full w-[3px] rounded-full bg-[#FFD400]" style={{ animationDelay: `${b * 0.2}s` }} />
                        ))}
                      </span>
                    )}
                  </button>
                  {c.headingId && (
                    <button
                      type="button"
                      onClick={() => goToSection(c.headingId!)}
                      aria-label={`Read “${c.title}” in the article`}
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-[#9C9E93] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#FFD400]"
                    >
                      <ArrowUpRight className="size-4" aria-hidden />
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Mini player: follows the reader once the card is off screen. Docked
          edge to edge at the bottom on phones and tablets (with a progress
          line along its top), a floating card on desktop. */}
      <div
        aria-hidden={!showMini}
        className={`fixed inset-x-0 bottom-0 z-50 transition-all duration-300 motion-reduce:transition-none lg:inset-x-auto lg:bottom-6 lg:left-6 lg:w-[380px] ${
          showMini ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0 lg:translate-y-4"
        }`}
      >
        <div className="relative flex items-center gap-3 rounded-t-[20px] bg-[#151515] pt-3.5 pr-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-4 text-white shadow-[0_-10px_30px_rgba(21,21,21,0.18)] lg:rounded-2xl lg:border-2 lg:border-[#151515] lg:py-2 lg:pr-2 lg:pl-2 lg:shadow-[4px_4px_0_#FFD400]">
          <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] overflow-hidden rounded-t-[20px] bg-white/10 lg:hidden">
            <span className="block h-full bg-[#FFD400]" style={{ width: `${progress * 100}%` }} />
          </span>
          <div className="relative shrink-0">
            <span aria-hidden className="absolute -inset-[3px] rounded-full" style={{ background: ring }} />
            <span aria-hidden className="absolute -inset-px rounded-full bg-[#151515]" />
            <button
              type="button"
              tabIndex={showMini ? 0 : -1}
              onClick={toggle}
              aria-label={playing ? "Pause narration" : "Play narration"}
              className="relative grid size-10 place-items-center rounded-full bg-[#FFD400] text-[#151515] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD400]"
            >
              {playing ? <Pause className="size-4 fill-current" aria-hidden /> : <Play className="ml-0.5 size-4 fill-current" aria-hidden />}
            </button>
          </div>
          <button
            type="button"
            tabIndex={showMini ? 0 : -1}
            onClick={() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-[#FFD400]"
          >
            <span className="block truncate text-[13px] font-semibold">{chapter?.title ?? title}</span>
            <span className="block truncate font-mono text-[11px] tabular-nums text-[#9C9E93]">
              {formatTime(time)} / {formatTime(duration)} · {rate}×
            </span>
          </button>
          <button
            type="button"
            tabIndex={showMini ? 0 : -1}
            onClick={() => seek(time + SKIP_SECONDS)}
            aria-label="Forward 15 seconds"
            className={`hidden shrink-0 rounded-full text-[#C9CBBF] hover:text-white focus-visible:outline-2 focus-visible:outline-[#FFD400] ${
              readAlongReady && readAlongOn && !follow ? "" : "sm:block"
            }`}
          >
            <SkipIcon forward />
          </button>
          {readAlongReady && readAlongOn && !follow && (
            <button
              type="button"
              tabIndex={showMini ? 0 : -1}
              onClick={resumeFollowing}
              aria-label="Jump to the words being read and follow them"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-[#FFD400] px-3 text-[12px] font-bold text-[#151515] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD400]"
            >
              <LocateFixed className="size-3.5" aria-hidden />
              Follow
            </button>
          )}
          <button
            type="button"
            tabIndex={showMini ? 0 : -1}
            onClick={() => {
              audioRef.current?.pause();
              setMiniDismissed(true);
            }}
            aria-label="Stop and close the mini player"
            className="grid size-8 shrink-0 place-items-center rounded-full text-[#9C9E93] hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#FFD400]"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </>
  );
}
