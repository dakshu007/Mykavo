"use client";

import { useEffect, useState } from "react";
import { Check, Mail, Siren, Wrench, X } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { fontDisplay } from "./style";

/**
 * "Your week, with and without it" - one timeline, two outcomes.
 *
 * A deploy breaks the checkout at 02:14 on Monday. Without MyKavo the red
 * bar runs until a client email on Thursday; with MyKavo a deploy check
 * alerts at 02:20 and the fix lands at 02:41 - a sliver so thin on a
 * five-day axis that it gets a zoomed callout. A switch flips between the
 * two (on its own until someone uses it, paused on hover), and the three
 * everyday differences below flip with it.
 *
 * Timings are illustrative. "With" assumes a deploy check (the deploy hook);
 * the footnote says scheduled scans catch it on their next run instead.
 */

type Mode = "without" | "with";

const ROWS = [
  {
    label: "Finding out a page broke",
    without: "An angry client email, days later",
    with: "One grouped alert, minutes after the scan",
  },
  {
    label: "Re-checking pages after a deploy",
    without: "Hours of clicking through every page",
    with: "Automatic on every scan and deploy check",
  },
  {
    label: "Proving what actually changed",
    without: "Guesswork and screenshots from memory",
    with: "Stored before-and-after evidence",
  },
];

// Monday 00:00 to Friday 24:00, in hours.
const SPAN_H = 5 * 24;
const at = (h: number) => `${(h / SPAN_H) * 100}%`;
const BREAK_H = 2 + 14 / 60;
const CLIENT_H = 3 * 24 + 10.5;
const FIX_H = 2 + 41 / 60;

const FLIP_MS = 5200;

