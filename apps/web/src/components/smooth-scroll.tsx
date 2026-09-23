"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Smooth scrolling across the whole site, via Lenis.
 *
 * Mounted in the root layout rather than beside the marketing nav, so the
 * dashboard feels the same as the landing page. That raises two problems a
 * marketing-only version never had, both handled below: lists that scroll
 * inside the page, and modal dialogs.
 *
 * TWO CONDITIONS, AND THEY ARE NOT OPTIONAL
 *
 * 1. `prefers-reduced-motion` switches it off entirely. Interpolated
 *    scrolling is exactly the kind of motion that triggers vestibular
 *    symptoms, and docs/DESIGN_SYSTEM.md already commits to honouring the
 *    setting. A person who has asked their operating system for less motion
 *    has asked this site too.
 *
 * 2. Touch devices keep their native scroll. iOS and Android momentum
 *    scrolling is tuned by the platform, runs off the main thread, and is
 *    better than anything a library can do on top of it - and overriding it
 *    is what makes a site feel laggy on a mid-range phone.
 *
 * INNER SCROLL CONTAINERS KEEP NATIVE SCROLLING. Lenis owns the page, not a
 * list inside it - a sidebar, a command palette, a page picker, a long issue
 * list. Each carries `data-lenis-prevent`, which is how Lenis is told to keep
 * out; without it, scrolling a list would drag the page behind it instead.
 *
 * MODALS STOP IT ENTIRELY. A native dialog scrolls its own content and the
 * page behind it must not move at all, smoothly or otherwise.
 *
 * WHAT IT COSTS. Lenis drives scroll from requestAnimationFrame, so it is
 * real main-thread work on every frame of every scroll, and that is measured
 * by Core Web Vitals as INP. It is a deliberate trade of a small amount of
 * responsiveness for a more considered feel - worth watching in Search
 * Console's Core Web Vitals report, and the first thing to remove if INP
 * regresses.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");
    if (reduced.matches || coarse.matches) return;

    const lenis = new Lenis({
      // Slightly slower than default: the point is a considered feel, not a
      // slide. Anything longer starts fighting the reader.
      duration: 0.9,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Native behaviour for touch even if this somehow runs on a hybrid
      // device that reports a fine pointer.
      syncTouch: false,
    });

    let frame = 0;
    function raf(time: number) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    }
    frame = requestAnimationFrame(raf);

    /**
     * Same-page anchors have to go through Lenis.
     *
     * Once Lenis owns the scroll position, the browser's own jump to a hash
     * fights it and lands somewhere arbitrary - which would break every
     * "See how MyKavo works" link on the site.
     */
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      // Only same-document hashes: "#id" or "/current-path#id".
      const hash = href.startsWith("#")
        ? href
        : href.includes("#") && href.split("#")[0] === window.location.pathname
          ? `#${href.split("#")[1]}`
          : null;
      if (!hash || hash === "#") return;

      const target = document.querySelector(hash);
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -96 });
      // Keep the URL honest so the link is still shareable and the back
      // button still means something.
      window.history.pushState(null, "", hash);
    }

    /**
     * Pause while a modal is open.
     *
     * A native <dialog> scrolls its own content, and the page behind it must
     * not move. Watched with a MutationObserver on the `open` attribute
     * rather than polling: <dialog> fires `close` but has no matching `open`
     * event, and querying the DOM every animation frame to answer a question
     * that changes twice a session would be absurd.
     */
    const observer = new MutationObserver(() => {
      if (document.querySelector("dialog[open]")) lenis.stop();
      else lenis.start();
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["open"],
      subtree: true,
    });

    document.addEventListener("click", onClick);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return null;
}
