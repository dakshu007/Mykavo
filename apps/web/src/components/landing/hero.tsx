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
import { butter, cream, fontSerif, lavender, periwinkle } from "./style";

/**
 * Scroll-scrubbed hero: the section pins for ~2.5 viewport heights while a
 * "Day N" chip travels along a timeline and the collage cards play Fluxen's
 * monitoring story — baseline approved → quiet scans → change caught.
 *
 * Everything is transform/opacity only; visitors with reduced motion get a
 * static, un-pinned hero frozen mid-story.
 */

const PHASES = 3;

function phaseOf(progress: number): number {
  return Math.min(PHASES - 1, Math.floor(progress * PHASES));
}

const CHIP_COLORS = [lavender, periwinkle, butter];
const PHASE_LABELS = ["Baseline approved", "Monitoring quietly", "Change caught"];

/** Tiny presentational rows used inside the collage cards. */
function MiniRow({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-[#0d0c0e]/[0.06] px-3 py-2 text-[11.5px] font-medium text-[#0d0c0e]">
      {ok === undefined ? null : ok ? (
        <CheckCircle2 className="size-3.5 shrink-0 text-[#3d7a33]" aria-hidden />
      ) : (
        <AlertTriangle className="size-3.5 shrink-0 text-[#a03b2e]" aria-hidden />
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
      className={`absolute inset-0 flex flex-col justify-center gap-2 rounded-[28px] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] transition-opacity duration-700 ${
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
  const day = 1 + Math.round(progress * 29);
  const chipLeft = 6 + progress * 88; // % along the track

  return (
    <div ref={outerRef} className={reduced ? "" : "h-[280vh]"}>
      <section
        className={`${reduced ? "" : "sticky top-0 h-svh"} flex flex-col items-center justify-center overflow-hidden px-5 pb-6 pt-24 sm:pt-28`}
      >
        <h1
          className={`${fontSerif} max-w-4xl text-center text-[44px] leading-[1.02] tracking-[-0.01em] text-white sm:text-6xl lg:text-7xl`}
        >
          Know what changed.
          <br />
          <span className="italic">Fix what matters.</span>
        </h1>

        {/* Timeline: a month of monitoring scrubbed by scroll */}
        <div className="mt-10 w-full max-w-2xl sm:mt-12" aria-hidden>
          <div className="relative h-[3px] rounded-full bg-white/15">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-white/40 transition-[width] duration-150"
              style={{ width: `${chipLeft}%` }}
            />
            <span
              style={{ left: `${chipLeft}%`, backgroundColor: CHIP_COLORS[phase] }}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-semibold text-[#0d0c0e] shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-colors duration-500"
            >
              Day {day}
            </span>
          </div>
          <p className="mt-4 text-center text-[12px] font-medium uppercase tracking-[0.22em] text-white/40 transition-opacity">
            {PHASE_LABELS[phase]}
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
              <CardShell color={butter} active={phase === 2}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0d0c0e]/50">
                  Critical · SEO
                </p>
                <MiniRow ok={false}>robots: index → noindex</MiniRow>
                <MiniRow ok={false}>Title tag removed</MiniRow>
              </CardShell>
            </div>
          </div>

          {/* Center circle */}
          <div className="absolute left-1/2 top-0 size-64 -translate-x-1/2 sm:size-72">
            {[0, 1, 2].map((p) => (
              <div
                key={p}
                aria-hidden={phase !== p}
                style={{ backgroundColor: p === 0 ? lavender : p === 1 ? periwinkle : butter }}
                className={`absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-full p-8 text-center shadow-[0_24px_60px_rgba(0,0,0,0.45)] transition-opacity duration-700 ${
                  phase === p ? "opacity-100" : "opacity-0"
                }`}
              >
                {p === 0 && (
                  <>
                    <ShieldCheck className="size-7 text-[#0d0c0e]" aria-hidden />
                    <p className={`${fontSerif} text-[26px] leading-tight text-[#0d0c0e]`}>
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
                    <p className={`${fontSerif} text-[26px] leading-tight text-[#0d0c0e]`}>
                      All quiet today
                    </p>
                    <p className="text-[12px] font-medium text-[#0d0c0e]/60">
                      Every page matches its approved baseline
                    </p>
                  </>
                )}
                {p === 2 && (
                  <>
                    <Bell className="size-7 text-[#0d0c0e]" aria-hidden />
                    <p className={`${fontSerif} text-[26px] leading-tight text-[#0d0c0e]`}>
                      One grouped alert
                    </p>
                    <p className="text-[12px] font-medium text-[#0d0c0e]/60">
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

        <p className="mt-4 max-w-xl text-center text-[15px] leading-7 text-white/60 sm:text-base">
          Fluxen watches your websites for visual, SEO, content, link, script, performance, and
          conversion changes — and alerts you before small problems become expensive ones.
        </p>
      </section>
    </div>
  );
}
