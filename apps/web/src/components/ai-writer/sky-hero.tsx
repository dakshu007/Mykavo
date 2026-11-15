import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { GoogleButton } from "@/components/landing/google-cta";
import type { WriterHero } from "@/config/ai-writer/types";
import { fontGiant, fontSerif } from "./fonts";

/**
 * The AI Writer hero: a deep blue sky, giant yellow words and a bank of
 * clouds that rises in front of them, so the letters sink into it (the
 * cloud layer is the same photo cut out by brightness, drawn on top).
 *
 * Layout maths: the sky photo is 16:9 with the cloud tops at ~47% of its
 * height. The section is never wider than 16:9 (min-height 56.25vw), so the
 * photo always fills it by height and the cloud line stays at ~47% of the
 * section at every width. The headline is pinned to that line and lifted by
 * most of its own height, leaving the bottom of the letters in the clouds.
 *
 * The headline is real text in the H1 (pre + solid + outline + accent), not
 * an image, so it reads "AI Blog Writer, built to rank." to search engines.
 */

const SKY_ALT = "";

function giantSizes(hero: WriterHero) {
  const solid = hero.solid.length;
  const outline = hero.outline.length;
  // One line on wider screens, one word per line on phones. ~0.66em per
  // capital in League Spartan 800, with a little room for the gap.
  const desktop = Math.min(15.5, 84 / ((solid + outline) * 0.66 + (hero.joined ? 0 : 0.5)));
  const mobile = Math.min(30, 86 / (Math.max(solid, outline) * 0.68));
  return { "--gd": `${desktop.toFixed(2)}vw`, "--gm": `${mobile.toFixed(2)}vw` } as React.CSSProperties;
}

