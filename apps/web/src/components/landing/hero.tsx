"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  Bell,
  Camera,
  CheckCircle2,
  Link2Off,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { cream, fontDisplay, lavender, periwinkle, primary } from "./style";

/**
 * Scroll-scrubbed hero: the section pins for ~2.5 viewport heights while a
 * "Day N" chip travels along a timeline and the collage cards play Fluxen's
 * monitoring story — baseline approved → quiet scans → change caught. The
 * timeline itself is also a slider: drag the chip (or use arrow keys) to
 * scrub through the days directly.
 *
 * Everything is transform/opacity only; visitors with reduced motion get a
 * static, un-pinned hero frozen mid-story.
 */

const PHASES = 3;
const DAYS = 30;

function phaseOf(progress: number): number {
  return Math.min(PHASES - 1, Math.floor(progress * PHASES));
}

const CHIP_COLORS = [lavender, periwinkle, primary];
const PHASE_LABELS = ["Baseline approved", "Monitoring quietly", "Change caught"];

/** Tiny presentational rows used inside the collage cards. */
function MiniRow({
  ok,
  onBlue = false,
  children,
}: {
  ok?: boolean;
  onBlue?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[11.5px] font-medium ${
        onBlue ? "bg-white/15 text-white" : "bg-[#0d0c0e]/[0.06] text-[#0d0c0e]"
      }`}
    >
      {ok === undefined ? null : ok ? (
        <CheckCircle2
          className={`size-3.5 shrink-0 ${onBlue ? "text-white" : "text-[#3d7a33]"}`}
          aria-hidden
        />
      ) : (
        <AlertTriangle
          className={`size-3.5 shrink-0 ${onBlue ? "text-white" : "text-[#a03b2e]"}`}
          aria-hidden
        />
      )}
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}

function CardShell({
  color,
  active,
  children,
}: {
  color: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden={!active}
      style={{ backgroundColor: color }}
      className={`absolute inset-0 flex flex-col justify-center gap-2 rounded-[28px] p-5 shadow-[0_20px_50px_rgba(38,54,115,0.18)] transition-opacity duration-700 ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      {children}
    </div>
  );
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void): () => void {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function LandingHero() {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const outer = outerRef.current;
        if (!outer) return;
        const rect = outer.getBoundingClientRect();
        const scrollable = rect.height - window.innerHeight;
        if (scrollable <= 0) return;
        setScrollProgress(Math.min(1, Math.max(0, -rect.top / scrollable)));
      });
    };
    onScroll(); // initial position resolves inside the rAF callback
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduced]);

  // Reduced motion: freeze the story mid-way instead of scroll-scrubbing.
  const progress = reduced ? 0.5 : scrollProgress;
  const phase = phaseOf(progress);
  const day = 1 + Math.round(progress * (DAYS - 1));
  const chipLeft = 6 + progress * 88; // % along the track

  /**
   * Direct mouse/touch scrubbing: dragging on the track maps the pointer's
   * fraction to the hero's pinned scroll range. Page scroll stays the single
   * source of truth — dragging just drives it.
   */
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  function scrollToProgress(fraction: number) {
    const outer = outerRef.current;
    if (!outer) return;
    const rect = outer.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    if (scrollable <= 0) return;
    const outerTop = window.scrollY + rect.top;
    window.scrollTo({ top: outerTop + Math.min(1, Math.max(0, fraction)) * scrollable });
  }

  function scrubTo(clientX: number) {
    const track = trackRef.current;
    if (!track) return;
    const r = track.getBoundingClientRect();
    scrollToProgress((clientX - r.left) / r.width);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (reduced) return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubTo(e.clientX);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (draggingRef.current) scrubTo(e.clientX);
  }

  function endDrag() {
    draggingRef.current = false;
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (reduced) return;
    const step = 1 / (DAYS - 1);
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      scrollToProgress(progress + step);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      scrollToProgress(progress - step);
    } else if (e.key === "Home") {
      e.preventDefault();
      scrollToProgress(0);
    } else if (e.key === "End") {
      e.preventDefault();
      scrollToProgress(1);
    }
  }

  return (
    <div ref={outerRef} className={reduced ? "" : "h-[280vh]"}>
      <section
        className={`${reduced ? "" : "sticky top-0 h-svh"} flex flex-col items-center justify-center overflow-hidden px-5 pb-6 pt-24 sm:pt-28`}
      >
        <h1
          className={`${fontDisplay} max-w-4xl text-center text-[44px] leading-[1.02] tracking-[-0.01em] text-[#0d0c0e] sm:text-6xl lg:text-7xl`}
        >
          Know what changed.
          <br />
          <span className="italic">Fix what matters.</span>
        </h1>

        {/* Timeline: a month of monitoring — scrubbed by scroll OR dragged directly */}
        <div className="mt-10 w-full max-w-2xl sm:mt-12">
          <div
            ref={trackRef}
            role="slider"
            tabIndex={reduced ? -1 : 0}
            aria-label="Monitoring timeline"
            aria-valuemin={1}
            aria-valuemax={DAYS}
            aria-valuenow={day}
            aria-valuetext={`Day ${day} — ${PHASE_LABELS[phase]}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={onKeyDown}
            className="group relative flex h-9 cursor-grab touch-none select-none items-center rounded-full outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-[#3556f4]/70"
          >
            <div className="relative h-[3px] w-full rounded-full bg-[#0d0c0e]/15">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-[#0d0c0e]/30 transition-[width] duration-150"
                style={{ width: `${chipLeft}%` }}
              />
              <span
                style={{ left: `${chipLeft}%`, backgroundColor: CHIP_COLORS[phase] }}
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-semibold shadow-[0_8px_24px_rgba(38,54,115,0.25)] transition-colors duration-500 group-active:scale-105 ${
                  phase === 2 ? "text-white" : "text-[#0d0c0e]"
                }`}
              >
                Day {day}
              </span>
            </div>
          </div>
          <p className="mt-3 text-center text-[12px] font-medium uppercase tracking-[0.22em] text-[#0d0c0e]/45 transition-opacity">
            {PHASE_LABELS[phase]}
            {!reduced && <span className="normal-case tracking-normal text-[#0d0c0e]/35"> · drag or scroll</span>}
          </p>
        </div>

        {/* Collage cards playing the story */}
        <div className="relative mt-6 h-[300px] w-full max-w-4xl sm:h-[330px]">
          {/* Left card */}
          <div className="absolute -left-16 top-8 w-56 -rotate-[7deg] sm:left-[2%] sm:w-64">
            <div className="relative h-[190px]">
              <CardShell color={cream} active={phase === 0}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0d0c0e]/50">
                  aurora-outdoor.com
                </p>
                <MiniRow ok>Baseline v1 approved</MiniRow>
                <MiniRow>
                  <Camera className="size-3.5" aria-hidden /> 9 pages captured
                </MiniRow>
              </CardShell>
              <CardShell color={cream} active={phase === 1}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0d0c0e]/50">
                  Scheduled scan
                </p>
                <MiniRow ok>9 / 9 pages scanned</MiniRow>
                <MiniRow ok>0 changes detected</MiniRow>
              </CardShell>
              <CardShell color={primary} active={phase === 2}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
                  Critical · SEO
                </p>
                <MiniRow ok={false} onBlue>
                  robots: index → noindex
                </MiniRow>
                <MiniRow ok={false} onBlue>
                  Title tag removed
                </MiniRow>
              </CardShell>
            </div>
          </div>

          {/* Center circle */}
          <div className="absolute left-1/2 top-0 size-64 -translate-x-1/2 sm:size-72">
            {[0, 1, 2].map((p) => (
              <div
                key={p}
                aria-hidden={phase !== p}
                style={{ backgroundColor: p === 0 ? lavender : p === 1 ? periwinkle : primary }}
                className={`absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-full p-8 text-center shadow-[0_20px_50px_rgba(38,54,115,0.18)] transition-opacity duration-700 ${
                  phase === p ? "opacity-100" : "opacity-0"
                }`}
              >
                {p === 0 && (
                  <>
                    <ShieldCheck className="size-7 text-[#0d0c0e]" aria-hidden />
                    <p className={`${fontDisplay} text-[26px] leading-tight text-[#0d0c0e]`}>
                      Monitoring is on
                    </p>
                    <p className="text-[12px] font-medium text-[#0d0c0e]/60">
                      Screenshots · SEO tags · links · scripts
                    </p>
                  </>
                )}
                {p === 1 && (
                  <>
                    <CheckCircle2 className="size-7 text-[#0d0c0e]" aria-hidden />
                    <p className={`${fontDisplay} text-[26px] leading-tight text-[#0d0c0e]`}>
                      All quiet today
                    </p>
                    <p className="text-[12px] font-medium text-[#0d0c0e]/60">
                      Every page matches its approved baseline
                    </p>
                  </>
                )}
                {p === 2 && (
                  <>
                    <Bell className="size-7 text-white" aria-hidden />
                    <p className={`${fontDisplay} text-[26px] leading-tight text-white`}>
                      One grouped alert
                    </p>
                    <p className="text-[12px] font-medium text-white/70">
                      2 critical · 1 high — before your client notices
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Right card */}
          <div className="absolute -right-16 top-12 w-56 rotate-[6deg] sm:right-[2%] sm:w-64">
            <div className="relative h-[190px]">
              <CardShell color={periwinkle} active={phase === 0}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0d0c0e]/50">
                  SEO snapshot
                </p>
                <MiniRow ok>title · canonical · H1</MiniRow>
                <MiniRow ok>robots: index, follow</MiniRow>
              </CardShell>
              <CardShell color={lavender} active={phase === 1}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0d0c0e]/50">
                  Site health
                </p>
                <MiniRow ok>Uptime 100% · 7 days</MiniRow>
                <MiniRow>
                  <LockKeyhole className="size-3.5" aria-hidden /> SSL renews in 82 days
                </MiniRow>
              </CardShell>
              <CardShell color={lavender} active={phase === 2}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0d0c0e]/50">
                  Links · site-wide
                </p>
                <MiniRow ok={false}>
                  <Link2Off className="size-3.5" aria-hidden /> 17 internal links broken
                </MiniRow>
                <MiniRow ok={false}>Visual diff 12.4%</MiniRow>
              </CardShell>
            </div>
          </div>
        </div>

        <p className="mt-4 max-w-xl text-center text-[15px] leading-7 text-[#0d0c0e]/60 sm:text-base">
          Fluxen watches your websites for visual, SEO, content, link, script, performance, and
          conversion changes — and alerts you before small problems become expensive ones.
        </p>
      </section>
    </div>
  );
}
