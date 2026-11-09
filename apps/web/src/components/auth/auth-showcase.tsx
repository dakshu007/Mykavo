"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * The right half of the sign-in and sign-up pages: MyKavo doing its job, as
 * a small loop of EXAMPLE data (labelled as such). A split-flap board cycles
 * through what MyKavo watches, a scan pulse fills bar by bar, and changes
 * land in the feed with their before and after, the way the dashboard shows
 * them. No customer names, counts or quotes: nothing here claims to be real.
 *
 * Always dark, in both themes: it is a display, not a page surface.
 */

const WORDS = ["VISUALS", "SEO TAGS", "SCRIPTS", "LINKS", "SPEED", "BUTTONS", "UPTIME"];
const WIDTH = 8;

type Severity = "Critical" | "High" | "Medium";

const FEED: { severity: Severity; title: string; path: string; before: string; after: string }[] = [
  { severity: "Critical", title: "Checkout returns an error", path: "/checkout", before: "200", after: "500" },
  { severity: "High", title: "Analytics tag removed", path: "/", before: "gtag.js", after: "none" },
  { severity: "Critical", title: "\"Add to cart\" is missing", path: "/product/blend", before: "visible", after: "missing" },
  { severity: "Medium", title: "Page title changed", path: "/pricing", before: "Pricing", after: "Plans & pricing" },
];

const TONE: Record<Severity, string> = {
  Critical: "bg-[#e5484d]/15 text-[#ff8a8e]",
  High: "bg-[#f97316]/15 text-[#ffab6e]",
  Medium: "bg-[#f59e0b]/15 text-[#ffc95c]",
};

const BARS = 30;
/** Index of the bar that turns red: the scan that found the change. */
const ALERT_BAR = 27;

const noopSubscribe = () => () => {};
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function AuthShowcase() {
  const reduced = useReducedMotion();
  const [word, setWord] = useState(0);
  const [ticks, setTick] = useState(0);
  // Reduced motion: the finished frame, standing still.
  const tick = reduced ? BARS + 12 : ticks;

  useEffect(() => {
    if (reduced) return;
    const w = window.setInterval(() => setWord((i) => (i + 1) % WORDS.length), 2400);
    // One loop: bars fill (BARS ticks), the feed fills, a pause, then again.
    const t = window.setInterval(() => setTick((i) => (i + 1) % (BARS + 26)), 140);
    return () => {
      window.clearInterval(w);
      window.clearInterval(t);
    };
  }, [reduced]);

  const filled = Math.min(tick, BARS);
  const feedShown = Math.max(0, Math.min(FEED.length, Math.floor((tick - ALERT_BAR) / 3)));
  const letters = WORDS[word].padEnd(WIDTH, " ").split("");

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[28px] bg-[#0d0f13] p-8 ring-1 ring-white/[0.06] text-[#f3f1e8] xl:p-12">
      {/* Fine dot grid, fading out toward the bottom. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgb(255_255_255/0.09)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
      />

      <p className="relative flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8b8e98]">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#34c979] opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2 rounded-full bg-[#34c979]" />
        </span>
        Live demo / example data
      </p>

      <div className="relative mt-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8b8e98]">Now watching</p>
        <div className="mt-3 flex gap-[5px]" aria-label={`Now watching ${WORDS[word].toLowerCase()}`} role="img">
          {letters.map((ch, i) => (
            <span
              key={`${word}-${i}`}
              className="flap-digit relative inline-flex h-14 w-10 items-center justify-center overflow-hidden rounded-[6px] bg-[#1b1e25] font-mono text-[30px] font-semibold leading-none text-[#ffd400] shadow-[inset_0_-3px_0_rgb(0_0_0/45%)] ring-1 ring-white/[0.07] xl:h-16 xl:w-11 xl:text-[34px]"
              style={{ animationDelay: `${i * 45}ms` }}
            >
              {ch === " " ? "\u00a0" : ch}
              <span className="absolute inset-x-0 top-1/2 h-px bg-black/70" />
            </span>
          ))}
        </div>
      </div>

      <h2 className="relative mt-10 text-[36px] font-semibold leading-[1.22] tracking-[-0.03em] xl:text-[46px]">
        Know what <span className="mk-highlight">changed</span>.
        <br />
        <span className="text-[#8b8e98]">Fix what matters.</span>
      </h2>

      <div className="relative mt-auto pt-10">
        <div className="rounded-2xl border border-white/[0.08] bg-[#14171d]/90 p-5 shadow-[6px_6px_0_#ffd400]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-medium">shop.example.com</p>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#8b8e98]">
              {filled < BARS ? `Scan ${String(filled).padStart(2, "0")}/${BARS}` : "Last 30 scans"}
            </p>
          </div>
          <div className="mt-3 flex h-8 items-end gap-[3px]" aria-hidden>
            {Array.from({ length: BARS }, (_, i) => {
              const on = i < filled;
              const color =
                i === ALERT_BAR ? "bg-[#e5484d]" : i === 19 || i === 20 ? "bg-[#ffd400]" : i === 24 ? "bg-[#f59e0b]" : "bg-[#34c979]/80";
              return (
                <span
                  key={i}
                  className={`flex-1 rounded-[2px] transition-all duration-200 ${on ? color : "bg-white/[0.06]"} ${on && i === ALERT_BAR ? "h-8" : "h-6"}`}
                />
              );
            })}
          </div>

          <ul className="mt-4 space-y-2" aria-label="Example changes">
            {FEED.map((item, i) => (
              <li
                key={item.title}
                className={`flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 transition-all duration-500 ${
                  i < feedShown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                }`}
              >
                <span className={`w-[74px] shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-semibold ${TONE[item.severity]}`}>
                  {item.severity}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{item.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate font-mono text-[11px]">
                    <span className="rounded bg-[#e5484d]/15 px-1 text-[#ff8a8e] line-through decoration-[#ff8a8e]/60">
                      {item.before}
                    </span>
                    <span className="text-[#5d606a]">→</span>
                    <span className="rounded bg-white/[0.08] px-1">{item.after}</span>
                    <span className="truncate text-[#5d606a]">{item.path}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
