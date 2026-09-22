import { FileText, Layers, BellRing } from "lucide-react";
import { eyebrow, fontDisplay } from "./style";

/**
 * "What MyKavo is" - the definition band, directly under the hero.
 *
 * WHY THIS SECTION EXISTS
 * -----------------------
 * Readers kept saying the same thing: the page never states, in plain words,
 * what the product actually is. Everything after this point is a feature, a
 * benefit or a proof - all of which land differently once somebody knows what
 * category they are looking at, and land as noise before that.
 *
 * So this says it once, flatly, in the second screen: MyKavo is page
 * monitoring. Then it defines the three things a reader needs in order to
 * picture the product working - what gets monitored (a page), how (a stored
 * baseline), and what comes out (one ranked alert).
 *
 * The negative definition earns its place. "Not uptime checks, not a crawler,
 * not an SEO suite" is the fastest way to place a product in a head that is
 * already full of tools, and it is exactly what the spec says MyKavo is NOT
 * (CLAUDE.md section 1) - so it is honest positioning rather than a jab at
 * anybody.
 */

const definitions = [
  {
    icon: FileText,
    label: "the unit",
    title: "A page, not a whole site",
    body: "You choose which pages to watch - the homepage, pricing, checkout, the handful that actually cost you money when they break. Nothing else is scanned, so nothing else can cry wolf.",
  },
  {
    icon: Layers,
    label: "the method",
    title: "A baseline you approved",
    body: "MyKavo stores an approved snapshot of each page: screenshot, normalized DOM, SEO tags, links, scripts, page weight. Every later scan is compared against it - deterministically, with no AI guesswork.",
  },
  {
    icon: BellRing,
    label: "the output",
    title: "One alert, ranked by severity",
    body: "Not a feed of every mutation. Related changes are grouped into a single alert, scored from INFO to CRITICAL, and delivered with the previous and current value side by side.",
  },
];

export function WhatItIsSection() {
  return (
    <section
      id="what-it-is"
      aria-labelledby="what-it-is-heading"
      className="border-y border-black/10 bg-[#F3F1E6]"
    >
      <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className={`${eyebrow} mb-4`}>{"// what mykavo is //"}</p>
          <h2
            id="what-it-is-heading"
            className={`${fontDisplay} text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}
          >
            MyKavo is{" "}
            {/*
              An underline rather than the hero's gold slab. Gold is the only
              accent this page has, and running the same full-block highlight
              twice within two screens turns a signature into a tic - the
              underline keeps the accent and drops the shout.
            */}
            <span className="relative inline-block whitespace-nowrap">
              <span
                aria-hidden
                className="absolute inset-x-[-2px] bottom-[2px] h-[10px] -rotate-[0.6deg] rounded-sm bg-[#FFD400] sm:h-3"
              />
              <span className="relative">page monitoring.</span>
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-7 text-[#6B6B60] sm:text-base">
            Not uptime checks. Not a crawler. Not an SEO suite. You choose the pages that
            matter, and MyKavo remembers exactly how each one should look &mdash; then tells you
            when that stops being true.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {definitions.map((d) => (
            <div
              key={d.label}
              className="rounded-2xl border border-black/10 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-[#151515] hover:shadow-[4px_4px_0_#151515]"
            >
              <div className="flex items-center gap-2.5">
                <span className="inline-flex size-8 items-center justify-center rounded-lg border border-black/15 bg-[#FFD400]">
                  <d.icon className="size-4 text-[#151515]" aria-hidden />
                </span>
                <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]">
                  {d.label}
                </span>
              </div>
              <h3 className="mt-4 text-[17px] font-semibold leading-snug text-[#151515]">
                {d.title}
              </h3>
              <p className="mt-2 text-[14px] leading-6.5 text-[#6B6B60]">{d.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
