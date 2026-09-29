"use client";

import type { CSSProperties, ReactNode } from "react";
import { Bell, Check, Globe, Mail, RotateCw, Smartphone, X } from "lucide-react";
import { SlackIcon } from "@/components/brand/integration-icons";
import { stageClip, useStageClock } from "./use-stage-clock";

/**
 * The hero animation: how MyKavo works, in one loop.
 *
 *   1 Baseline - the live page is snapshotted; the approved copy slides out
 *                beside it and five signals are wired to it
 *   2 Scan     - a deploy quietly breaks the live page; the scan beam runs
 *   3 Compare  - each signal is wired to the live page too: two match,
 *                three turn red
 *   4 Alert    - one grouped alert, ranked by severity, to every channel
 *   5 Resolve  - "Fixed - rescan": the page is repaired, the beam sweeps
 *                again and every signal goes green
 *
 * On wide screens the signals sit on a spine between the Baseline and Live
 * pages, threaded to the element each one reads. Phones get the live page
 * with the signals listed under it - the same frames, nothing shrunk past
 * readable.
 *
 * Same stage approach as the other homepage animations (use-stage-clock.ts):
 * every frame is a pure function of `t`, drawn on a fixed stage scaled to
 * fit, running only while on screen. Reduced motion shows the compared
 * moment as a still.
 */

const GOLD = "#FFD400";
const INK = "#151515";
const PAPER = "#FBFAF3";
const MUTED = "#6B6B60";
const RED = "#E5484D";
/** Red dark enough for white text on it (WCAG AA). */
const RED_INK = "#C4262C";
const GREEN = "#16A34A";
const MONO = "var(--font-geist-mono), ui-monospace, monospace";

/** The product page cards, in stage pixels. */
const CARD_W = 330;
const CARD_H = 400;

export const HERO_CYCLE = 16;
/** Shown until the clock starts (after page load): the approved baseline, wired up. */
const FIRST_FRAME_T = 3.0;
/** Reduced-motion still: the comparison, with the three changes it found. */
const STILL_T = 8.5;

const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const r = (x: number, a: number, b: number) => cl((x - a) / (b - a));
const ease = (x: number, a: number, b: number) => 1 - Math.pow(1 - r(x, a, b), 3);
const bell = (x: number, a: number, b: number) => Math.sin(Math.PI * r(x, a, b));
const pop = (x: number, a: number, b: number) => {
  const p = r(x, a, b);
  if (p <= 0) return 0;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};
/** Visible between a and b, fading over `f` seconds at each end. */
const span = (x: number, a: number, b: number, f = 0.3) => Math.min(r(x, a, a + f), 1 - r(x, b - f, b));

export const STEPS = ["Baseline", "Scan", "Compare", "Alert", "Resolve"] as const;
const BOUNDS = [0, 3.2, 5.6, 8.9, 12.3, HERO_CYCLE];

const CAPTIONS: Array<{ title: string; sub: string }> = [
  { title: "Save what good looks like.", sub: "MyKavo snapshots your page as an approved baseline." },
  { title: "A deploy quietly breaks it.", sub: "The next scan runs on the live page - same browser, same viewport." },
  { title: "Every signal, checked against the baseline.", sub: "Most match. Three don't - and you see exactly which." },
  { title: "One alert. Ranked by severity.", sub: "Email, Slack or push - with before-and-after proof." },
  { title: "Fix it, rescan, all clear.", sub: "Or approve the change as the new baseline." },
];

export type SignalState = "hidden" | "captured" | "match" | "changed";

/** The five signals, with where each one sits on the page (card coordinates). */
const SIGNALS: Array<{ label: string; base: string; now?: string; y: number }> = [
  { label: "HTTP status", base: "200 OK", y: 20 },
  { label: "Screenshot", base: "0% diff", now: "4.2% diff", y: 114 },
  { label: "Title tag", base: "Trail Tent 2P", y: 205 },
  { label: "Add to cart", base: "visible", now: "missing", y: 278 },
  { label: "Robots meta", base: "index", now: "noindex", y: 378 },
];

const ALERTS = [
  { sev: "CRITICAL", title: "Page set to noindex", meta: "robots: index → noindex" },
  { sev: "CRITICAL", title: "“Add to cart” button missing", meta: "conversion element" },
  { sev: "MEDIUM", title: "Visual change on /tents", meta: "4.2% of the page" },
];

