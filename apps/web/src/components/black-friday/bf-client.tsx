"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy } from "lucide-react";
import { track } from "@/lib/analytics";
import { countdownParts, nextCampaign, type Campaign } from "@/config/campaign";
import { useLiveCampaign } from "@/lib/campaign-client";
import {
  bfClaimHref,
  isBfSection,
  type BfSection,
} from "@/lib/black-friday-tracking";

/* ------------------------------------------------------------------ phase */

export type BfPhase = "upcoming" | "live" | "paused" | "ended";

export interface BfState {
  phase: BfPhase;
  /** What the countdown counts to: the start, or the end. */
  target: Date | null;
  campaign: Campaign | null;
}

/**
 * Where Black Friday stands for this visitor: before it (count down to the
 * start), during it (count down to the end, which Dodo may bring forward),
 * or paused (the calendar says on but the code isn't live in Dodo). Null
 * until mounted: the server can't know the visitor's clock.
 */
export function useBlackFriday(): BfState | null {
  const live = useLiveCampaign();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const first = window.setTimeout(() => setNow(new Date()), 0);
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, []);
  if (!now) return null;
  const c = nextCampaign("black-friday", now);
  if (!c) return { phase: "ended", target: null, campaign: null };
  if (now < c.startsAt)
    return { phase: "upcoming", target: c.startsAt, campaign: c };
  if (live === undefined)
    return { phase: "live", target: c.endsAt, campaign: c };
  if (live && live.theme === "black-friday")
    return { phase: "live", target: live.endsAt, campaign: live };
  return { phase: "paused", target: null, campaign: c };
}

/* --------------------------------------------------------------- tracking */

/**
 * Fires `bf_section_viewed` once per section, the first time at least a
 * third of it is on screen. Sections opt in with `data-bf-section`.
 */
export function BfSectionTracker() {
  useEffect(() => {
    const seen = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const section = (e.target as HTMLElement).dataset.bfSection;
          if (!e.isIntersecting || !isBfSection(section) || seen.has(section))
            continue;
          seen.add(section);
          track("bf_section_viewed", { section, campaign: "black-friday" });
          io.unobserve(e.target);
        }
      },
      { threshold: 0.33 },
    );
    document
      .querySelectorAll<HTMLElement>("[data-bf-section]")
      .forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}

