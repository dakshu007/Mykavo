import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, PenLine } from "lucide-react";
import { AUDIT_CHECK_COUNT } from "@mykavo/seo-audit";
import { WordPressGlyph } from "@/components/brand/integration-icons";
import { getPlan } from "@/config/plans";
import { LandingAuditForm } from "./audit-form";
import { GoogleButton } from "./google-cta";
import { HeroAiWriter } from "./hero-ai-writer";
import { HeroStoryAnimation } from "./hero-story-animation";
import { HeroWordPress } from "./hero-wordpress";
import { Snowfall } from "./snowfall";
import { fontDisplay } from "./style";
import { HeroWpReviews } from "./wp-reviews";

/**
 * Home hero, in two parts.
 *
 * 1. The scene: a full-screen winter-into-spring landscape with snow
 *    falling. The sky carries only what a first-time visitor needs (what's
 *    new, the category headline, one line of copy, one call to action); the
 *    two halves of MyKavo sit on the hills as two slim glass tiles, so the
 *    picture stays visible instead of being covered by cards.
 * 2. "Pick where to start": the full WordPress plugin and AI Blog Writer
 *    cards, on the paper canvas just below the scene, then the story
 *    animation of how every scan works.
 */

const TILES = [
  {
    href: "/wordpress-plugin?from=home_hero_tile",
    title: "Free WordPress plugin",
    sub: "A check after every update",
    icon: <WordPressGlyph className="size-5" />,
    iconClass: "bg-[#21759B] text-white",
  },
  {
    href: "/ai-blog-writer?from=home_hero_tile",
    title: "AI Blog Writer",
    sub: "Posts built to rank",
    icon: <PenLine className="size-[18px]" aria-hidden />,
    iconClass: "bg-[#FFD400] text-[#151515] ring-1 ring-[#151515]/80",
    badge: "New",
  },
] as const;

