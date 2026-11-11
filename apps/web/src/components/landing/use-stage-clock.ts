"use client";

import { startTransition, useEffect, useRef, useState } from "react";

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
 * `k` is 1 until the wrapper has been measured (the server cannot know the
 * screen width), so the full-size stage would stick out past the wrapper
 * until hydration - on a phone that widened the whole page and let it scroll
 * sideways. Wrappers use `stageClip(fitted)` to clip the stage until then,
 * and stay unclipped afterwards so edge shadows still show.
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

export function useStageClock(stageWidth: number, stillT: number, startAt = 0, lazy = false) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(startAt);
  // See the effect below: a lazy stage is drawn once it nears the screen.
  const [near, setNear] = useState(!lazy);
  const [k, setK] = useState(1);
  const [fitted, setFitted] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // The observer's first callback, right after layout, gives the starting
    // width. Reading el.clientWidth here instead forced a layout of the whole
    // page in the middle of hydration, once per animation on the page.
    const ro = new ResizeObserver((entries) => {
      const width = entries[entries.length - 1]?.contentRect.width ?? 0;
      if (width <= 0) return;
      setK(width / stageWidth);
      setFitted(true);
    });
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

  // Lazy: until the wrapper is within a screen of view, the animation renders
  // only its empty wrapper (same size and label), so the stage's markup stays
  // out of the server HTML and out of hydration. The homepage carries a dozen
  // of these below the fold; together they were most of its HTML and most of
  // the work a phone did on load. A stage in a hidden layout (the phone
  // version on a desktop, and back) is never drawn at all.
  useEffect(() => {
    if (near) return;
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          // A transition: React draws the stage in small slices between
          // other work instead of one long task, so a stage that comes into
          // range during page load never blocks a tap.
          startTransition(() => setNear(true));
        }
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  return { wrapRef, t, k, fitted, near };
}

/** Wrapper overflow for a stage: clipped until `k` has been measured. */
export function stageClip(fitted: boolean): "hidden" | undefined {
  return fitted ? undefined : "hidden";
}
