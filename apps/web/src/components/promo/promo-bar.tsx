"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Ghost } from "lucide-react";
import { PLAN_PRICES_USD } from "@mykavo/shared/plan-tier";
import { track } from "@/lib/analytics";
import { campaignPrice, countdownParts, formatUsd, type Campaign } from "@/config/campaign";
import { PROMO_ATTR } from "@/lib/campaign-client";

/**
 * The seasonal offer bar: one slim strip across the top of the page, with no
 * close button - it goes away on its own when the offer ends. Bats cross it,
 * a ghost bobs, light sweeps over it and the countdown ticks every second;
 * all of that stops for prefers-reduced-motion (globals.css).
 *
 * "fixed" pins it to the top of the marketing pages, in the space the <head>
 * boot script reserved. "inline" sits at the top of the dashboard.
 */
export function PromoBar({
  campaign,
  variant,
  href,
  placement,
}: {
  campaign: Campaign;
  variant: "fixed" | "inline";
  href: string;
  placement: string;
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

  const position =
    variant === "fixed" ? "fixed inset-x-0 top-0 z-[60] h-[var(--promo-h,40px)]" : "relative mb-4 h-10 rounded-xl";

  return (
    <div
      role="region"
      aria-label={`${campaign.name} offer`}
      className={`${position} overflow-hidden border-b border-[#FF7A1A]/40 bg-[#151515] text-[#F5F5F0]`}
    >
      {/* Glow from below, like a lantern on the floor. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_140%_at_50%_120%,rgb(255_122_26/0.28),transparent_70%)]"
      />
      {/* A band of light sweeping across. */}
      <div
        aria-hidden
        className="promo-shimmer pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-[linear-gradient(100deg,transparent,rgb(255_154_77/0.16),transparent)]"
      />
      {/* Bats, each on its own pace and delay. */}
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

      <div className="relative mx-auto flex h-full max-w-6xl items-center justify-center gap-3 px-3 text-[13px] sm:gap-4 sm:px-5">
        <span className="promo-bob inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[#FF7A1A]">
          <Ghost className="size-3.5 text-[#151515]" aria-hidden />
        </span>

        <p className="min-w-0 truncate">
          <span className="hidden font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#FF9A4D] md:inline">
            {campaign.name} sale ·{" "}
          </span>
          <span className="font-semibold">{campaign.percent}% off Pro</span>
          <span className="hidden sm:inline"> &amp; Agency</span>
          <span className="hidden text-[#B8BAAE] lg:inline">
            {" "}
            · first {campaign.cycles} months, Pro {pro}/mo
          </span>
        </p>

        <Countdown left={left} />

        <button
          type="button"
          onClick={copyCode}
          className="hidden shrink-0 items-center gap-1.5 rounded-md border border-dashed border-[#FF7A1A]/70 px-2 py-0.5 font-mono text-[12px] font-bold tracking-wider text-[#FFB27A] transition-colors hover:bg-[#FF7A1A]/10 md:inline-flex"
          aria-label={`Copy code ${campaign.code}`}
        >
          {campaign.code}
          {copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3 opacity-70" aria-hidden />}
        </button>

        <Link
          href={href}
          onClick={() => track("campaign_banner_clicked", { campaign: campaign.id, placement })}
          className="promo-glow inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FF7A1A] px-3 py-1 text-[12.5px] font-semibold text-[#151515] transition-colors hover:bg-[#ff9447]"
        >
          <span className="hidden sm:inline">Claim offer</span>
          <span className="sm:hidden">Claim</span>
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </div>
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
