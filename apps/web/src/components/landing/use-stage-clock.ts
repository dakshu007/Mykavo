"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The clock and scale behind the homepage animations (WordPress, web and
 * Android, alert channels). Each animation draws on a fixed-size stage and
 * derives every frame from `t`, so this hook only has to:
 *
 * - scale the stage to the wrapper's width (`k`),
 * - advance `t` with requestAnimationFrame while the wrapper is on screen
 *   and the tab is visible,
 * - jump to one still frame (`stillT`) when the visitor prefers reduced motion.
 */
export function useStageClock(stageWidth: number, stillT: number) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0);
  const [k, setK] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setK(el.clientWidth / stageWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      const still = requestAnimationFrame(() => setT(stillT));
      return () => {
        cancelAnimationFrame(still);
        ro.disconnect();
      };
    }

    let visible = false;
    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? false;
    });
    io.observe(el);

    let raf = 0;
    let last: number | null = null;
    const step = (ts: number) => {
      const dt = last == null ? 0 : Math.min(0.1, (ts - last) / 1000);
      last = ts;
      if (visible && !document.hidden) setT((v) => v + dt);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [stageWidth, stillT]);

  return { wrapRef, t, k };
}
