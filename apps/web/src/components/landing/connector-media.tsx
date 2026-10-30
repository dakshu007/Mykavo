"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Pause, Play } from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * A silent walkthrough video for the AI connector page. It loads nothing
 * until it scrolls near the viewport, plays only while visible, and never
 * autoplays for people who ask for reduced motion (they get the poster and
 * a play button instead).
 */
export function ConnectorVideo({ src, poster, label }: { src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (video.preload === "none") video.preload = "auto";
          video.play().catch(() => {
            // Autoplay refused (data saver, battery mode): the play button still works.
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  function toggle() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => undefined);
      track("cta_clicked", { cta: "ai_connector_video", target: label });
    } else {
      video.pause();
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d12] shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="none"
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="block aspect-video w-full"
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause: ${label}` : `Play: ${label}`}
        className="absolute bottom-3 right-3 inline-flex size-10 items-center justify-center rounded-full bg-[#FFD400] text-[#151515] shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD400] motion-reduce:transition-none"
      >
        {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4 translate-x-px" aria-hidden />}
      </button>
    </div>
  );
}

/** The MCP server URL with a one-click copy button. */
export function CopyServerUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track("cta_clicked", { cta: "ai_connector_copy_url", target: "chatgpt" });
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: the URL is selectable text.
    }
  }

  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
      <code className="flex min-w-0 flex-1 items-center overflow-x-auto whitespace-nowrap px-4 py-3 font-mono text-[14px] text-[#151515] select-all">
        {url}
      </code>
      <button
        type="button"
        onClick={copy}
        className="inline-flex shrink-0 items-center gap-1.5 border-l border-[#151515] bg-[#FFD400] px-4 text-[13px] font-semibold text-[#151515] hover:bg-[#ffe14d] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#151515]"
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
