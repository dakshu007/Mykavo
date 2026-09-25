"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The clock and scale behind the homepage animations (hero, WordPress, web
 * and Android, alert channels, site audit, client reports, category scenes).
 * Each animation draws on a fixed-size stage and derives every frame from
 * `t`, so this hook only has to:
 *
 * - scale the stage to the wrapper's width (`k`),
 * - advance `t` while the wrapper is on screen and the tab is visible,
 * - jump to one still frame (`stillT`) when the visitor prefers reduced motion.
 *
 * Performance, because these run on the landing page that Lighthouse and
 * every first-time visitor judge us by:
 *
 * - The clock does not start until the page has finished loading and the
 *   browser is idle. Until then the stage shows `startAt` - pick a moment
 *   that reads as a finished picture - so first paint and hydration never
 *   compete with 60 re-renders a second.
 * - Frames are committed at most ~30 times a second. The motion is eased and
 *   slow; 30fps is indistinguishable here and halves the rendering work.
 */

const FRAME_MS = 1000 / 30;

/** Resolves once the page has loaded and the main thread has a quiet moment. */
function whenPageSettled(run: () => void): () => void {
  let cancelled = false;
  let idleId: number | undefined;
  let timer: number | undefined;
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  const afterLoad = () => {
    if (cancelled) return;
    if (w.requestIdleCallback) idleId = w.requestIdleCallback(() => !cancelled && run(), { timeout: 2000 });
    else timer = window.setTimeout(() => !cancelled && run(), 300);
  };
  if (document.readyState === "complete") afterLoad();
  else window.addEventListener("load", afterLoad, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener("load", afterLoad);
    if (idleId !== undefined) w.cancelIdleCallback?.(idleId);
    if (timer !== undefined) window.clearTimeout(timer);
  };
}

export function useStageClock(stageWidth: number, stillT: number, startAt = 0) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(startAt);
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
    let clock = startAt;
    let lastCommit = 0;
    const step = (ts: number) => {
      const dt = last == null ? 0 : Math.min(0.1, (ts - last) / 1000);
      last = ts;
      if (visible && !document.hidden) {
        clock += dt;
        if (ts - lastCommit >= FRAME_MS) {
          lastCommit = ts;
          setT(clock);
        }
      }
      raf = requestAnimationFrame(step);
    };
    const cancelStart = whenPageSettled(() => {
      raf = requestAnimationFrame(step);
    });
    return () => {
      cancelStart();
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [stageWidth, stillT, startAt]);

  return { wrapRef, t, k };
}
