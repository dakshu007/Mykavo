"use client";

import { useEffect, useRef } from "react";

/**
 * A thin gold bar at the very top that fills as the article is read. Tracks
 * the article body ([data-post-body]), not the whole page, so it reaches the
 * end where the post does. Written straight to the DOM on scroll (one rAF per
 * frame, passive listener) - no React re-render per scroll event.
 */
export function ReadingProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = document.querySelector<HTMLElement>("[data-post-body]");
    const el = bar.current;
    if (!body || !el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = body.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.6;
      const read = Math.min(1, Math.max(0, (window.innerHeight * 0.4 - rect.top) / Math.max(1, total)));
      el.style.transform = `scaleX(${read})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]">
      <div ref={bar} className="h-full origin-left bg-[#FFD400] shadow-[0_1px_0_rgba(21,21,21,0.25)]" style={{ transform: "scaleX(0)" }} />
    </div>
  );
}
