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
import { bone, elevated, fontDisplay, gold } from "./style";

/**
 * Scroll-scrubbed hero: the section pins for ~2.5 viewport heights while a
 * "Day N" chip travels along a timeline and the collage cards play MyKavo's
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

const PHASE_LABELS = ["Baseline approved", "Monitoring quietly", "Change caught"];

type CardTone = "bone" | "dark" | "gold";

const TONE_BG: Record<CardTone, string> = { bone, dark: elevated, gold };
const TONE_TEXT: Record<CardTone, string> = {
  bone: "text-[#151515]",
  dark: "text-[#E9EBDF]",
  gold: "text-[#151515]",
};
const TONE_MUTED: Record<CardTone, string> = {
  bone: "text-[#151515]/55",
  dark: "text-[#9C9E93]",
  gold: "text-[#151515]/60",
};
const TONE_ROW: Record<CardTone, string> = {
  bone: "bg-[#151515]/[0.06] text-[#151515]",
  dark: "bg-white/[0.07] text-[#E9EBDF]",
  gold: "bg-[#151515]/[0.09] text-[#151515]",
};

/** Tiny presentational rows used inside the collage cards. */
function MiniRow({
  ok,
  tone,
  children,
}: {
  ok?: boolean;
  tone: CardTone;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[11.5px] font-medium ${TONE_ROW[tone]}`}
    >
      {ok === undefined ? null : ok ? (
        <CheckCircle2
          className={`size-3.5 shrink-0 ${tone === "dark" ? "text-[#8fce8f]" : "text-[#2f6b2f]"}`}
          aria-hidden
        />
      ) : (
        <AlertTriangle
          className={`size-3.5 shrink-0 ${tone === "dark" ? "text-[#f2a29a]" : "text-[#a03b2e]"}`}
          aria-hidden
        />
      )}
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}

function CardShell({
  tone,
  active,
  children,
}: {
  tone: CardTone;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden={!active}
      style={{ backgroundColor: TONE_BG[tone] }}
      className={`absolute inset-0 flex flex-col justify-center gap-2 rounded-2xl border p-5 shadow-[0_24px_60px_rgba(0,0,0,0.5)] transition-opacity duration-700 ${
        tone === "dark" ? "border-white/10" : "border-black/10"
      } ${active ? "opacity-100" : "opacity-0"}`}
    >
      {children}
    </div>
  );
}

function Eyebrow({ tone, children }: { tone: CardTone; children: React.ReactNode }) {
  return (
    <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${TONE_MUTED[tone]}`}>
      {children}
    </p>
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

  const chipStyle =
    phase === 2
      ? { backgroundColor: gold, color: "#151515" }
      : phase === 1
        ? { backgroundColor: elevated, color: "#E9EBDF", border: "1px solid rgba(255,255,255,0.2)" }
        : { backgroundColor: bone, color: "#151515" };

  return (
    <div ref={outerRef} className={reduced ? "" : "h-[280vh]"}>
      <section
        className={`${reduced ? "" : "sticky top-0 h-svh"} flex flex-col items-center justify-center overflow-hidden px-5 pb-6 pt-24 sm:pt-28`}
      >
        {/* shrink-0 everywhere: on short viewports flexbox must never shrink
            these boxes — the collage cards are absolutely positioned and would
            spill over the content below instead of shrinking with the box. */}
        <h1
          className={`${fontDisplay} max-w-4xl shrink-0 text-center text-[40px] leading-[1.04] text-[#E9EBDF] sm:text-6xl lg:text-7xl`}
        >
          Know what changed.
          <br />
          <span className="text-[#9C9E93]">Fix what matters.</span>
        </h1>

        {/* Timeline: a month of monitoring — scrubbed by scroll OR dragged directly */}
        <div className="mt-8 w-full max-w-2xl shrink-0 sm:mt-12">
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
            className="group relative flex h-9 cursor-grab touch-none select-none items-center rounded-full outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-[#FFD400]/80"
          >
            <div className="relative h-[3px] w-full rounded-full bg-white/15">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-[#FFD400]/60 transition-[width] duration-150"
                style={{ width: `${chipLeft}%` }}
              />
              <span
                style={{ left: `${chipLeft}%`, ...chipStyle }}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-colors duration-500 group-active:scale-105"
              >
                Day {day}
              </span>
            </div>
          </div>
          <p className="mt-3 text-center text-[12px] font-medium uppercase tracking-[0.22em] text-[#9C9E93]">
            {PHASE_LABELS[phase]}
            {!reduced && (
              <span className="normal-case tracking-normal text-[#9C9E93]/60"> · drag or scroll</span>
            )}
          </p>
        </div>

        {/* Collage cards playing the story */}
        <div className="relative mt-8 h-[300px] w-full max-w-4xl shrink-0 sm:h-[340px]">
          {/* Left card */}
          <div className="absolute -left-16 top-8 w-56 -rotate-[6deg] sm:left-[2%] sm:w-64">
            <div className="relative h-[190px]">
              <CardShell tone="bone" active={phase === 0}>
                <Eyebrow tone="bone">aurora-outdoor.com</Eyebrow>
                <MiniRow tone="bone" ok>
                  Baseline v1 approved
                </MiniRow>
                <MiniRow tone="bone">
                  <Camera className="size-3.5" aria-hidden /> 9 pages captured
                </MiniRow>
              </CardShell>
              <CardShell tone="bone" active={phase === 1}>
                <Eyebrow tone="bone">Scheduled scan</Eyebrow>
                <MiniRow tone="bone" ok>
                  9 / 9 pages scanned
                </MiniRow>
                <MiniRow tone="bone" ok>
                  0 changes detected
                </MiniRow>
              </CardShell>
              <CardShell tone="gold" active={phase === 2}>
                <Eyebrow tone="gold">Critical · SEO</Eyebrow>
                <MiniRow tone="gold" ok={false}>
                  robots: index → noindex
                </MiniRow>
                <MiniRow tone="gold" ok={false}>
                  Title tag removed
                </MiniRow>
              </CardShell>
            </div>
          </div>

          {/* Center circle */}
          <div className="absolute left-1/2 top-0 size-64 -translate-x-1/2 sm:size-72">
            {([
              { p: 0, tone: "bone" as CardTone },
              { p: 1, tone: "dark" as CardTone },
              { p: 2, tone: "gold" as CardTone },
            ]).map(({ p, tone }) => (
              <div
                key={p}
                aria-hidden={phase !== p}
                style={{ backgroundColor: TONE_BG[tone] }}
                className={`absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-full border p-8 text-center shadow-[0_24px_60px_rgba(0,0,0,0.5)] transition-opacity duration-700 ${
                  tone === "dark" ? "border-white/10" : "border-black/10"
                } ${phase === p ? "opacity-100" : "opacity-0"}`}
              >
                {p === 0 && (
                  <>
                    <ShieldCheck className={`size-7 ${TONE_TEXT[tone]}`} aria-hidden />
                    <p className={`${fontDisplay} text-[26px] font-medium leading-tight ${TONE_TEXT[tone]}`}>
                      Monitoring is on
                    </p>
                    <p className={`text-[12px] font-medium ${TONE_MUTED[tone]}`}>
                      Screenshots · SEO tags · links · scripts
                    </p>
                  </>
                )}
                {p === 1 && (
                  <>
                    <CheckCircle2 className={`size-7 ${TONE_TEXT[tone]}`} aria-hidden />
                    <p className={`${fontDisplay} text-[26px] font-medium leading-tight ${TONE_TEXT[tone]}`}>
                      All quiet today
                    </p>
                    <p className={`text-[12px] font-medium ${TONE_MUTED[tone]}`}>
                      Every page matches its approved baseline
                    </p>
                  </>
                )}
                {p === 2 && (
                  <>
                    <Bell className={`size-7 ${TONE_TEXT[tone]}`} aria-hidden />
                    <p className={`${fontDisplay} text-[26px] font-medium leading-tight ${TONE_TEXT[tone]}`}>
                      One grouped alert
                    </p>
                    <p className={`text-[12px] font-medium ${TONE_MUTED[tone]}`}>
                      2 critical · 1 high — before your client notices
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Right card */}
          <div className="absolute -right-16 top-12 w-56 rotate-[5deg] sm:right-[2%] sm:w-64">
            <div className="relative h-[190px]">
              <CardShell tone="dark" active={phase === 0}>
                <Eyebrow tone="dark">SEO snapshot</Eyebrow>
                <MiniRow tone="dark" ok>
                  title · canonical · H1
                </MiniRow>
                <MiniRow tone="dark" ok>
                  robots: index, follow
                </MiniRow>
              </CardShell>
              <CardShell tone="dark" active={phase === 1}>
                <Eyebrow tone="dark">Site health</Eyebrow>
                <MiniRow tone="dark" ok>
                  Uptime 100% · 7 days
                </MiniRow>
                <MiniRow tone="dark">
                  <LockKeyhole className="size-3.5" aria-hidden /> SSL renews in 82 days
                </MiniRow>
              </CardShell>
              <CardShell tone="bone" active={phase === 2}>
                <Eyebrow tone="bone">Links · site-wide</Eyebrow>
                <MiniRow tone="bone" ok={false}>
                  <Link2Off className="size-3.5" aria-hidden /> 17 internal links broken
                </MiniRow>
                <MiniRow tone="bone" ok={false}>
                  Visual diff 12.4%
                </MiniRow>
              </CardShell>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
