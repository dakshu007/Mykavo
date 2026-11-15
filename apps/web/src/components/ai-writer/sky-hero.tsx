import { PlayCircle } from "lucide-react";
import { GoogleButton } from "@/components/landing/google-cta";
import type { WriterHero } from "@/config/ai-writer/types";
import { fontGiant, fontSerif } from "./fonts";
import { HeroSearch } from "./hero-search";
import { SKY_BG, SkyScene } from "./sky-scene";

/**
 * The AI Writer hero: a clear blue sky with a few clouds drifting across,
 * giant yellow words, and a live search right in the hero ("What should your
 * next post be about?") so a visitor is using the product within seconds.
 *
 * The H1 is real text: "pre + SOLID OUTLINE + accent", e.g. "The AI BLOG
 * WRITER built to rank.". The giant words scale from their letter count so
 * they always fit on one line from small tablets up, and stack on phones.
 */

function giantSizes(hero: WriterHero) {
  const solid = hero.solid.length;
  const outline = hero.outline.length;
  const desktop = Math.min(13, 80 / ((solid + outline) * 0.66 + (hero.joined ? 0 : 0.5)));
  const mobile = Math.min(26, 84 / (Math.max(solid, outline) * 0.7));
  return { "--gd": `${desktop.toFixed(2)}vw`, "--gm": `${mobile.toFixed(2)}vw` } as React.CSSProperties;
}

export function SkyHero({ hero, from, examples }: { hero: WriterHero; from: string; examples: string[] }) {
  return (
    <section data-track-section="hero" className={`relative isolate overflow-hidden ${SKY_BG}`}>
      <SkyScene eager dense />
      <div className="mx-auto flex min-h-[max(calc(100svh-var(--promo-h,0px)),640px)] max-w-6xl flex-col items-center justify-center px-5 pb-16 pt-28 text-center sm:pt-32 lg:px-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-[12.5px] font-medium tracking-[0.04em] text-white backdrop-blur-md">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#FFD400] opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-[#FFD400]" />
          </span>
          {hero.ring}
        </p>

        <h1 className="mt-6 w-full" style={giantSizes(hero)}>
          {hero.pre ? (
            <span className={`${fontSerif} block text-[clamp(24px,5.6vw,52px)] italic leading-tight text-white [text-shadow:0_2px_20px_rgba(4,24,70,0.45)]`}>
              {hero.pre}{" "}
            </span>
          ) : null}
          <span
            className={`${fontGiant} mt-1 flex flex-col items-center font-extrabold uppercase leading-[0.86] tracking-[-0.02em] text-[#FFD400] [font-size:min(var(--gm),136px)] sm:flex-row sm:justify-center sm:[font-size:min(var(--gd),184px)] ${hero.joined ? "sm:gap-0" : "sm:gap-[0.16em]"}`}
          >
            <span className="[text-shadow:0_6px_26px_rgba(4,24,70,0.4)]">{hero.solid}</span>
            {hero.joined ? null : <span className="sr-only"> </span>}
            <span className="text-transparent [-webkit-text-stroke:2px_#FFD400] sm:[-webkit-text-stroke:3px_#FFD400]">{hero.outline}</span>
          </span>
          <span className={`${fontSerif} mt-3 block text-[clamp(22px,4.6vw,40px)] italic leading-tight text-white [text-shadow:0_2px_20px_rgba(4,24,70,0.45)]`}>
            {" "}
            {hero.accent}
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-white/95 [text-shadow:0_1px_14px_rgba(4,24,70,0.5)] sm:text-[18px]">
          {hero.lede}
        </p>

        <div className="mt-8 w-full">
          <HeroSearch from={from} examples={examples} />
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
          <GoogleButton label={hero.cta} from={`${from}:hero`} size="md" />
          <a
            href="#how-it-works"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 text-[14.5px] font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
          >
            <PlayCircle className="size-4" aria-hidden />
            See it work in 5 steps
          </a>
        </div>

        <ul className="mt-7 flex flex-wrap justify-center gap-2" aria-label="Highlights">
          {hero.chips.map((chip) => (
            <li key={chip} className="inline-flex items-center gap-1.5 rounded-full bg-[#0a3d8f]/45 px-3 py-1 text-[12.5px] text-white backdrop-blur-sm">
              <span aria-hidden className="size-1.5 rounded-full bg-[#FFD400]" />
              {chip}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The closing call to action, on the same drifting sky. */
export function SkyBand({ title, body, cta, from }: { title: string; body: string; cta: string; from: string }) {
  return (
    <section data-track-section="final-cta" className={`relative isolate overflow-hidden ${SKY_BG}`}>
      <SkyScene />
      <div className="mx-auto max-w-5xl px-5 py-24 text-center lg:px-8 lg:py-32">
        <h2
          className={`${fontGiant} text-[clamp(38px,6.6vw,88px)] font-extrabold uppercase leading-[0.92] tracking-[-0.02em] text-[#FFD400] [filter:drop-shadow(0_6px_26px_rgba(4,24,70,0.4))]`}
        >
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-white [text-shadow:0_1px_12px_rgba(4,24,70,0.5)]">{body}</p>
        <div className="mt-8 flex justify-center">
          <GoogleButton label={cta} from={`${from}:end`} />
        </div>
      </div>
    </section>
  );
}