export function SkyHero({ hero, from }: { hero: WriterHero; from: string }) {
  return (
    <section
      data-track-section="hero"
      className="sky-hero relative isolate h-[100svh] min-h-[max(740px,56.25vw)] overflow-hidden bg-[#1f63b8] sm:min-h-[max(680px,56.25vw)]"
    >
      <Image
        src="/ai-writer/sky.webp"
        alt={SKY_ALT}
        fill
        priority
        sizes="100vw"
        className="sky-back -z-30 object-cover object-bottom"
      />
      {/* Halftone dots over the open sky, fading out before the clouds. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.22)_1px,transparent_1.6px)] [background-size:7px_7px] [mask-image:radial-gradient(ellipse_70%_45%_at_50%_22%,black,transparent)]"
      />
      {/* A soft vignette so the yellow keeps its contrast at the edges. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_50%_0%,transparent_40%,rgba(8,32,80,0.35))]" />

      {/* Ring + accent, above the giant line. */}
      <div className="absolute inset-x-0 top-[calc(var(--promo-h,0px)+6.5rem)] z-10 mx-auto flex max-w-7xl flex-col items-center px-5 text-center sm:top-[calc(var(--promo-h,0px)+7.5rem)] lg:px-8">
        <span
          className={`${fontSerif} inline-flex items-center rounded-[50%] border border-[#FFE680]/75 px-7 py-2.5 text-[11px] uppercase tracking-[0.42em] text-[#FFF3B0] sm:px-10 sm:text-[12px]`}
        >
          {hero.ring}
        </span>
      </div>

      {/*
        The H1 reads "pre + SOLID OUTLINE + accent". It is pinned to the cloud
        line with no transform or z-index of its own, so its children can sit
        on different layers: the giant words behind the clouds (z-10, sunk a
        quarter of their height into them) and the tagline in front (z-30).
      */}
      <h1 className="absolute inset-x-0 top-[50%] mx-auto sm:top-[47%] max-w-[96vw] px-3 text-center" style={giantSizes(hero)}>
        <span className="absolute inset-x-0 bottom-full z-10 flex flex-col items-center">
          {hero.pre ? (
            <span
              className={`${fontSerif} mb-[0.12em] block max-w-[22ch] text-[clamp(26px,6vw,64px)] italic leading-[1.05] text-[#FFE680] [text-shadow:0_2px_24px_rgba(6,30,80,0.4)] sm:max-w-none sm:text-[clamp(28px,3.6vw,64px)]`}
            >
              {hero.pre}{" "}
            </span>
          ) : null}
          <span
            className={`${fontGiant} giant flex translate-y-[0.16em] flex-col sm:translate-y-[0.27em] items-center font-extrabold uppercase leading-[0.8] tracking-[-0.025em] text-[#FFD400] [font-size:min(var(--gm),150px)] [filter:drop-shadow(0_6px_28px_rgba(6,30,80,0.35))] sm:flex-row sm:[font-size:min(var(--gd),250px)] ${hero.joined ? "sm:gap-0" : "sm:gap-[0.18em]"}`}
          >
            <span>{hero.solid}</span>
            {hero.joined ? null : <span className="sr-only"> </span>}
            <span className="text-transparent [-webkit-text-stroke:2px_#FFD400] sm:[-webkit-text-stroke:3px_#FFD400]">{hero.outline}</span>
          </span>
        </span>
        <span
          className={`${fontSerif} relative z-30 mx-auto mt-[calc(min(var(--gm),150px)*0.24)] block max-w-[24ch] text-[clamp(22px,5.4vw,46px)] italic leading-tight text-[#0d2c5c] [text-shadow:0_1px_18px_rgba(255,255,255,0.9)] sm:mt-[calc(min(var(--gd),250px)*0.34)] sm:max-w-none sm:text-[clamp(24px,2.8vw,46px)]`}
        >
          {" "}
          {hero.accent}
        </span>
      </h1>

      {/* The cloud bank in front of the letters. */}
      <Image
        src="/ai-writer/clouds-front.webp"
        alt=""
        aria-hidden
        fill
        sizes="100vw"
        className="sky-front pointer-events-none z-20 object-cover object-bottom"
      />

      {/* Floating fact chips (alyn-style glass pills), wide screens only. */}
      <ul aria-label="Highlights" className="absolute inset-0 z-30 hidden lg:block">
        {hero.chips.map((chip, i) => (
          <li
            key={chip}
            className={`sky-chip absolute inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/45 px-4 py-2 text-[14px] font-medium text-[#0f2a52] shadow-[0_8px_30px_rgba(10,40,90,0.18)] backdrop-blur-md ${
              i === 0 ? "left-[5%] top-[24%]" : i === 1 ? "right-[6%] top-[21%]" : "right-[7%] top-[61%]"
            }`}
            style={{ animationDelay: `${i * -2.3}s` }}
          >
            <span aria-hidden className="size-2 rounded-full bg-[#FFD400] shadow-[0_0_0_3px_rgba(255,212,0,0.35)]" />
            {chip}
          </li>
        ))}
      </ul>

      {/* Lede + calls to action, on the clouds. */}
      <div className="absolute inset-x-0 bottom-[3%] z-30 mx-auto flex max-w-7xl justify-center px-4 sm:bottom-[6%] sm:px-5 lg:px-8">
        <div className="w-full max-w-2xl rounded-[28px] border border-white/80 bg-white/55 p-5 text-center shadow-[0_20px_60px_rgba(10,40,90,0.18)] backdrop-blur-xl sm:p-7">
          <p className="text-[14.5px] leading-relaxed text-[#13284a] sm:text-[17px]">{hero.lede}</p>
          <div className="mt-4 flex flex-col items-center justify-center gap-2.5 sm:mt-5 sm:flex-row sm:gap-3">
            <GoogleButton label={hero.cta} from={`${from}:hero`} />
            <a
              href="#try-it"
              className="hidden h-13 items-center gap-2 rounded-full border border-[#151515]/80 bg-white/70 px-6 text-[15px] font-medium text-[#151515] transition-colors hover:bg-white sm:inline-flex"
            >
              Try it below
              <ArrowDown className="size-4" aria-hidden />
            </a>
          </div>
          <ul className="mt-4 hidden flex-wrap justify-center gap-x-4 gap-y-1 text-[12.5px] text-[#13284a]/80 sm:flex lg:hidden">
            {hero.chips.map((chip) => (
              <li key={chip} className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-1.5 rounded-full bg-[#d4a900]" />
                {chip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** A short sky band reused for the closing call to action. */
export function SkyBand({ title, body, cta, from }: { title: string; body: string; cta: string; from: string }) {
  return (
    <section data-track-section="final-cta" className="relative isolate overflow-hidden bg-[#1f63b8]">
      <Image src="/ai-writer/sky-sm.webp" alt="" fill sizes="100vw" className="-z-20 object-cover object-[50%_35%]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0d3c7d]/30 via-transparent to-white/10" />
      <div className="mx-auto max-w-5xl px-5 py-24 text-center lg:px-8 lg:py-32">
        <h2
          className={`${fontGiant} text-[clamp(40px,7vw,92px)] font-extrabold uppercase leading-[0.9] tracking-[-0.02em] text-[#FFD400] [filter:drop-shadow(0_6px_28px_rgba(6,30,80,0.35))]`}
        >
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-white/95 [text-shadow:0_1px_12px_rgba(6,30,80,0.4)]">{body}</p>
        <div className="mt-8 flex justify-center">
          <GoogleButton label={cta} from={`${from}:end`} />
        </div>
      </div>
    </section>
  );
}
