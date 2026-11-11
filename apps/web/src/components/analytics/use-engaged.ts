"use client";

import { useEffect, useState } from "react";

const EVENTS = ["pointerdown", "pointermove", "keydown", "touchstart", "wheel", "scroll"] as const;

/**
 * True once the visitor first interacts with the page (moves the pointer,
 * taps, scrolls, types), or `fallbackMs` after the page has loaded,
 * whichever comes first.
 *
 * Third-party analytics wait for this. gtag.js and Clarity together are
 * several hundred milliseconds of main-thread work on a phone, and Clarity
 * also walks the whole page to record it; run at load, that work landed in
 * the same seconds as the page becoming usable. Commands sent before the
 * scripts arrive are queued (window.gtag / window.clarity queue), so nothing
 * is lost; only a visitor who leaves before interacting and before the
 * fallback goes uncounted.
 */
export function useEngaged(fallbackMs: number): boolean {
  const [engaged, setEngaged] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const done = () => {
      cleanup();
      setEngaged(true);
    };
    const startTimer = () => {
      timer = window.setTimeout(done, fallbackMs);
    };
    function cleanup() {
      for (const e of EVENTS) window.removeEventListener(e, done);
      window.removeEventListener("load", startTimer);
      if (timer !== undefined) window.clearTimeout(timer);
    }
    for (const e of EVENTS) window.addEventListener(e, done, { once: true, passive: true });
    if (document.readyState === "complete") startTimer();
    else window.addEventListener("load", startTimer, { once: true });
    return cleanup;
  }, [fallbackMs]);

  return engaged;
}
