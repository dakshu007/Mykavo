"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The AI loader: the Kavo runner sprints along the progress bar shouting
 * "My-Kaa-Vooo!", the a's and o's stretching as the job gets closer to done.
 * Real progress moves in steps (5%, 30%, 55%...), so the runner glides to
 * each new position while his legs keep running. Everything stops for
 * reduced motion (globals.css, "kv-"): he stands at his place on the bar.
 */

/** The little runner: gold, legs and arms swinging. Decorative. */
export function KavoRunner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 48" aria-hidden="true" focusable="false" className={cn("kv-bob block", className)}>
      <circle cx="25" cy="7" r="5.5" fill="var(--color-primary)" />
      <ellipse cx="28.5" cy="8" rx="1.6" ry="2" fill="var(--color-card)" />
      <line x1="22" y1="14" x2="18" y2="27" stroke="var(--color-primary)" strokeWidth="4.5" strokeLinecap="round" />
      <g className="kv-arm1">
        <line x1="21" y1="16" x2="30" y2="22" stroke="var(--color-primary)" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g className="kv-arm2">
        <line x1="21" y1="16" x2="13" y2="22" stroke="var(--kv-back, #d9b400)" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g className="kv-leg1">
        <polyline points="18,27 24,35 21,44" fill="none" stroke="var(--color-primary)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g className="kv-leg2">
        <polyline points="18,27 13,36 6,40" fill="none" stroke="var(--kv-back, #d9b400)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** "My-Kaa-Vooo!", longer the closer it gets; shorter in a narrow card. */
export function kavoShout(pct: number, compact: boolean): string {
  if (pct >= 100) return compact ? "Done!" : "Done! Nearly there…";
  const a = "a".repeat(2 + Math.min(compact ? 3 : 5, Math.floor(pct / (compact ? 25 : 18))));
  const o = "o".repeat(2 + Math.min(compact ? 4 : 6, Math.floor(pct / (compact ? 20 : 15))));
  return `My-K${a}-V${o}!`;
}

export function KavoProgress({ step, progress }: { step: string | null; progress: number }) {
  const pct = Math.max(4, Math.min(100, Math.round(progress)));
  const wrap = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  // Narrow cards (a keyword card, the editor's rail) get a shorter shout
  // that flips sides sooner, so the bubble never runs off the card.
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setCompact((entry?.contentRect.width ?? 600) < 520));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const runner = compact ? 28 : 34;
  const flip = pct > (compact ? 45 : 62);

  return (
    <div ref={wrap} role="status" aria-live="polite" className="w-full">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="font-semibold text-ink">{step ?? "Working"}…</span>
        <span className="font-mono tabular-nums text-ink-faint">{pct}%</span>
      </div>
      <div className={cn("relative", compact ? "h-[92px]" : "h-[96px]")}>
        <div className="absolute inset-x-0 bottom-2 h-2 rounded-full bg-ink/10" />
        <div
          className="absolute bottom-2 left-0 h-2 rounded-full bg-primary shadow-[0_0_12px_rgb(255_212_0/0.45)] transition-[width] duration-700 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute bottom-[14px] transition-[left] duration-700 ease-out motion-reduce:transition-none"
          style={{ left: `calc(${pct}% - ${(pct * runner) / 100}px)`, width: runner }}
        >
          <div
            aria-hidden="true"
            className={cn(
              "kv-wiggle absolute whitespace-nowrap rounded-[10px] bg-primary font-extrabold text-primary-contrast shadow-[2px_2px_0_var(--color-ink)]",
              compact ? "bottom-[40px] px-2.5 py-1 text-[12.5px]" : "bottom-[48px] px-3 py-1.5 text-[14.5px]",
              flip ? "right-1 origin-bottom-right rounded-br-[3px]" : "left-3 origin-bottom-left rounded-bl-[3px]",
            )}
          >
            {kavoShout(pct, compact)}
          </div>
          <KavoRunner className={compact ? "h-[35px] w-[28px]" : "h-[42px] w-[34px]"} />
        </div>
      </div>
      <p className="mt-1 text-[12px] text-ink-faint">You can leave this page; it keeps working.</p>
    </div>
  );
}