export function LandingHero() {
  return (
    <>
      <section
        data-track-section="hero"
        className="relative isolate flex min-h-[max(calc(100svh-var(--promo-h,0px)),660px)] flex-col overflow-hidden px-5 pb-6 pt-24 sm:pb-8 sm:pt-32 lg:px-8 lg:pt-28"
      >
        <Image
          src="/home/winter-spring.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-30 object-cover object-[50%_88%]"
        />
        {/* Brighten the sky behind the headline, keep the hills clear. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(ellipse_75%_55%_at_50%_30%,rgba(251,250,243,0.72),rgba(251,250,243,0.25)_55%,transparent_75%)]"
        />
        <Snowfall className="-z-10" />

        <div className="relative mx-auto w-full max-w-5xl text-center">
          <Link
            href="/ai-blog-writer"
            className="hero-launch group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full border border-white/80 bg-white/70 py-2 pl-3.5 pr-3.5 text-[13px] font-semibold text-[#151515] shadow-[0_8px_30px_-12px_rgba(21,21,21,0.25)] backdrop-blur-md transition-transform hover:-translate-y-0.5"
          >
            <span className="rounded-full bg-[#151515] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-[#FFD400]">New</span>
            <span className="sm:hidden">AI Keywords &amp; Blog Writer</span>
            <span className="hidden sm:inline">AI Keywords &amp; Blog Writer: know what to write next</span>
            <ArrowRight className="size-3.5 text-[#151515]/60 transition-transform group-hover:translate-x-0.5" aria-hidden />
            <span aria-hidden className="hero-launch-shine pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-[#FFD400]/40 to-transparent" />
          </Link>
          <style>{`
            @keyframes hero-launch-shine { 0%, 70% { transform: translateX(0); } 100% { transform: translateX(480%); } }
            .hero-launch-shine { animation: hero-launch-shine 4.5s ease-in-out 1.5s infinite; }
            @media (prefers-reduced-motion: reduce) { .hero-launch-shine { display: none; } }
          `}</style>

          {/* The headline names the category; "page by page" is the
              differentiator (the unit of work is a page, not a whole site). */}
          <h1 className={`${fontDisplay} mx-auto mt-6 max-w-4xl text-[40px] leading-[1.02] text-[#151515] sm:mt-7 sm:text-6xl lg:text-[76px]`}>
            Website monitoring,
            <br />
            <span className="relative inline-block whitespace-nowrap">
              <span aria-hidden className="absolute inset-x-[-6px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]" />
              <span className="relative">page by page.</span>
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-6 text-[#33332d] sm:mt-6 sm:text-[18px] sm:leading-7">
            MyKavo re-checks the pages that matter on every website you manage and tells you the moment one changes, with
            before-and-after proof.<span className="hidden sm:inline"> Then its AI Blog Writer finds what to write next and drafts the post.</span>
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row">
            <GoogleButton label="Start monitoring free" from="home_hero" />
            <a
              href="#start"
              className="hidden h-13 items-center gap-2 rounded-full border border-white/80 bg-white/60 px-6 text-[15px] font-semibold text-[#151515] backdrop-blur-md transition-colors hover:bg-white/85 sm:inline-flex"
            >
              Pick where to start
              <ArrowDown className="size-4" aria-hidden />
            </a>
          </div>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#33332d] [text-shadow:0_1px_8px_rgba(255,255,255,0.9)] sm:text-[11.5px]">
            Free plan · No credit card<span className="hidden sm:inline"> · Monitoring in minutes</span>
          </p>
        </div>

        {/* The two halves of MyKavo, resting on the hills. */}
        <div className="relative mx-auto mt-auto grid w-full max-w-3xl gap-2.5 pt-10 sm:grid-cols-2 sm:gap-3 sm:pt-14">
          {TILES.map((t) => (
            <Link
              key={t.title}
              href={t.href}
              className="group flex items-center gap-3.5 rounded-2xl border border-white/75 bg-white/55 px-4 py-3.5 text-left shadow-[0_16px_40px_-20px_rgba(21,40,60,0.45)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/75"
            >
              <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl ${t.iconClass}`}>{t.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[15px] font-semibold text-[#151515]">
                  {t.title}
                  {"badge" in t ? (
                    <span className="rounded-full bg-[#151515] px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.08em] text-[#FFD400]">{t.badge}</span>
                  ) : null}
                </span>
                <span className="block text-[13px] text-[#3d3d38]">{t.sub}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-[#151515]/60 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      {/* Pick where to start: the full cards, on the paper canvas. */}
      <section id="start" data-track-section="pick-where-to-start" className="relative scroll-mt-24 px-5 pb-16 pt-16 lg:px-8 lg:pt-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="font-mono text-[11.5px] font-semibold uppercase tracking-[0.22em] text-[#6b5500]">Pick where to start</p>
            <h2 className={`${fontDisplay} mx-auto mt-3 max-w-3xl text-[34px] leading-[1.08] text-[#151515] sm:text-[44px]`}>
              Protect the traffic you have. Win the traffic you don&apos;t.
            </h2>
          </div>
          <div className="mx-auto mt-10 grid max-w-2xl gap-5 lg:max-w-[1080px] lg:grid-cols-2">
            <HeroWordPress variant="card" />
            <HeroAiWriter />
          </div>
          <Suspense fallback={null}>
            <HeroWpReviews />
          </Suspense>
          <details className="group/audit mx-auto mt-6 max-w-2xl">
            <summary className="mx-auto flex w-fit cursor-pointer list-none items-center gap-1.5 text-[13.5px] font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4 [&::-webkit-details-marker]:hidden">
              Not on WordPress? Get a free site audit by email
            </summary>
            <div className="mt-4">
              <LandingAuditForm />
              <p className="mt-3 text-center text-[13px] text-[#6B6B60]">
                Up to {getPlan("free").limits.siteAuditPages} pages, {AUDIT_CHECK_COUNT} checks, emailed to you in minutes. No
                signup needed.
              </p>
            </div>
          </details>

          {/* How MyKavo works, as one loop: baseline, scan, compare, alert, resolve. */}
          <div className="relative mx-auto mt-16 max-w-5xl">
            <HeroStoryAnimation lazy />
            <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[#6B6B60]">
              Illustrative example · how every scan works
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
