"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] ?? url;
  }
}

/**
 * A website's own icon, so a list of sites is easy to scan. Loaded from
 * DuckDuckGo's icon service (no account, no tracking cookie) rather than
 * fetched by MyKavo's servers; when there is no icon, a letter tile shows
 * instead. Purely decorative: the site's name is always next to it.
 */
export function SiteFavicon({ url, name, className }: { url: string; name: string; className?: string }) {
  const host = hostOf(url);
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);

  // An icon that failed before hydration never fires onError in React, and
  // would show the browser's broken-image glyph: check once after mount.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth < 8) setFailed(true);
  }, []);
  const letter = (name.trim() || host).charAt(0).toUpperCase();

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-card",
        className,
      )}
    >
      {failed || !host ? (
        <span className="text-[14px] font-semibold text-ink-secondary">{letter}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- third-party icon, tiny, not worth the image optimizer
        <img
          ref={img}
          src={`https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`}
          alt=""
          width={20}
          height={20}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          onLoad={(e) => {
            // DuckDuckGo answers a missing icon with a generic placeholder;
            // a very small image means there was nothing real to show.
            if (e.currentTarget.naturalWidth < 8) setFailed(true);
          }}
          className="size-5 object-contain"
        />
      )}
    </span>
  );
}
