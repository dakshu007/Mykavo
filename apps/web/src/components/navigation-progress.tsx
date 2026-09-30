"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * A thin gold bar across the top of the window from the moment an internal
 * link is clicked until the new page is on screen.
 *
 * Without it, a click on a page that has to be rendered on the server (the
 * dashboard, or a blog post nobody has opened yet) looked like nothing
 * happened at all: the old page just sat there until the new one arrived.
 * The wait is worked on separately; this makes sure it never feels like the
 * click was lost.
 */

type Phase = "idle" | "loading" | "done";

/** Ignore clicks the browser - not the router - will handle. */
function isRouterNavigation(event: MouseEvent): URL | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const anchor = (event.target as Element | null)?.closest?.("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;
  let url: URL;
  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  // Same page (or only the #hash differs): nothing will load.
  if (url.pathname === window.location.pathname && url.search === window.location.search) return null;
  // API routes and files are not pages.
  if (url.pathname.startsWith("/api/") || /\.[a-z0-9]{2,5}$/i.test(url.pathname)) return null;
  return url;
}

export function NavigationProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  // Bumped per navigation so the bar remounts and its animation restarts at 0.
  const [run, setRun] = useState(0);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!isRouterNavigation(event)) return;
      setRun((r) => r + 1);
      setPhase("loading");
      // Never leave a bar stuck if the navigation was abandoned.
      if (safety.current) clearTimeout(safety.current);
      safety.current = setTimeout(() => setPhase("idle"), 20_000);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // The route changed: finish the bar, then fade it out.
  useEffect(() => {
    if (safety.current) clearTimeout(safety.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the pathname is the external signal that navigation finished
    setPhase((p) => (p === "loading" ? "done" : p));
    const t = setTimeout(() => setPhase((p) => (p === "done" ? "idle" : p)), 350);
    return () => clearTimeout(t);
  }, [pathname]);

  if (run === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px]"
      style={{ opacity: phase === "idle" ? 0 : 1, transition: "opacity 250ms ease" }}
    >
      <style>{`@keyframes mk-nav-progress{from{width:0%}to{width:85%}}`}</style>
      <div
        key={run}
        className="h-full bg-[#FFD400] shadow-[0_0_8px_rgba(255,212,0,0.7)]"
        style={
          phase === "loading"
            ? // Races ahead at first, then creeps toward 85% while the server works.
              { animation: "mk-nav-progress 8s cubic-bezier(0.08, 0.9, 0.2, 1) forwards" }
            : // Arrived (or fading out): full width, reached quickly, held while it fades.
              { width: "100%", transition: "width 200ms ease-out" }
        }
      />
    </div>
  );
}
