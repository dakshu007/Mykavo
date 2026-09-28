"use client";

import { useState } from "react";
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
  size = "card",
}: {
  id: string;
  title: string;
  thumbnail: string;
  size?: "hero" | "card";
}) {
  const [playing, setPlaying] = useState(false);
  const hero = size === "hero";

  if (playing) {
    return (
      <iframe
        className="absolute inset-0 size-full"
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
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
        track("tutorial_played", { video: id });
      }}
      className="group absolute inset-0 size-full cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD400] focus-visible:ring-inset"
      aria-label={`Play video: ${title}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail, no next/image domain configured */}
      <img
        src={thumbnail}
        alt=""
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