/** A button-styled link that reports which section it was clicked in. */
export function BfLink({
  section,
  href,
  label,
  className,
  children,
}: {
  section: BfSection;
  /** Defaults to the signup link tagged with this section. */
  href?: string;
  /** What the click is reported as; defaults to the link's own text. */
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const to = href ?? bfClaimHref(section);
  const onClick = () =>
    track("bf_cta_clicked", {
      section,
      campaign: "black-friday",
      target: to.startsWith("#") ? "anchor" : "signup",
      label,
    });
  if (to.startsWith("#")) {
    return (
      <a href={to} onClick={onClick} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={to} onClick={onClick} className={className}>
      {children}
    </Link>
  );
}

/* -------------------------------------------------------------- countdown */

/** Countdown tiles; each digit flips in when it changes. */
export function BfCountdown({
  target,
  label,
  compact = false,
}: {
  target: Date | null;
  label: string;
  compact?: boolean;
}) {
  const [left, setLeft] = useState<ReturnType<typeof countdownParts> | null>(
    null,
  );
  useEffect(() => {
    if (!target) return;
    const tick = () => setLeft(countdownParts(target));
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [target]);
  const pad = (n: number) => String(n).padStart(2, "0");
  const units: [string, string][] = [
    [left ? pad(left.days) : "--", "Days"],
    [left ? pad(left.hours) : "--", "Hours"],
    [left ? pad(left.minutes) : "--", "Min"],
    [left ? pad(left.seconds) : "--", "Sec"],
  ];
  return (
    <div role="timer" aria-label={label}>
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-[#8C877A]">
        {label}
      </p>
      <div
        className={`mt-3 grid grid-cols-4 gap-2 sm:flex ${compact ? "" : "sm:gap-2.5"}`}
        style={{ perspective: 600 }}
      >
        {units.map(([v, u]) => (
          <div
            key={u}
            className="rounded-[18px] border border-[#262626] bg-[linear-gradient(180deg,#161616,#0C0C0C)] px-1 pb-2.5 pt-3.5 text-center sm:w-[84px]"
          >
            <span
              key={v}
              className="bfp-flip block font-mono text-[26px] font-bold leading-none tabular-nums text-[#F5F2E8] sm:text-[32px]"
            >
              {v}
            </span>
            <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-[#8C877A]">
              {u}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The hero's buttons and countdown, which change with the sale's phase. */
export function BfHeroStatus() {
  const s = useBlackFriday();
  const label =
    s?.phase === "upcoming"
      ? "Black Friday starts in"
      : s?.phase === "live"
        ? "Deal ends in"
        : "Loading the deal";
  return (
    <div className="flex flex-col gap-9">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <BfLink
          section="hero"
          label="claim"
          className="bfp-shine inline-flex h-[58px] items-center justify-center gap-2.5 rounded-full bg-[#FFCF00] px-7 text-[17px] font-bold text-[#0A0A0A] shadow-[0_18px_50px_rgba(255,207,0,0.28)] transition-transform hover:-translate-y-0.5 motion-reduce:transition-none"
        >
          {s?.phase === "upcoming"
            ? "Start free, save when it opens"
            : "Claim 50% off Pro"}
          <ArrowRight className="size-[18px]" strokeWidth={2.6} aria-hidden />
        </BfLink>
        <BfLink
          section="hero"
          href="#inside"
          label="see_inside"
          className="inline-flex h-[58px] items-center justify-center rounded-full border border-[#2E2E2E] px-6 text-[16px] font-medium text-[#F5F2E8] transition-colors hover:border-[#FFCF00]/50"
        >
          See what&apos;s inside
        </BfLink>
      </div>
      {s?.phase === "upcoming" || s?.phase === "live" || s === null ? (
        <BfCountdown target={s?.target ?? null} label={label} />
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- reveal */

/** Adds `bfp-in` the first time the element scrolls into view. */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("bfp-in");
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`bfp-reveal ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ code */

/** The golden ticket's code with a copy button. */
export function BfCopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      track("campaign_code_copied", {
        campaign: "black-friday",
        placement: "bf_code",
        section: "code",
      });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked: the code is on screen to type.
    }
  }
  return (
    <div className="flex max-w-[460px] flex-col overflow-hidden rounded-[20px] border-2 border-dashed border-[#FFCF00]/60 min-[420px]:flex-row">
      <span className="flex min-h-16 flex-1 items-center justify-center bg-[#FFCF00]/[0.06] px-5 font-mono text-[22px] font-bold tracking-[0.12em] text-[#FFCF00] min-[420px]:justify-start">
        {code}
      </span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex min-h-16 items-center justify-center gap-2 bg-[#FFCF00] px-6 text-[16px] font-bold text-[#0A0A0A]"
      >
        {copied ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
        {copied ? "Copied!" : "Copy code"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------- faq */

/** One question; reports the first time it is opened. */
export function BfFaqItem({
  q,
  a,
  index,
}: {
  q: string;
  a: string;
  index: number;
}) {
  const reported = useRef(false);
  return (
    <details
      className="group rounded-[22px] border border-[#222] bg-[#0B0B0B] open:border-[#FFCF00]/30"
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open && !reported.current) {
          reported.current = true;
          track("bf_faq_opened", {
            section: "faq",
            campaign: "black-friday",
            question: index + 1,
          });
        }
      }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-[17px] font-bold text-[#F5F2E8] [&::-webkit-details-marker]:hidden">
        {q}
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full border border-[#333] text-[20px] transition-transform group-open:rotate-45 group-open:border-transparent group-open:bg-[#FFCF00] group-open:text-[#0A0A0A] motion-reduce:transition-none"
        >
          +
        </span>
      </summary>
      <p className="px-6 pb-6 text-[15.5px] leading-7 text-[#B9B4A6]">{a}</p>
    </details>
  );
}
