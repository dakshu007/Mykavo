"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Ghost, Tag } from "lucide-react";
import { PLAN_PRICES_USD } from "@mykavo/shared/plan-tier";
import { track } from "@/lib/analytics";
import { campaignPlansLabel, campaignPrice, countdownParts, formatUsd, type Campaign } from "@/config/campaign";
import { PROMO_ATTR } from "@/lib/campaign-client";

/**
 * The seasonal offer bar: one slim strip across the top of the page. It goes
 * away on its own when the offer ends; on the marketing pages it has no close
 * button, in the dashboard it can be closed (closable, Dismissible). Each campaign
 * has its own look: Halloween has bats and a bobbing ghost; Black Friday has
 * falling gold sparks, a flickering sign and a pulsing price tag. Light
 * sweeps over both and the countdown ticks every second; all of that stops
 * for prefers-reduced-motion (globals.css).
 *
 * "fixed" pins it to the top of the marketing pages, in the space the <head>
 * boot script reserved. "inline" sits at the top of the dashboard.
 */
export function PromoBar({
  campaign,
  variant,
  href,
  placement,
  closable = false,
}: {
  campaign: Campaign;
  variant: "fixed" | "inline";
  href: string;
  placement: string;
  /** A close button sits at the right edge (the dashboard's Dismissible): keep content clear of it. */
  closable?: boolean;
}) {
  // Null until mounted: the server can't know the visitor's clock, and a
  // countdown rendered there would disagree with the first client render.
  const [left, setLeft] = useState<ReturnType<typeof countdownParts> | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const tick = () => setLeft(countdownParts(campaign.endsAt));
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [campaign.endsAt]);

  useEffect(() => {
    track("campaign_banner_viewed", { campaign: campaign.id, placement });
  }, [campaign.id, placement]);

  // Over: give the reserved space back and disappear.
  const over = left?.done === true;
  useEffect(() => {
    if (over && variant === "fixed") document.documentElement.removeAttribute(PROMO_ATTR);
  }, [over, variant]);
  if (over) return null;

  const pro = formatUsd(campaignPrice(PLAN_PRICES_USD.pro, campaign.percent));
  const bf = campaign.theme === "black-friday";
  const accent = bf ? "#FFCF00" : "#FF7A1A";

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(campaign.code);
      setCopied(true);
      track("campaign_code_copied", { campaign: campaign.id, placement });
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked: the code is on screen anyway.
    }
  }

  if (bf) {
    return (
      <BlackFridayBar
        campaign={campaign}
        variant={variant}
        href={href}
        placement={placement}
        closable={closable}
        left={left}
        copied={copied}
        onCopy={() => void copyCode()}
      />
    );
  }

  const position =
    variant === "fixed"
      ? // Its own compositor layer, with layout and paint contained, so the
        // ticking countdown and looping glows never repaint the page under it.
        "fixed inset-x-0 top-0 z-[60] h-[var(--promo-h,40px)] transform-gpu [contain:layout_paint]"
      : "relative mb-4 h-10 rounded-xl";

  return (
    <div
      role="region"
      aria-label={`${campaign.name} offer`}
      // Tells SmoothScroll its every-second updates never change page height.
      data-scroll-static={variant === "fixed" ? "" : undefined}
      className={`${position} overflow-hidden border-b ${bf ? "border-[#FFCF00]/40 bg-[#0B0B0B]" : "border-[#FF7A1A]/40 bg-[#151515]"} text-[#F5F5F0]`}
    >
      {/* Glow from below. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${bf ? "bg-[radial-gradient(60%_140%_at_50%_120%,rgb(255_207_0/0.22),transparent_70%)]" : "bg-[radial-gradient(60%_140%_at_50%_120%,rgb(255_122_26/0.28),transparent_70%)]"}`}
      />
      {/* A band of light sweeping across. */}
      <div
        aria-hidden
        className={`promo-shimmer pointer-events-none absolute inset-y-0 left-0 w-1/3 ${bf ? "bg-[linear-gradient(100deg,transparent,rgb(255_207_0/0.14),transparent)]" : "bg-[linear-gradient(100deg,transparent,rgb(255_154_77/0.16),transparent)]"}`}
      />
      {bf ? <Sparks /> : <Bats />}

      <div
        className={`relative mx-auto flex h-full max-w-6xl items-center justify-center gap-3 px-3 text-[13px] sm:gap-4 sm:px-5 ${closable ? "pr-10 sm:pr-10" : ""}`}
      >
        {bf ? (
          <span className="bf-stamp inline-flex h-6 shrink-0 items-center gap-1 rounded-md bg-[#FFCF00] px-1.5 font-mono text-[11px] font-black text-[#0B0B0B]">
            <Tag className="size-3" aria-hidden />-{campaign.percent}%
          </span>
        ) : (
          <span className="promo-bob inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[#FF7A1A]">
            <Ghost className="size-3.5 text-[#151515]" aria-hidden />
          </span>
        )}

        <p className="min-w-0 truncate">
          <span
            className={`hidden font-mono text-[11px] font-bold uppercase tracking-[0.16em] md:inline ${bf ? "bf-flicker text-[#FFCF00]" : "text-[#FF9A4D]"}`}
          >
            {campaign.name} sale ·{" "}
          </span>
          <span className="font-semibold">
            {campaign.percent}% off {campaignPlansLabel(campaign)}
          </span>
          <span className="hidden text-[#B8BAAE] lg:inline">
            {" "}
            · first {campaign.cycles} months, Pro {pro}/mo
          </span>
        </p>

        <Countdown left={left} />

        <button
          type="button"
          onClick={copyCode}
          style={{ borderColor: `${accent}B3`, color: bf ? "#FFE066" : "#FFB27A" }}
          className="hidden shrink-0 items-center gap-1.5 rounded-md border border-dashed px-2 py-0.5 font-mono text-[12px] font-bold tracking-wider transition-colors hover:bg-white/5 md:inline-flex"
          aria-label={`Copy code ${campaign.code}`}
        >
          {campaign.code}
          {copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3 opacity-70" aria-hidden />}
        </button>

        <Link
          href={href}
          onClick={() => track("campaign_banner_clicked", { campaign: campaign.id, placement })}
          className={`${bf ? "bf-glow bg-[#FFCF00] hover:bg-[#ffdb3d] text-[#0B0B0B]" : "promo-glow bg-[#FF7A1A] hover:bg-[#ff9447] text-[#151515]"} inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[12.5px] font-semibold transition-colors`}
        >
          <span className="hidden sm:inline">{bf ? "Get the deal" : "Claim offer"}</span>
          <span className="sm:hidden">{bf ? "Deal" : "Claim"}</span>
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

/** Halloween: bats cross the bar, each on its own pace and delay. */
function Bats() {
  return (
    <>
      {[
        { fly: "13s", delay: "0s", top: "5px", size: 22 },
        { fly: "19s", delay: "-7s", top: "17px", size: 15 },
        { fly: "23s", delay: "-15s", top: "2px", size: 18 },
      ].map((b, i) => (
        <span
          key={i}
          aria-hidden
          className="promo-bat pointer-events-none absolute left-0 text-[#FF9A4D]/80"
          style={{ top: b.top, ["--fly" as string]: b.fly, ["--delay" as string]: b.delay }}
        >
          <svg viewBox="0 0 24 12" width={b.size} height={b.size / 2} className="promo-flap" fill="currentColor">
            <path d="M12 4.2c-.5-1.4-1.3-2.3-2.2-2.5.3.8.2 1.5-.2 2C8.5 2.6 6.3 1.4 3.5 2 1.9 2.4.7 3.5 0 5c1.5-.6 2.9-.5 3.8.3.6-.8 1.6-1 2.4-.4.5-.6 1.4-.6 2 .1.6-.4 1.3-.2 1.6.4.3.7.6 1.8 1.1 2.7h2.2c.5-.9.8-2 1.1-2.7.3-.6 1-.8 1.6-.4.6-.7 1.5-.7 2-.1.8-.6 1.8-.4 2.4.4.9-.8 2.3-.9 3.8-.3-.7-1.5-1.9-2.6-3.5-3-2.8-.6-5 .6-6.1 1.7-.4-.5-.5-1.2-.2-2-.9.2-1.7 1.1-2.2 2.5z" />
          </svg>
        </span>
      ))}
    </>
  );
}

/** Black Friday: gold sparks drifting down across the bar. */
const SPARKS = [
  { left: "6%", fall: "2.4s", delay: "0s", size: 3 },
  { left: "14%", fall: "3.1s", delay: "-1.2s", size: 2 },
  { left: "27%", fall: "2.7s", delay: "-0.6s", size: 2 },
  { left: "41%", fall: "3.4s", delay: "-2.1s", size: 3 },
  { left: "58%", fall: "2.5s", delay: "-1.6s", size: 2 },
  { left: "71%", fall: "3s", delay: "-0.3s", size: 3 },
  { left: "84%", fall: "2.8s", delay: "-2.4s", size: 2 },
  { left: "93%", fall: "3.3s", delay: "-1s", size: 3 },
];

function Sparks() {
  return (
    <>
      {SPARKS.map((sp, i) => (
        <span
          key={i}
          aria-hidden
          className="bf-spark pointer-events-none absolute top-0 rounded-full bg-[#FFCF00] shadow-[0_0_6px_1px_rgb(255_207_0/0.6)]"
          style={{ left: sp.left, width: sp.size, height: sp.size, ["--fall" as string]: sp.fall, ["--delay" as string]: sp.delay }}
        />
      ))}
    </>
  );
}

function Countdown({ left }: { left: ReturnType<typeof countdownParts> | null }) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const units: [string, string][] = left
    ? [
        [String(left.days), "d"],
        [pad(left.hours), "h"],
        [pad(left.minutes), "m"],
        [pad(left.seconds), "s"],
      ]
    : [
        ["--", "d"],
        ["--", "h"],
        ["--", "m"],
        ["--", "s"],
      ];
  return (
    <span className="flex shrink-0 items-center gap-1 font-mono tabular-nums" aria-label="Time left">
      <span className="mr-0.5 hidden text-[11px] uppercase tracking-wider text-[#9C9E93] sm:inline">Ends in</span>
      {units.map(([value, unit], i) => (
        <span
          key={unit}
          // Seconds are hidden on the narrowest screens to keep one line.
          className={`items-baseline rounded bg-white/[0.08] px-1 py-0.5 text-[12px] font-semibold ${i === 3 ? "hidden min-[400px]:inline-flex" : "inline-flex"}`}
        >
          {/* Keyed by value: each change re-mounts the digit and replays the tick. */}
          <span key={value} className={i === 3 ? "promo-tick inline-block" : "inline-block"}>
            {value}
          </span>
          <span className="ml-px text-[10px] text-[#9C9E93]">{unit}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * Black Friday: a strip of gold sale tape. Foil light sweeps across it and
 * faint tape stripes slide by; a black tag is cut into its left edge; the
 * old price gets struck through in red before the new one pops in; the
 * countdown ticks on black tiles. Every loop stops for reduced motion
 * (globals.css, "bfx-").
 */
function BlackFridayBar({
  campaign,
  variant,
  href,
  placement,
  closable,
  left,
  copied,
  onCopy,
}: {
  campaign: Campaign;
  variant: "fixed" | "inline";
  href: string;
  placement: string;
  closable: boolean;
  left: ReturnType<typeof countdownParts> | null;
  copied: boolean;
  onCopy: () => void;
}) {
  const regular = PLAN_PRICES_USD.pro;
  const offer = formatUsd(campaignPrice(regular, campaign.percent));
  const position =
    variant === "fixed"
      ? "fixed inset-x-0 top-0 z-[60] h-[var(--promo-h,40px)] transform-gpu [contain:layout_paint]"
      : "relative mb-4 h-10 rounded-xl border-[1.5px]";
  const pad = (n: number) => String(n).padStart(2, "0");
  const tiles: [string, string][] = left
    ? [
        [String(left.days), "d"],
        [pad(left.hours), "h"],
        [pad(left.minutes), "m"],
        [pad(left.seconds), "s"],
      ]
    : [
        ["--", "d"],
        ["--", "h"],
        ["--", "m"],
        ["--", "s"],
      ];

  return (
    <div
      role="region"
      aria-label={`${campaign.name} offer`}
      data-scroll-static={variant === "fixed" ? "" : undefined}
      className={`${position} bfx-foil overflow-hidden border-b-2 border-[#0B0B0B] text-[#0B0B0B]`}
    >
      {/* Sale tape stripes sliding by. */}
      <div aria-hidden className="bfx-tape pointer-events-none absolute inset-0 opacity-[0.07]" />
      {/* A bright band of foil light. */}
      <div
        aria-hidden
        className="promo-shimmer pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-[linear-gradient(100deg,transparent,rgb(255_255_255/0.55),transparent)]"
      />

      {/* The tag cut into the left edge. */}
      <div
        className="absolute inset-y-0 left-0 flex items-center gap-2 bg-[#0B0B0B] pl-3 pr-6 text-[#FFD400] [clip-path:polygon(0_0,100%_0,calc(100%-14px)_100%,0_100%)] sm:pl-4 sm:pr-8"
      >
        <span className="bfx-live size-1.5 rounded-full bg-[#FF3B30]" aria-hidden />
        <span className="hidden font-mono text-[11px] font-black uppercase tracking-[0.18em] sm:inline">Black Friday</span>
        <span className="font-mono text-[12px] font-black text-white">-{campaign.percent}%</span>
      </div>

      <div
        className={`relative mx-auto flex h-full max-w-6xl items-center justify-center gap-2.5 pl-[84px] pr-3 text-[13px] sm:gap-4 sm:pl-[200px] md:pl-4 ${closable ? "pr-10 sm:pr-10" : "sm:pr-5"}`}
      >
        <p className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
          <span className="font-semibold">{campaignPlansLabel(campaign)}</span>
          <span className="relative hidden font-semibold text-[#0B0B0B]/55 min-[420px]:inline">
            ${regular}
            <span aria-hidden className="bfx-strike absolute left-[-2px] right-[-2px] top-1/2 h-[2px] rounded bg-[#E0251B]" />
          </span>
          <span>
            <span className="bfx-pop inline-block text-[16px] font-black tracking-tight">{offer}</span>
            <span className="font-semibold">/mo</span>
          </span>
          <span className="hidden text-[12px] font-medium text-[#0B0B0B]/70 lg:inline">
            · first {campaign.cycles} months
          </span>
        </p>

        <span className="flex shrink-0 items-center gap-0.5 font-mono tabular-nums" aria-label="Time left">
          {tiles.map(([value, unit], i) => (
            <span
              key={unit}
              className={`items-baseline rounded-[5px] bg-[#0B0B0B] px-1 py-0.5 text-[12px] font-bold text-[#FFD400] shadow-[inset_0_-1px_0_rgb(255_255_255/0.12)] ${i === 3 ? "hidden sm:inline-flex" : "inline-flex"}`}
            >
              <span key={value} className={i === 3 ? "promo-tick inline-block" : "inline-block"}>
                {value}
              </span>
              <span className="ml-px text-[9.5px] text-[#FFD400]/60">{unit}</span>
            </span>
          ))}
        </span>

        <button
          type="button"
          onClick={onCopy}
          className="hidden shrink-0 items-center gap-1.5 rounded-md border-[1.5px] border-dashed border-[#0B0B0B]/70 bg-white/40 px-2 py-0.5 font-mono text-[11.5px] font-bold tracking-wider transition-colors hover:bg-white/70 md:inline-flex"
          aria-label={`Copy code ${campaign.code}`}
        >
          {campaign.code}
          {copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3 opacity-70" aria-hidden />}
        </button>

        <Link
          href={href}
          onClick={() => track("campaign_banner_clicked", { campaign: campaign.id, placement })}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#0B0B0B] px-3 py-1 text-[12.5px] font-bold text-[#FFD400] shadow-[0_2px_0_rgb(0_0_0/0.35)] transition-[transform,box-shadow] duration-150 hover:translate-y-[2px] hover:shadow-none motion-reduce:transition-none"
        >
          <span className="hidden sm:inline">Claim {campaign.percent}% off</span>
          <span className="sm:hidden">Claim</span>
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