/** Everything the scene needs for one moment. */
export function heroFrameAt(t: number) {
  const u = ((t % HERO_CYCLE) + HERO_CYCLE) % HERO_CYCLE;
  let step = 0;
  for (let i = 0; i < 5; i++) if (u >= BOUNDS[i]) step = i;
  const stepP = r(u, BOUNDS[step], BOUNDS[step + 1]);

  // The deploy breaks the page just before the scan; the fix lands before the rescan.
  const broken = r(u, 3.4, 3.65) * (1 - r(u, 13.35, 13.6));

  const items = SIGNALS.map((s, i) => {
    const capturedAt = 2.1 + i * 0.13;
    const comparedAt = 5.8 + i * 0.42;
    // Cleared the moment the rescan beam passes the element it reads.
    const clearedAt = 13.65 + cl((s.y - 40) / (CARD_H - 40)) * 1.1;
    const state: SignalState =
      u < capturedAt ? "hidden" : u >= clearedAt ? "match" : u >= comparedAt + 0.3 ? (s.now ? "changed" : "match") : "captured";
    return {
      ...s,
      state,
      /** Node / row entrance. */
      o: pop(u, capturedAt, capturedAt + 0.35),
      /** Thread from the baseline page, drawn at capture. */
      left: ease(u, capturedAt - 0.15, capturedAt + 0.2),
      /** Thread from the live page, drawn at compare. */
      right: ease(u, comparedAt, comparedAt + 0.35),
      /** Red flash as a change is found. */
      flash: s.now ? bell(u, comparedAt + 0.3, comparedAt + 0.9) : 0,
    };
  });

  const alerts = ALERTS.map((a, i) => ({
    ...a,
    o: ease(u, 9.45 + i * 0.22, 9.85 + i * 0.22),
    x: (1 - ease(u, 9.45 + i * 0.22, 9.95 + i * 0.22)) * 30,
  }));

  const channels = ["Email", "Slack", "Push"].map((name, i) => ({
    name,
    s: pop(u, 10.4 + i * 0.28, 10.8 + i * 0.28),
    sent: u >= 10.6 + i * 0.28,
    ring: r(u, 10.6 + i * 0.28, 11.5 + i * 0.28),
  }));

  // The first scan and the rescan share one beam.
  const scan = { y: r(u, 3.95, 5.4), o: span(u, 3.9, 5.5, 0.2) };
  const rescan = { y: r(u, 13.65, 14.75), o: span(u, 13.6, 14.95, 0.2) };
  const beam = rescan.o > 0 ? rescan : scan;

  return {
    u,
    step,
    stepP,
    caption: CAPTIONS[step],
    captionIn: ease(u, BOUNDS[step], BOUNDS[step] + 0.5),
    fade: Math.min(r(u, 0, 0.35), 1 - r(u, HERO_CYCLE - 0.45, HERO_CYCLE)),
    /** Slow 0..1 wave for "live" pulses. */
    pulse: 0.5 + 0.5 * Math.sin((u * 2 * Math.PI) / 1.3),
    // Live page: builds in, gets photographed.
    build: [0, 1, 2, 3, 4].map((i) => ease(u, 0.15 + i * 0.13, 0.55 + i * 0.13)),
    flash: bell(u, 1.0, 1.35) * 0.85,
    // Baseline copy slides out of the live page into its own slot.
    baselineP: ease(u, 1.25, 2.05),
    baselineO: r(u, 1.2, 1.35),
    stamp: pop(u, 1.95, 2.35),
    deployChip: pop(u, 3.1, 3.4) * (1 - r(u, 5.1, 5.4)),
    fixChip: pop(u, 13.2, 13.5) * (1 - r(u, 14.7, 15.0)),
    broken,
    /** The button bursting apart as the deploy breaks it: 0 before, 1 when done. */
    burst: r(u, 3.4, 4.0),
    beam,
    items,
    // Alert.
    dim: ease(u, 8.95, 9.35) * (1 - ease(u, 13.15, 13.55)),
    sheetO: span(u, 9.0, 13.35, 0.3),
    sheetY: (1 - ease(u, 9.0, 9.55)) * 36 + ease(u, 13.05, 13.35) * 24,
    alerts,
    channels,
    groupedO: ease(u, 11.4, 11.8),
    cur: { o: span(u, 12.35, 13.3, 0.2), p: ease(u, 12.35, 12.9), click: bell(u, 12.9, 13.2) },
    // Status line under the signals.
    counter: pop(u, 8.0, 8.35),
    clearS: pop(u, 14.85, 15.25),
    footer:
      step === 0
        ? "baseline v3 · 5 signals saved"
        : step === 1
          ? `scanning · page ${1 + Math.floor(r(u, 3.95, 5.4) * 8.99)} of 9`
          : "",
  };
}

export type HeroFrame = ReturnType<typeof heroFrameAt>;

