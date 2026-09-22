import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { LandingUrlInput } from "./url-input";
import { DashboardMock } from "./dashboard-mock";
import { fontDisplay } from "./style";

/**
 * Bright hero (playground/ballpark-style): badge pill, huge Poppins headline
 * with a gold highlighter sweep, honest sub-copy, the product-led URL input,
 * CTA pair, and the browser-chrome dashboard mock as the centerpiece.
 * Fully static server markup - fast, no scroll hijacking.
 */
export function LandingHero() {
  return (
    <section className="relative overflow-hidden px-5 pb-16 pt-32 sm:pt-40 lg:px-8">
      {/* Faint dot grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,#15151514_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]"
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="flex justify-center">
          <p className="flex items-center gap-2 rounded-full border border-[#151515]/15 bg-white px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#151515]/70 shadow-[2px_2px_0_#151515]">
            <Sparkles className="size-3.5 text-[#151515]" aria-hidden />
            Website change detection
          </p>
        </div>

        {/*
          THE HEADLINE NAMES THE CATEGORY.

          It used to be the brand tagline - "Know what changed. Fix what
          matters." - which is a good tagline and a bad headline: the largest
          text on the page told a first-time visitor nothing about what this
          product IS. Readers said so directly. The category now lives in the
          headline ("website monitoring"), the differentiator in the gold
          ("page by page" - the unit of work is a page, not a whole site), and
          the tagline keeps its home in the nav, the footer and every email.
        */}
        <h1
          className={`${fontDisplay} mx-auto mt-8 max-w-4xl text-center text-[44px] leading-[1.04] text-[#151515] sm:text-6xl lg:text-[76px]`}
        >
          Website monitoring,
          <br />
          <span className="relative inline-block whitespace-nowrap">
            <span
              aria-hidden
              className="absolute inset-x-[-6px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
            />
            <span className="relative">page by page.</span>
          </span>
        </h1>

        {/*
          One job, stated once, in plain words.

          This used to enumerate seven change categories in a single breath -
          "visual, SEO, content, link, script, performance, and conversion" -
          which is the fastest way to read as seven products rather than one.
          The categories are genuinely worth knowing about, so they still get a
          section of their own further down, under a heading that frames them
          correctly: eight kinds of change, ONE monitoring layer. Here the copy
          carries the loop, which is the thing a first-time visitor has to
          understand before any of the breadth means anything.
        */}
        <p className="mx-auto mt-6 max-w-2xl text-center text-[16px] leading-7 text-[#6B6B60] sm:text-lg">
          Pick the pages that matter on every website you manage. MyKavo approves a known-good
          baseline of each, re-checks them around the clock, and tells you the moment one
          changes &mdash; with before-and-after proof.
        </p>

        {/* Product-led URL input - instant value, no signup */}
        <div className="mt-9">
          <LandingUrlInput />
          <p className="mt-3 text-center text-[13px] text-[#6B6B60]">
            Free instant inspection - status, SEO tags, links &amp; scripts. No signup needed.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-full border border-[#151515] bg-[#FFD400] px-7 py-3.5 text-sm font-semibold text-[#151515] shadow-[4px_4px_0_#151515] transition-all hover:-translate-y-0.5 hover:shadow-[5px_6px_0_#151515] active:translate-y-0 active:shadow-[2px_2px_0_#151515]"
          >
            Start Monitoring Free
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <Link
            href="/#how-it-works"
            className="inline-flex items-center gap-2 rounded-full border border-[#151515]/20 bg-white px-7 py-3.5 text-sm font-semibold text-[#151515] transition-colors hover:border-[#151515]/40"
          >
            See How MyKavo Works
          </Link>
        </div>

        <p className="mt-5 text-center font-mono text-[11.5px] uppercase tracking-[0.14em] text-[#6B6B60]">
          Free plan · No credit card · Monitoring in minutes
        </p>

        <DashboardMock />
      </div>
    </section>
  );
}
