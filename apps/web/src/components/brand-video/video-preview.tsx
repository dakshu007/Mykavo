"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { SCENE_INFO, type SceneTiming, type VideoFormat } from "@mykavo/brand-video/pure";
import { cn } from "@/lib/utils";

/**
 * The live preview: the exact document the export records, playing in a
 * sandboxed iframe (scripts only: no same-origin access, no cookies). The
 * page talks to it with postMessage: play, pause, seek; it reports its time.
 */
export function VideoPreview({
  html,
  format,
  timeline,
  total,
  className,
  onTime,
}: {
  html: string;
  format: VideoFormat;
  timeline: SceneTiming[];
  total: number;
  className?: string;
  onTime?: (t: number) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timeRef = useRef(0);
  const playingRef = useRef(true);

  const send = useCallback((msg: Record<string, unknown>) => {
    frame.current?.contentWindow?.postMessage({ source: "mk-control", ...msg }, "*");
  }, []);

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (ev.source !== frame.current?.contentWindow) return;
      const d = ev.data as { source?: string; t?: number; playing?: boolean };
      if (d?.source !== "mk-video" || typeof d.t !== "number") return;
      timeRef.current = d.t;
      playingRef.current = d.playing === true;
      setTime(d.t);
      setPlaying(d.playing === true);
      onTime?.(d.t);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onTime]);

  // An edit reloads the document: carry on from the same moment.
  const onLoad = () => {
    const t = timeRef.current;
    const wasPlaying = playingRef.current;
    window.setTimeout(() => {
      if (t > 0) send({ cmd: "seek", t: Math.min(t, total) });
      send({ cmd: wasPlaying ? "play" : "pause" });
    }, 60);
  };

  const toggle = () => send({ cmd: playing ? "pause" : "play" });
  const seek = (t: number) => {
    timeRef.current = t;
    setTime(t);
    send({ cmd: "seek", t });
  };

  const aspect = format === "landscape" ? "aspect-video" : format === "portrait" ? "aspect-[9/16]" : "aspect-square";
  const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "relative mx-auto overflow-hidden rounded-xl border border-line bg-black shadow-sm",
          aspect,
          format === "portrait" ? "max-h-[70vh]" : "w-full",
        )}
      >
        <iframe
          ref={frame}
          title="Video preview"
          sandbox="allow-scripts"
          srcDoc={html}
          onLoad={onLoad}
          className="absolute inset-0 size-full border-0"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label={playing ? "Pause preview" : "Play preview"}
        >
          {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
        </button>
        <button type="button" onClick={() => { seek(0); send({ cmd: "play" }); }} className="inline-flex size-8 items-center justify-center rounded-full text-ink-secondary hover:bg-ink/5" aria-label="Play from the start">
          <RotateCcw className="size-4" aria-hidden />
        </button>
        <input
          type="range"
          min={0}
          max={total}
          step={0.05}
          value={Math.min(time, total)}
          onChange={(e) => seek(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer accent-[var(--color-accent)]"
          aria-label="Preview position"
        />
        <span className="w-[84px] shrink-0 text-right font-mono text-[12px] tabular-nums text-ink-secondary">
          {fmt(time)} / {fmt(total)}
        </span>
      </div>
      <ol className="flex gap-0.5 overflow-hidden rounded-md" aria-label="Scenes">
        {timeline.map((s, i) => {
          const active = time >= s.start && time < s.end;
          return (
            <li key={s.id} style={{ flexGrow: Math.max(0.5, s.end - s.start) }} className="min-w-0 basis-0">
              <button
                type="button"
                onClick={() => seek(s.start + 0.05)}
                title={`${i + 1}. ${SCENE_INFO[s.type].label}`}
                className={cn(
                  "block h-7 w-full truncate px-1.5 text-left text-[10.5px] font-medium transition-colors",
                  active ? "bg-accent text-white" : "bg-ink/[0.06] text-ink-secondary hover:bg-ink/10",
                )}
              >
                {i + 1}. {SCENE_INFO[s.type].label}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