const abs = (s: CSSProperties): CSSProperties => ({ position: "absolute", ...s });

/**
 * Text badges scale in rather than fade: a half-transparent label has
 * half its contrast, and an accessibility audit can land on that frame.
 */
const badgeIn = (p: number): CSSProperties => ({
  transform: `scale(${p})`,
  visibility: p > 0.01 ? "visible" : "hidden",
});

/* ---------------------------- progress track ---------------------------- */

function Track({ f, w, compact }: { f: HeroFrame; w: number; compact: boolean }) {
  const gap = compact ? 78 : 150;
  const x0 = w / 2 - gap * 2;
  const fill = Math.min(4, f.step + (f.step < 4 ? f.stepP : 0)) * gap;
  return (
    <div style={{ position: "relative", height: compact ? 50 : 56 }}>
      <div style={abs({ left: x0, top: 11, width: gap * 4, height: 2, borderRadius: 2, background: "rgba(21,21,21,0.12)" })} />
      <div style={abs({ left: x0, top: 11, width: fill, height: 2, borderRadius: 2, background: GOLD, boxShadow: `0 0 8px ${GOLD}` })} />
      {STEPS.map((label, i) => {
        const done = i < f.step;
        const on = i === f.step;
        return (
          <div key={label} style={abs({ left: x0 + i * gap - 40, top: 0, width: 80, textAlign: "center" })}>
            <span
              style={{
                width: 24,
                height: 24,
                margin: "0 auto",
                borderRadius: 99,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: MONO,
                fontSize: 10.5,
                fontWeight: 700,
                background: on ? INK : done ? GOLD : "#fff",
                color: on ? GOLD : INK,
                border: on || done ? "none" : "1.5px solid rgba(21,21,21,0.16)",
                boxShadow: on ? `0 0 0 ${3 + f.pulse * 4}px rgba(255,212,0,${0.45 - f.pulse * 0.25})` : "none",
                transition: "background 250ms, color 250ms",
              }}
            >
              {done ? <Check size={12} strokeWidth={3.2} /> : i + 1}
            </span>
            <span
              style={{
                display: "block",
                marginTop: 7,
                fontSize: compact ? 11.5 : 13,
                fontWeight: on ? 700 : 500,
                color: on || done ? INK : "#8C8C80",
                letterSpacing: "-0.01em",
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Caption({ f, compact }: { f: HeroFrame; compact: boolean }) {
  return (
    <div
      style={{
        textAlign: "center",
        marginTop: compact ? 10 : 16,
        opacity: f.captionIn,
        transform: `translateY(${(1 - f.captionIn) * 10}px)`,
      }}
    >
      <div style={{ fontSize: compact ? 20 : 28, lineHeight: 1.2, fontWeight: 700, letterSpacing: "-0.025em", color: INK }}>
        {f.caption.title}
      </div>
      <div style={{ marginTop: 7, fontSize: compact ? 13.5 : 15.5, lineHeight: 1.45, color: MUTED }}>{f.caption.sub}</div>
    </div>
  );
}

/* --------------------------------- page --------------------------------- */

/**
 * The product page, as a card. The baseline copy is the page as approved;
 * the live one breaks, gets marked up where it differs, and heals.
 */
function Page({ f, live, stamp }: { f: HeroFrame; live: boolean; stamp?: number }) {
  const b = live ? f.broken : 0;
  const changed = (label: string) => live && f.items.find((i) => i.label === label)?.state === "changed";
  const build = (i: number) => (live ? f.build[i] : 1);
  const enter = (i: number): CSSProperties => ({ opacity: build(i), transform: `translateY(${(1 - build(i)) * 10}px)` });
  const scanning = live && f.beam.o > 0.05;
  const hurt = live && f.items.some((i) => i.state === "changed");
  const dot = scanning ? GOLD : hurt ? RED : GREEN;

  return (
    <div
      style={{
        position: "relative",
        width: CARD_W,
        height: CARD_H,
        borderRadius: 18,
        border: `1.5px solid ${INK}`,
        background: "#fff",
        overflow: "hidden",
        boxShadow: live ? `7px 7px 0 ${GOLD}, 7px 7px 0 1.5px ${INK}` : "0 18px 40px -24px rgba(21,21,21,0.35)",
      }}
    >
      {/* chrome */}
      <div style={{ height: 40, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", background: "#F7F6EE", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
        <span style={{ display: "flex", gap: 4 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 8, height: 8, borderRadius: 8, border: "1px solid rgba(0,0,0,0.2)", background: "#fff" }} />
          ))}
        </span>
        <span style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 99, background: "#fff", border: "1px solid rgba(0,0,0,0.08)", fontFamily: MONO, fontSize: 10, color: "rgba(21,21,21,0.65)", whiteSpace: "nowrap", overflow: "hidden" }}>
          <Globe size={10} style={{ opacity: 0.45 }} />
          aurora-outdoor.com/tents
        </span>
        <span
          style={{
            marginLeft: "auto",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 8px",
            borderRadius: 99,
            fontFamily: MONO,
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.06em",
            background: live ? INK : GOLD,
            color: live ? "#F5F5F0" : INK,
          }}
        >
          {live ? (
            <span style={{ width: 6, height: 6, borderRadius: 6, background: dot, boxShadow: `0 0 0 ${2 + f.pulse * 2}px ${dot}44` }} />
          ) : (
            <Check size={10} strokeWidth={3.2} />
          )}
          {live ? "LIVE" : "BASELINE"}
        </span>
      </div>

      <div style={{ position: "relative", height: CARD_H - 40 }}>
        {/* hero image */}
        <div style={{ ...abs({ left: 16, top: 12, width: CARD_W - 32, height: 124 }), ...enter(0), borderRadius: 12, overflow: "hidden", background: "linear-gradient(145deg,#8FB39A 0%,#4F7A5E 55%,#2F4C3A 100%)" }}>
          <svg viewBox="0 0 100 42" preserveAspectRatio="none" style={abs({ left: 0, bottom: 0, width: "100%", height: "72%" })}>
            <path d="M0 42 L28 12 L46 28 L66 6 L100 42 Z" fill="rgba(255,255,255,0.18)" />
            <path d="M26 42 L50 16 L74 42 Z" fill="#F4B63F" />
            <path d="M50 16 L56 42 L44 42 Z" fill="#C98A1C" />
          </svg>
          {changed("Screenshot") && (
            <span style={{ ...abs({ right: 8, top: 8, fontFamily: MONO, fontSize: 9.5, fontWeight: 700, padding: "3px 7px", borderRadius: 6, background: RED_INK, color: "#fff" }), ...badgeIn(1) }}>
              Δ 4.2%
            </span>
          )}
        </div>

        {/* title + price */}
        <div style={{ ...abs({ left: 16, right: 16, top: 150 }), ...enter(1), display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-0.02em", color: INK }}>Trail Tent 2P</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: INK }}>$289</span>
        </div>
        <div style={{ ...abs({ left: 16, right: 16, top: 184 }), ...enter(1), fontSize: 11.5, color: MUTED, whiteSpace: "nowrap" }}>
          Pitches in three minutes, sheds a storm all night.
        </div>

        {/* add to cart - bursts apart while broken */}
        <div style={{ ...abs({ left: 16, top: 218, width: 138, height: 40 }), ...enter(2) }}>
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 99,
              background: "#D9731A",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 13,
              opacity: 1 - b,
              transform: `scale(${1 - b * 0.4})`,
            }}
          >
            Add to cart
          </div>
          {live &&
            f.burst > 0 &&
            f.burst < 1 &&
            [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
              const a = (i / 8) * Math.PI * 2 + 0.3;
              const d = 18 + f.burst * 46;
              return (
                <span
                  key={i}
                  style={abs({
                    left: 69 + Math.cos(a) * d - 3,
                    top: 20 + Math.sin(a) * d * 0.6 - 3,
                    width: 6,
                    height: 6,
                    borderRadius: 2,
                    background: i % 2 ? "#D9731A" : GOLD,
                    opacity: 1 - f.burst,
                    transform: `rotate(${f.burst * 180 + i * 40}deg)`,
                  })}
                />
              );
            })}
          {changed("Add to cart") && (
            <div style={abs({ inset: -6, borderRadius: 14, border: `2px dashed ${RED}`, background: "rgba(229,72,77,0.06)" })}>
              <span style={{ ...abs({ left: 10, top: -10, fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 5, background: RED_INK, color: "#fff" }), ...badgeIn(1) }}>
                MISSING
              </span>
            </div>
          )}
        </div>
        <div style={{ ...abs({ left: 170, top: 226, right: 16 }), ...enter(2) }}>
          <div style={{ height: 7, width: "80%", borderRadius: 4, background: "rgba(21,21,21,0.12)" }} />
          <div style={{ height: 7, width: "55%", borderRadius: 4, background: "rgba(21,21,21,0.08)", marginTop: 8 }} />
        </div>
        <div style={{ ...abs({ left: 16, right: 16, top: 276 }), ...enter(3), display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {["#E7DCC4", "#CFDCCB", "#DCD3E4"].map((c) => (
            <div key={c} style={{ height: 28, borderRadius: 8, background: c }} />
          ))}
        </div>

        {/* the head, where the robots tag lives */}
        <div
          style={{
            ...abs({ left: 0, right: 0, bottom: 0, height: 44 }),
            ...enter(4),
            background: INK,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0 14px",
            fontFamily: MONO,
            fontSize: 10.5,
            color: "#9C9E93",
            whiteSpace: "nowrap",
          }}
        >
          &lt;meta name=<span style={{ color: "#E9EBDF" }}>&quot;robots&quot;</span> content=
          <span style={{ color: b > 0.5 ? "#FF8A8E" : "#7EE2A8", fontWeight: 700 }}>{b > 0.5 ? "\"noindex\"" : "\"index\""}</span>&gt;
          {changed("Robots meta") && (
            <span style={{ marginLeft: "auto", ...badgeIn(1), background: RED_INK, color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 5 }}>
              CHANGED
            </span>
          )}
        </div>

        {/* shutter flash + approval stamp (the snapshot) */}
        {live && <div style={abs({ inset: 0, background: "#fff", opacity: f.flash })} />}
        {stamp !== undefined && (
          <div
            style={abs({
              left: 26,
              top: 60,
              transform: `scale(${stamp}) rotate(-6deg)`,
              visibility: stamp > 0.01 ? "visible" : "hidden",
              border: `2px solid ${INK}`,
              background: GOLD,
              color: INK,
              borderRadius: 10,
              padding: "7px 12px",
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 11.5,
              boxShadow: `3px 3px 0 ${INK}`,
              display: "flex",
              alignItems: "center",
              gap: 6,
            })}
          >
            <Check size={13} strokeWidth={3} /> APPROVED
          </div>
        )}

        {/* scan beam */}
        {live && f.beam.o > 0 && (
          <div style={abs({ left: 0, right: 0, top: `${f.beam.y * 100}%`, height: 0, opacity: f.beam.o })}>
            <div style={abs({ left: 0, right: 0, bottom: 0, height: 80, background: "linear-gradient(to bottom, rgba(255,212,0,0), rgba(255,212,0,0.3))" })} />
            <div style={abs({ left: 0, right: 0, top: -1.5, height: 3, background: GOLD, boxShadow: "0 0 18px 4px rgba(255,212,0,0.85)" })} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Deploy / fix notices, floating just above the live page. */
function Notices({ f }: { f: HeroFrame }) {
  return (
    <>
      {[
        { s: f.deployChip, text: "Theme update deployed", bg: INK, fg: "#F5F5F0", icon: <RotateCw size={12} /> },
        { s: f.fixChip, text: "Fix deployed", bg: GREEN, fg: "#fff", icon: <Check size={12} strokeWidth={3} /> },
      ].map((c) => (
        <div
          key={c.text}
          style={abs({
            left: "50%",
            top: -18,
            transform: `translateX(-50%) translateY(${(1 - c.s) * -10}px) scale(${0.85 + c.s * 0.15})`,
            visibility: c.s > 0.01 ? "visible" : "hidden",
            display: "flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
            background: c.bg,
            color: c.fg,
            borderRadius: 99,
            padding: "7px 13px",
            fontSize: 12,
            fontWeight: 600,
            boxShadow: "0 10px 24px -12px rgba(0,0,0,0.5)",
            zIndex: 3,
          })}
        >
          {c.icon}
          {c.text}
        </div>
      ))}
    </>
  );
}

/* -------------------------------- signals ------------------------------- */

type Item = HeroFrame["items"][number];

function SignalIcon({ state }: { state: SignalState }) {
  const base: CSSProperties = { width: 20, height: 20, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
  if (state === "changed") return <span style={{ ...base, background: RED, color: "#fff" }}><X size={12} strokeWidth={3} /></span>;
  if (state === "match") return <span style={{ ...base, background: GREEN, color: "#fff" }}><Check size={12} strokeWidth={3} /></span>;
  return <span style={{ ...base, background: GOLD, color: INK }}><Check size={12} strokeWidth={3} /></span>;
}

function Value({ it }: { it: Item }) {
  return it.state === "changed" ? (
    <>
      <span style={{ textDecoration: "line-through", opacity: 0.55 }}>{it.base}</span> → <b>{it.now}</b>
    </>
  ) : (
    <>{it.base}</>
  );
}

/** One signal: a two-line node on the spine, or a one-line row on phones. */
function Signal({ it, w, row }: { it: Item; w: number; row?: boolean }) {
  const bad = it.state === "changed";
  const good = it.state === "match";
  return (
    <div
      style={{
        width: w,
        height: row ? 42 : 46,
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "0 11px",
        borderRadius: 12,
        background: bad ? `rgba(255,236,236,${1 - it.flash * 0.3})` : "#fff",
        border: `1.5px solid ${bad ? RED : good ? "rgba(22,163,74,0.45)" : "rgba(21,21,21,0.14)"}`,
        boxShadow: bad ? `0 0 0 ${it.flash * 7}px rgba(229,72,77,0.18)` : "0 6px 16px -12px rgba(21,21,21,0.45)",
        transform: `scale(${it.o})`,
        visibility: it.o > 0.01 ? "visible" : "hidden",
      }}
    >
      <SignalIcon state={it.state} />
      {row ? (
        <>
          <span style={{ fontSize: 13, fontWeight: 600, color: INK, whiteSpace: "nowrap" }}>{it.label}</span>
          <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10.5, color: bad ? RED_INK : MUTED, whiteSpace: "nowrap" }}>
            <Value it={it} />
          </span>
        </>
      ) : (
        <span style={{ minWidth: 0, lineHeight: 1.2 }}>
          <span style={{ display: "block", fontSize: 12.5, fontWeight: 650, color: INK, whiteSpace: "nowrap" }}>{it.label}</span>
          <span style={{ display: "block", marginTop: 2, fontFamily: MONO, fontSize: 10, color: bad ? RED_INK : MUTED, whiteSpace: "nowrap" }}>
            <Value it={it} />
          </span>
        </span>
      )}
    </div>
  );
}

/** What the scan is doing / what it found - under the signals. */
function StatusLine({ f }: { f: HeroFrame }) {
  const chip: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "7px 14px",
    borderRadius: 99,
    fontSize: 12.5,
    fontWeight: 700,
    whiteSpace: "nowrap",
  };
  if (f.clearS > 0) {
    return (
      <span style={{ ...chip, background: GREEN, color: "#fff", ...badgeIn(f.clearS), boxShadow: "0 0 0 6px rgba(22,163,74,0.15)" }}>
        <Check size={14} strokeWidth={3} /> All clear · 9 pages match
      </span>
    );
  }
  if (f.counter > 0 && f.step >= 2) {
    return (
      <span style={{ ...chip, background: RED_INK, color: "#fff", ...badgeIn(f.counter) }}>
        <X size={13} strokeWidth={3} /> 3 of 5 signals changed
      </span>
    );
  }
  return <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED, whiteSpace: "nowrap" }}>{f.footer}</span>;
}

/* --------------------------------- alert -------------------------------- */

function Sheet({ f, w }: { f: HeroFrame; w: number }) {
  return (
    <div
      style={{
        width: w,
        padding: 20,
        borderRadius: 20,
        background: "#fff",
        border: `1.5px solid ${INK}`,
        boxShadow: `8px 8px 0 ${GOLD}, 8px 8px 0 1.5px ${INK}, 0 30px 60px -30px rgba(0,0,0,0.5)`,
        opacity: f.sheetO,
        transform: `translateY(${f.sheetY}px)`,
        visibility: f.sheetO > 0.01 ? "visible" : "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 32, height: 32, borderRadius: 10, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Bell size={16} color={INK} strokeWidth={2.4} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", color: INK }}>3 changes on /tents</span>
          <span style={{ display: "block", fontFamily: MONO, fontSize: 10.5, color: MUTED, marginTop: 1 }}>aurora-outdoor.com · vs baseline v3</span>
        </span>
        <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10.5, color: MUTED, whiteSpace: "nowrap" }}>just now</span>
      </div>

      <div style={{ marginTop: 14 }}>
        {f.alerts.map((a) => {
          const crit = a.sev === "CRITICAL";
          return (
            <div
              key={a.title}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                marginBottom: 7,
                borderRadius: 12,
                background: crit ? "#FFF7CC" : PAPER,
                border: crit ? `1.5px solid ${GOLD}` : "1px solid rgba(0,0,0,0.08)",
                opacity: a.o,
                transform: `translateX(${a.x}px)`,
              }}
            >
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 650, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</span>
                <span style={{ display: "block", fontFamily: MONO, fontSize: 10, color: MUTED, marginTop: 1 }}>{a.meta}</span>
              </span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 9.5,
                  fontWeight: 700,
                  padding: "3px 7px",
                  borderRadius: 99,
                  background: crit ? INK : "#fff",
                  color: crit ? GOLD : INK,
                  border: crit ? "none" : "1px solid rgba(0,0,0,0.15)",
                  flexShrink: 0,
                }}
              >
                {a.sev}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {f.channels.map((c) => (
          <div
            key={c.name}
            style={{
              position: "relative",
              flex: 1,
              height: 36,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: INK,
              background: PAPER,
              border: "1px solid rgba(0,0,0,0.1)",
              transform: `scale(${c.s})`,
              visibility: c.s > 0.01 ? "visible" : "hidden",
            }}
          >
            {c.ring > 0 && c.ring < 1 && (
              <span style={abs({ inset: -2 - c.ring * 10, borderRadius: 14 + c.ring * 10, border: `2px solid rgba(255,212,0,${1 - c.ring})` })} />
            )}
            {c.name === "Email" ? <Mail size={14} /> : c.name === "Slack" ? <SlackIcon className="size-[14px]" /> : <Smartphone size={14} />}
            {c.name}
            {c.sent && <Check size={12} strokeWidth={3} color={GREEN} />}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, height: 14, fontFamily: MONO, fontSize: 10.5, color: MUTED, opacity: f.groupedO }}>
        grouped into one alert - not three emails
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <div style={{ flex: 1, height: 38, borderRadius: 99, border: "1.5px solid rgba(21,21,21,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 600, color: INK }}>
          Approve as baseline
        </div>
        <div
          style={{
            flex: 1,
            height: 38,
            borderRadius: 99,
            background: GOLD,
            color: INK,
            border: `1.5px solid ${INK}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12.5,
            fontWeight: 700,
            transform: `scale(${1 - f.cur.click * 0.07})`,
            boxShadow: f.cur.click > 0 ? "none" : `2px 2px 0 ${INK}`,
          }}
        >
          Fixed - rescan
        </div>
      </div>
    </div>
  );
}

function Cursor({ f, from, to }: { f: HeroFrame; from: [number, number]; to: [number, number] }) {
  const x = from[0] + (to[0] - from[0]) * f.cur.p;
  const y = from[1] + (to[1] - from[1]) * f.cur.p;
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      style={abs({ left: x, top: y, opacity: f.cur.o, filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.35))", zIndex: 6 })}
    >
      <path d="M4 2 L4 20 L9 15 L12.5 22 L15.5 20.6 L12 13.8 L19 13.8 Z" fill="#fff" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      {f.cur.click > 0 && <circle cx="4" cy="2" r={3 + f.cur.click * 9} fill="none" stroke={GOLD} strokeWidth="2" opacity={1 - f.cur.click * 0.6} />}
    </svg>
  );
}

/* -------------------------------- stages -------------------------------- */

function Stage({ w, h, k, children }: { w: number; h: number; k: number; children: ReactNode }) {
  return (
    <div aria-hidden style={abs({ left: 0, top: 0, width: w, height: h, transformOrigin: "0 0", transform: `scale(${k})`, color: INK })}>
      {children}
    </div>
  );
}

const LABEL =
  "Animation: how MyKavo works. 1, Baseline: MyKavo snapshots a product page and saves it as the approved baseline, capturing five signals - status, screenshot, title, the Add to cart button and the robots tag. 2, Scan: a theme update removes the Add to cart button and sets the page to noindex, and the scan runs. 3, Compare: each signal is checked against the baseline; status and title match, while the screenshot, the button and the robots tag changed. 4, Alert: one grouped alert, ranked by severity, goes to email, Slack and push. 5, Resolve: the fix is deployed, MyKavo rescans and every signal matches again.";

/** Wide screens: Baseline page · signal spine · Live page. */
function Landscape() {
  const W = 1080;
  const H = 680;
  const { wrapRef, t, k, fitted } = useStageClock(W, STILL_T, FIRST_FRAME_T);
  const f = heroFrameAt(t);

  const top = 190;
  const leftX = 40;
  const liveX = W - 40 - CARD_W;
  const nodeW = 200;
  const nodeX = (W - nodeW) / 2;
  const slide = (1 - f.baselineP) * (liveX - leftX);
  const dimmed = 1 - f.dim * 0.7;

  return (
    <div ref={wrapRef} role="img" aria-label={LABEL} style={{ position: "relative", width: "100%", aspectRatio: `${W} / ${H}`, overflow: stageClip(fitted) }}>
      <Stage w={W} h={H} k={k}>
        <div style={{ opacity: f.fade, height: "100%" }}>
          <Track f={f} w={W} compact={false} />
          <Caption f={f} compact={false} />

          <div style={{ opacity: dimmed }}>
            {/* baseline copy, sliding out of the live page */}
            <div style={abs({ left: leftX + slide, top, opacity: f.baselineO, transform: `scale(${0.96 + f.baselineP * 0.04})` })}>
              <Page f={f} live={false} stamp={f.stamp} />
            </div>

            {/* threads: baseline → signal ← live */}
            <svg width={W} height={H} style={abs({ left: 0, top: 0, overflow: "visible", pointerEvents: "none" })}>
              {f.items.map((it) => {
                const y = top + it.y;
                const lx0 = leftX + CARD_W;
                const rx0 = liveX;
                const lColor = GOLD;
                const rColor = it.state === "changed" ? RED : it.state === "match" ? GREEN : "rgba(21,21,21,0.35)";
                const travel = it.state === "changed" && f.dim < 0.05 ? (f.u * 0.9) % 1 : -1;
                return (
                  <g key={it.label}>
                    {it.left > 0 && (
                      <>
                        <circle cx={lx0} cy={y} r={4} fill={lColor} stroke={INK} strokeWidth={1.2} />
                        <line x1={lx0} y1={y} x2={lx0 + (nodeX - lx0) * it.left} y2={y} stroke={lColor} strokeWidth={2.5} strokeLinecap="round" />
                      </>
                    )}
                    {it.right > 0 && (
                      <>
                        <circle cx={rx0} cy={y} r={4} fill={rColor} stroke={INK} strokeWidth={1.2} />
                        <line x1={rx0} y1={y} x2={rx0 - (rx0 - nodeX - nodeW) * it.right} y2={y} stroke={rColor} strokeWidth={2.5} strokeLinecap="round" />
                        {travel >= 0 && <circle cx={rx0 - (rx0 - nodeX - nodeW) * travel} cy={y} r={3.5} fill="#fff" stroke={RED} strokeWidth={2} />}
                      </>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* signal spine */}
            {f.items.map((it) => (
              <div key={it.label} style={abs({ left: nodeX, top: top + it.y - 23 })}>
                <Signal it={it} w={nodeW} />
              </div>
            ))}
            <div style={abs({ left: nodeX - 60, width: nodeW + 120, top: top + CARD_H + 22, display: "flex", justifyContent: "center" })}>
              <StatusLine f={f} />
            </div>

            {/* live page */}
            <div style={abs({ left: liveX, top })}>
              <Notices f={f} />
              <Page f={f} live />
            </div>
          </div>

          {/* one alert, over everything */}
          <div style={abs({ left: (W - 470) / 2, top: top + 6 })}>
            <Sheet f={f} w={470} />
          </div>
          <Cursor f={f} from={[W - 250, top + 470]} to={[(W - 470) / 2 + 470 - 20 - 110, top + 6 + 348]} />
        </div>
      </Stage>
    </div>
  );
}

/** Phones: the live page, with the signals listed under it. */
function Portrait() {
  const W = 400;
  const H = 900;
  const { wrapRef, t, k, fitted } = useStageClock(W, STILL_T, FIRST_FRAME_T);
  const f = heroFrameAt(t);
  const top = 190;
  const cardX = (W - CARD_W) / 2;
  const listTop = top + CARD_H + 24;
  const dimmed = 1 - f.dim * 0.7;

  return (
    <div ref={wrapRef} role="img" aria-label={LABEL} style={{ position: "relative", width: "100%", aspectRatio: `${W} / ${H}`, overflow: stageClip(fitted) }}>
      <Stage w={W} h={H} k={k}>
        <div style={{ opacity: f.fade, height: "100%" }}>
          <Track f={f} w={W} compact />
          <div style={{ height: 110 }}>
            <Caption f={f} compact />
          </div>

          <div style={{ opacity: dimmed }}>
            <div style={abs({ left: cardX, top })}>
              <Notices f={f} />
              <Page f={f} live stamp={f.stamp * (1 - r(f.u, 3.0, 3.2))} />
            </div>
            {f.items.map((it, i) => (
              <div key={it.label} style={abs({ left: 20, top: listTop + i * 48 })}>
                <Signal it={it} w={W - 40} row />
              </div>
            ))}
            <div style={abs({ left: 0, right: 0, top: listTop + 5 * 48 + 8, display: "flex", justifyContent: "center" })}>
              <StatusLine f={f} />
            </div>
          </div>

          <div style={abs({ left: 16, top: top + 10 })}>
            <Sheet f={f} w={W - 32} />
          </div>
          <Cursor f={f} from={[W - 60, top + 460]} to={[W - 16 - 20 - 90, top + 10 + 348]} />
        </div>
      </Stage>
    </div>
  );
}

export function HeroStoryAnimation() {
  return (
    <>
      <div className="hidden md:block">
        <Landscape />
      </div>
      <div className="md:hidden">
        <Portrait />
      </div>
    </>
  );
}
