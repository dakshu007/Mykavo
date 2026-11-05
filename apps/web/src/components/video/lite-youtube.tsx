"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * A YouTube player that costs nothing until it is pressed: a thumbnail and a
 * play button, swapped for YouTube's privacy-enhanced iframe on click. A page
 * of tutorials would otherwise load a megabyte of player script per video.
 */
export function LiteYouTube({
  id,
  title,
  thumbnail,
  fallbackThumbnail,
  size = "card",
  captions = false,
  placement,
}: {
  id: string;
  title: string;
  thumbnail: string;
  /**
   * Used when `thumbnail` is missing. YouTube answers a missing
   * maxresdefault (common for new uploads) with a 120x90 grey placeholder
   * image rather than a broken one, so the size is checked too.
   */
  fallbackThumbnail?: string;
  size?: "hero" | "card";
  /** Show the uploaded English captions from the start (muted autoplay viewers still read along). */
  captions?: boolean;
  /** Where the player sits, for analytics. */
  placement?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [poster, setPoster] = useState(thumbnail);
  const img = useRef<HTMLImageElement>(null);
  const hero = size === "hero";

  const checkPoster = useCallback(() => {
    const el = img.current;
    if (!el || !fallbackThumbnail || poster === fallbackThumbnail || !el.complete) return;
    if (el.naturalWidth === 0 || el.naturalWidth <= 120) setPoster(fallbackThumbnail);
  }, [fallbackThumbnail, poster]);

  // The image can finish loading before hydration attaches onLoad/onError.
  useEffect(() => {
    checkPoster();
  }, [checkPoster]);

  if (playing) {
    // vq is a hint: YouTube still adapts to the viewer's connection, but
    // starts in HD where it can instead of the small-player default.
    const params = new URLSearchParams({ autoplay: "1", rel: "0", modestbranding: "1", playsinline: "1", vq: "hd1080" });
    if (captions) {
      params.set("cc_load_policy", "1");
      params.set("cc_lang_pref", "en");
    }
    return (
      <iframe
        className="absolute inset-0 size-full"
        src={`https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setPlaying(true);
        track("tutorial_played", placement ? { video: id, placement } : { video: id });
      }}
      className="group absolute inset-0 size-full cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD400] focus-visible:ring-inset"
      aria-label={`Play video: ${title}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail, no next/image domain configured */}
      <img
        ref={img}
        src={poster}
        alt=""
        onLoad={checkPoster}
        onError={() => {
          if (fallbackThumbnail && poster !== fallbackThumbnail) setPoster(fallbackThumbnail);
        }}
        loading={hero ? "eager" : "lazy"}
        decoding="async"
        className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" aria-hidden />
      <span
        aria-hidden
        className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#FFD400] text-[#151515] shadow-[0_10px_40px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:scale-110 ${
          hero ? "size-20" : "size-14"
        }`}
      >
        <Play className={`${hero ? "size-8" : "size-6"} translate-x-[2px] fill-current`} />
      </span>
    </button>
  );
}
