"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Copy, Sparkles } from "lucide-react";
import { track } from "@/lib/analytics";
import { countdownParts, nextCampaign, type Campaign } from "@/config/campaign";
import { useLiveCampaign } from "@/lib/campaign-client";

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
  if (now < c.startsAt) return { phase: "upcoming", target: c.startsAt, campaign: c };
  if (live === undefined) return { phase: "live", target: c.endsAt, campaign: c };
  if (live && live.theme === "black-friday") return { phase: "live", target: live.endsAt, campaign: live };
  return { phase: "paused", target: null, campaign: c };
}

/* -------------------------------------------------------------- countdown */

/** Big countdown: each digit flips in when it changes. */
export function BfCountdown({ target, label }: { target: Date | null; label: string }) {
  const [left, setLeft] = useState<ReturnType<typeof countdownParts> | null>(null);
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
  const units: [string, string][] = left
    ? [
        [pad(left.days), "Days"],
        [pad(left.hours), "Hours"],
        [pad(left.minutes), "Min"],
        [pad(left.seconds), "Sec"],
      ]
    : [
        ["--", "Days"],
        ["--", "Hours"],
        ["--", "Min"],
        ["--", "Sec"],
      ];
  return (
    <div aria-label={label}>
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-[#FFCF00]">{label}</p>
      <div className="mt-3 flex gap-2.5 sm:gap-3" style={{ perspective: 600 }}>
        {units.map(([v, u]) => (
          <div
            key={u}
            className="relative w-[68px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] px-2 pb-2 pt-3 text-center backdrop-blur sm:w-20"
          >
            <span key={v} className="bfp-flip block font-mono text-[30px] font-bold tabular-nums leading-none text-white sm:text-[36px]">
              {v}
            </span>
            <span className="mt-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">{u}</span>
            <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-black/40" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- reveal */

/** Adds `bfp-in` the first time the element scrolls into view. */
export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
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
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`bfp-reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------- ticket */

/** The golden ticket: floats, catches the light, and tilts toward the pointer. */
export function TiltTicket() {
  const ref = useRef<HTMLDivElement>(null);
  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${x * 18}deg) rotateX(${-y * 14}deg)`;
  }
  function onLeave() {
    if (ref.current) ref.current.style.transform = "";
  }
  return (
    <div className="bfp-float [--r:-6deg]" style={{ perspective: 1200 }}>
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="relative transition-transform duration-200 ease-out [transform-style:preserve-3d]"
      >
        <Image
          src="/black-friday/ticket.webp"
          alt="MyKavo Pro Black Friday ticket: 50% off, code BLACKFRIDAY50, valid to December 15"
          width={1200}
          height={640}
          priority
          className="h-auto w-full drop-shadow-[0_40px_60px_rgba(255,207,0,0.25)]"
        />
        {/* A glint of light crossing the foil. */}
        <div aria-hidden className="pointer-events-none absolute inset-[6%] overflow-hidden rounded-[28px]">
          <div className="bfp-glint absolute inset-y-0 left-0 w-1/4 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)]" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ price slash */

/** $20 gets struck through and $10 drops in, when it scrolls into view. */
export function PriceSlash({ regular, offer }: { regular: number; offer: number }) {
  return (
    <Reveal className="flex items-end justify-center gap-6 sm:gap-10">
      <span className="bfp-old relative inline-block font-[family-name:var(--font-poppins)] text-[88px] font-bold leading-none tracking-[-0.05em] text-white/80 sm:text-[150px]">
        ${regular}
        <span
          aria-hidden
          className="bfp-slash-line absolute left-[-6%] top-1/2 h-[10px] w-[112%] origin-left -rotate-12 rounded-full bg-[#FF4D4D] shadow-[0_0_24px_rgba(255,77,77,0.7)]"
        />
      </span>
      <span className="bfp-new inline-block font-[family-name:var(--font-poppins)] text-[120px] font-black leading-none tracking-[-0.06em] text-[#FFCF00] drop-shadow-[0_0_40px_rgba(255,207,0,0.45)] sm:text-[220px]">
        ${offer}
      </span>
    </Reveal>
  );
}

/* ---------------------------------------------------------- scratch card */

/**
 * Scratch the gold foil to reveal the code. The foil is a canvas; once
 * enough of it is scratched off (or the Reveal button is pressed, for
 * keyboards and screen readers) it fades away.
 */
export function ScratchCode({ code }: { code: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.scale(dpr, dpr);
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, "#fff2a8");
    g.addColorStop(0.35, "#f2b705");
    g.addColorStop(0.6, "#ffe27a");
    g.addColorStop(1, "#c99300");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (let x = -height; x < width; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x + height, 0);
      ctx.lineTo(x + height + 3, 0);
      ctx.lineTo(x + 3, height);
      ctx.fill();
    }
    ctx.fillStyle = "#0B0B0B";
    ctx.font = "700 15px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText(width < 380 ? "SCRATCH TO REVEAL" : "SCRATCH HERE TO REVEAL YOUR CODE", width / 2, height / 2 + 5);
  }, []);

  function scratch(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || revealed) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const r = canvas.getBoundingClientRect();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(e.clientX - r.left, e.clientY - r.top, 26, 0, Math.PI * 2);
    ctx.fill();
    // Sample how much foil is left, every few strokes.
    if (Math.random() < 0.15) {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let clear = 0;
      for (let i = 3; i < data.length; i += 64) if (data[i] === 0) clear++;
      if (clear / (data.length / 64) > 0.45) reveal();
    }
  }

  function reveal() {
    if (revealed) return;
    setRevealed(true);
    track("campaign_code_copied", { campaign: "black-friday", placement: "scratch_reveal" });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      track("campaign_code_copied", { campaign: "black-friday", placement: "scratch_card" });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked: the code is on screen.
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="relative h-28 overflow-hidden rounded-2xl border-2 border-dashed border-[#FFCF00]/70 bg-[#0B0B0B]">
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/50">Your code</span>
          <span className="mt-1 font-mono text-3xl font-black tracking-[0.06em] text-[#FFCF00]">{code}</span>
        </div>
        <canvas
          ref={canvasRef}
          aria-hidden
          onPointerDown={(e) => {
            drawing.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            scratch(e);
          }}
          onPointerMove={scratch}
          onPointerUp={() => (drawing.current = false)}
          className={`absolute inset-0 size-full cursor-grab touch-none transition-opacity duration-500 ${revealed ? "pointer-events-none opacity-0" : "opacity-100"}`}
        />
      </div>
      <div className="mt-4 flex justify-center gap-3">
        {!revealed ? (
          <button
            type="button"
            onClick={reveal}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-white/10"
          >
            <Sparkles className="size-4" aria-hidden /> Reveal the code
          </button>
        ) : (
          <button
            type="button"
            onClick={copy}
            className="bf-glow inline-flex items-center gap-2 rounded-full bg-[#FFCF00] px-5 py-2.5 text-[14px] font-bold text-[#0B0B0B]"
          >
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? "Copied" : `Copy ${code}`}
          </button>
        )}
      </div>
      <p className="mt-3 text-center text-[13px] text-white/50">
        You won&apos;t need to type it: checkout applies it for you on monthly Pro.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ hero state */

/** The hero's countdown and call to action, which change with the phase. */
export function BfHeroStatus({ claimHref }: { claimHref: string }) {
  const s = useBlackFriday();
  const label =
    s?.phase === "upcoming"
      ? "Black Friday starts in"
      : s?.phase === "live"
        ? "Deal ends in"
        : s?.phase === "paused"
          ? "The deal opens shortly"
          : "Loading the deal";
  return (
    <div className="flex flex-col gap-7">
      {s?.phase !== "paused" && <BfCountdown target={s?.target ?? null} label={label} />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href={claimHref}
          onClick={() => track("campaign_banner_clicked", { campaign: "black-friday", placement: "bf_hero" })}
          className="bf-glow group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#FFCF00] px-8 text-[16px] font-bold text-[#0B0B0B] transition-transform hover:-translate-y-0.5 motion-reduce:transition-none"
        >
          {s?.phase === "upcoming" ? "Start free now, save when it opens" : "Claim 50% off Pro"}
          <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden />
        </Link>
        <a href="#deal" className="inline-flex h-14 items-center justify-center rounded-full border border-white/20 px-7 text-[15px] font-semibold text-white hover:bg-white/10">
          See the deal
        </a>
      </div>
    </div>
  );
}