export function BeforeAfterTimeline() {
  const [mode, setMode] = useState<Mode>("without");
  const [auto, setAuto] = useState(true);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (!auto || hover) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(() => setMode((m) => (m === "without" ? "with" : "without")), FLIP_MS);
    return () => window.clearTimeout(id);
  }, [mode, auto, hover]);

  const choose = (m: Mode) => {
    setMode(m);
    setAuto(false);
  };
  const w = mode === "with";

  return (
    <div
      className="mx-auto mt-14 max-w-5xl"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <style>{`
        .ba-t { transition: all 700ms cubic-bezier(.2,.8,.2,1); }
        .ba-fade { transition: opacity 400ms ease, transform 500ms cubic-bezier(.2,.8,.2,1); }
        @media (prefers-reduced-motion: reduce) { .ba-t, .ba-fade { transition: none; } }
      `}</style>

      {/* The switch */}
      <div className="flex justify-center">
        <div
          role="radiogroup"
          aria-label="Compare your week"
          className="relative grid grid-cols-2 rounded-full border border-[#151515] bg-white p-1 shadow-[3px_3px_0_#151515]"
        >
          <span
            aria-hidden
            className={`ba-t absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full ${w ? "translate-x-full bg-[#FFD400]" : "translate-x-0 bg-[#151515]"}`}
          />
          {(["without", "with"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => choose(m)}
              className={`relative z-10 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-semibold transition-colors sm:px-6 ${
                mode === m ? (m === "with" ? "text-[#151515]" : "text-white") : "text-[#6B6B60] hover:text-[#151515]"
              }`}
            >
              {m === "with" ? (
                <span className="flex size-5 items-center justify-center rounded-full bg-[#151515]">
                  <LogoMark size={12} />
                </span>
              ) : (
                <X className="size-4" aria-hidden />
              )}
              {m === "with" ? "With MyKavo" : "Without MyKavo"}
            </button>
          ))}
        </div>
      </div>

      {/* The timeline */}
      <div className="mt-8 overflow-hidden rounded-[22px] border border-[#151515] bg-white shadow-[8px_8px_0_#151515]">
        <div className="flex flex-col gap-6 p-6 sm:p-9 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]">
              Monday 02:14 · a deploy breaks the checkout
            </p>
            <div className="relative mt-3 h-[44px] sm:h-[72px]">
              {(["without", "with"] as const).map((m) => (
                <p
                  key={m}
                  aria-hidden={mode !== m}
                  className={`ba-fade absolute left-0 top-0 whitespace-nowrap ${fontDisplay} text-[38px] leading-none sm:text-[64px] ${
                    m === "with" ? "text-[#151515]" : "text-[#E5484D]"
                  } ${mode === m ? "translate-y-0 opacity-100" : m === "with" ? "translate-y-4 opacity-0" : "-translate-y-4 opacity-0"}`}
                >
                  {m === "with" ? "27 minutes" : "3 days, 8 hours"}
                </p>
              ))}
            </div>
            <p className="mt-2 text-[15px] text-[#6B6B60]">
              broken, and found by{" "}
              <span className="font-semibold text-[#151515]">{w ? "MyKavo - before a single customer noticed." : "a customer, in an angry email."}</span>
            </p>
          </div>
          <div className="flex gap-2">
            {[
              { k: "Found by", v: w ? "MyKavo" : "Client", good: w },
              { k: "Evidence", v: w ? "Before / after" : "None", good: w },
            ].map((s) => (
              <div key={s.k} className="min-w-[120px] rounded-2xl border border-black/10 bg-[#FBFAF3] px-4 py-3">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B6B60]">{s.k}</p>
                <p className={`mt-1 flex items-center gap-1.5 text-[15px] font-semibold ${s.good ? "text-[#151515]" : "text-[#E5484D]"}`}>
                  {s.good ? <Check className="size-4 text-[#16A34A]" aria-hidden /> : <X className="size-4" aria-hidden />}
                  {s.v}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* axis */}
        <div className="border-t border-black/10 bg-[#FBFAF3] bg-[radial-gradient(rgba(21,21,21,0.06)_1px,transparent_1.2px)] [background-size:16px_16px] px-6 pb-8 pt-24 sm:px-9">
          <div className="relative">
            {/* zoom callout for the "with" sliver */}
            <div
              className={`ba-fade absolute bottom-[34px] left-0 z-10 origin-bottom-left ${w ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0"}`}
            >
              <div className="flex items-center gap-2 rounded-2xl border border-[#151515] bg-white px-3 py-2.5 shadow-[3px_3px_0_#151515] sm:gap-3 sm:px-4">
                {[
                  { t: "02:14", l: "Deploy breaks it", icon: Siren, c: "bg-[#E5484D] text-white" },
                  { t: "02:20", l: "MyKavo alert", icon: null, c: "bg-[#151515] ring-2 ring-[#FFD400]" },
                  { t: "02:41", l: "Fixed", icon: Wrench, c: "bg-[#16A34A] text-white" },
                ].map((s, i) => (
                  <div key={s.t} className="flex items-center gap-2 sm:gap-3">
                    {i > 0 && <span aria-hidden className="h-px w-3 bg-[#151515]/30 sm:w-6" />}
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${s.c}`}>
                      {s.icon ? <s.icon className="size-3.5" aria-hidden /> : <LogoMark size={14} />}
                    </span>
                    <span>
                      <span className="block font-mono text-[11px] font-bold text-[#151515]">{s.t}</span>
                      <span className="hidden whitespace-nowrap text-[11px] text-[#6B6B60] sm:block">{s.l}</span>
                    </span>
                  </div>
                ))}
              </div>
              <span aria-hidden className="ml-4 block h-4 w-px bg-[#151515]/40" />
            </div>

            {/* client email marker for "without" */}
            <div
              className={`ba-fade absolute bottom-[34px] z-10 -translate-x-1/2 ${w ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"}`}
              style={{ left: at(CLIENT_H) }}
            >
              <div className="flex items-center gap-2 whitespace-nowrap rounded-2xl border border-[#E5484D] bg-white px-3 py-2 shadow-[3px_3px_0_#E5484D]">
                <Mail className="size-4 text-[#E5484D]" aria-hidden />
                <span>
                  <span className="block font-mono text-[11px] font-bold text-[#151515]">Thu 10:30</span>
                  <span className="block text-[11px] text-[#6B6B60]">“Checkout is broken??”</span>
                </span>
              </div>
              <span aria-hidden className="mx-auto block h-4 w-px bg-[#E5484D]/60" />
            </div>

            {/* track */}
            <div className="relative h-3 rounded-full bg-[#151515]/[0.07]">
              <span
                aria-hidden
                className={`ba-t absolute inset-y-0 rounded-full ${w ? "bg-[#16A34A]" : "bg-[#E5484D]"}`}
                style={{ left: at(BREAK_H), width: w ? `max(10px, ${at(FIX_H - BREAK_H)})` : at(CLIENT_H - BREAK_H) }}
              />
              <span
                aria-hidden
                className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#E5484D] shadow"
                style={{ left: at(BREAK_H) }}
              />
              <span
                aria-hidden
                className={`ba-t absolute top-1/2 size-4 -translate-y-1/2 rounded-full border-2 border-white shadow ${w ? "bg-[#16A34A]" : "bg-[#E5484D]"}`}
                style={{ left: w ? `calc(${at(FIX_H)} + 4px)` : at(CLIENT_H) }}
              />
            </div>
            <div className="mt-3 grid grid-cols-5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#6B6B60]">
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
                <span key={d} className="border-l border-black/10 pl-2">
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* The everyday differences */}
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {ROWS.map((row, i) => (
          <div key={row.label} className="rounded-2xl border border-black/10 bg-white p-5">
            <p className="text-[14.5px] font-semibold text-[#151515]">{row.label}</p>
            <div className="relative mt-3 min-h-[48px]">
              {(["without", "with"] as const).map((m) => (
                <p
                  key={m}
                  aria-hidden={mode !== m}
                  className={`ba-fade absolute inset-x-0 top-0 flex items-start gap-2 text-[14px] leading-6 ${
                    mode === m ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                  } ${m === "with" ? "text-[#151515]" : "text-[#151515]/55"}`}
                  style={{ transitionDelay: mode === m ? `${120 + i * 80}ms` : "0ms" }}
                >
                  <span
                    className={`mt-1 flex size-4 shrink-0 items-center justify-center rounded-full ${
                      m === "with" ? "bg-[#FFD400]" : "bg-[#E5484D]/15"
                    }`}
                  >
                    {m === "with" ? (
                      <Check className="size-3 text-[#151515]" strokeWidth={3} aria-hidden />
                    ) : (
                      <X className="size-3 text-[#E5484D]" strokeWidth={3} aria-hidden />
                    )}
                  </span>
                  {m === "with" ? row.with : row.without}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-[#6B6B60]">
        Illustrative timings · with a deploy check. Scheduled scans catch it on their next run.
      </p>
    </div>
  );
}
