"use client";

import type { CSSProperties, ReactNode } from "react";
import { Bell, Check, Globe, Mail, RotateCw, Smartphone, X } from "lucide-react";
import { SlackIcon } from "@/components/brand/integration-icons";
import { LogoMark } from "@/components/brand/logo";
import { useStageClock } from "./use-stage-clock";

/**
 * The hero animation: how MyKavo works, in one loop.
 *
 *   1 Baseline - the page is snapshotted and the signals are captured
 *   2 Scan     - an update quietly breaks the page; the scheduled scan runs
 *   3 Compare  - every signal is checked against the baseline, three differ
 *   4 Alert    - one grouped alert, ranked by severity, to every channel
 *   5 Resolve  - "Fixed - rescan", and everything matches again
 *
 * A step rail and a one-line caption say what is happening at each moment,
 * so the loop reads as an explanation rather than decoration.
 *
 * Same stage approach as the other homepage animations (use-stage-clock.ts):
 * every frame is a pure function of `t`, drawn on a fixed stage scaled to
 * fit, running only while on screen. Phones get a portrait stage with the
 * same frames so nothing shrinks past readable. Reduced motion shows the
 * alert moment as a still.
 */

const GOLD = "#FFD400";
const INK = "#151515";
const RED = "#E5484D";
/** Red dark enough for white text on it (WCAG AA). */
const RED_INK = "#C4262C";
const GREEN = "#16A34A";
const MONO = "var(--font-geist-mono), ui-monospace, monospace";

export const HERO_CYCLE = 16;
/** Shown until the clock starts (after page load): the approved baseline, fully drawn. */
const FIRST_FRAME_T = 2.6;
/** Reduced-motion still: the alert, with everything it found. */
const STILL_T = 10.8;

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
const BOUNDS = [0, 3, 5.6, 8.9, 12.3, HERO_CYCLE];

const CAPTIONS: Array<{ title: string; sub: string }> = [
  { title: "MyKavo saves an approved baseline of your page.", sub: "Status, SEO tags, content, scripts, buttons and a full screenshot." },
  { title: "Then an update quietly breaks it - and the scan runs.", sub: "Same pages, same browser, on schedule or right after a deploy." },
  { title: "Every signal is compared with the baseline.", sub: "Most match. Three do not - and MyKavo shows exactly which." },
  { title: "You get one alert, ranked by severity.", sub: "By email, Slack or push - with before-and-after proof." },
  { title: "Fix it, or approve it as the new baseline.", sub: "MyKavo rescans and confirms everything matches again." },
];

export type ItemState = "hidden" | "captured" | "match" | "changed";

const ITEMS: Array<{ label: string; base: string; now?: string }> = [
  { label: "HTTP status", base: "200 OK" },
  { label: "Title tag", base: "Trail Tent 2P" },
  { label: "Robots meta", base: "index", now: "noindex" },
  { label: "“Add to cart” button", base: "visible", now: "missing" },
  { label: "Scripts", base: "GA4 · Stripe" },
  { label: "Screenshot", base: "1440 × 2980", now: "4.2% differs" },
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

  // The breaking update lands just before the scan; the fix, just before the rescan.
  const broken = r(u, 3.1, 3.5) * (1 - r(u, 13.2, 13.6));

  const items = ITEMS.map((it, i) => {
    const shown = u >= 0.55 + i * 0.28 && u < 9.1;
    const compared = u >= 3.9 + i * 0.28;
    const state: ItemState = !shown ? "hidden" : !compared ? "captured" : it.now ? "changed" : "match";
    return {
      ...it,
      state,
      o: ease(u, 0.55 + i * 0.28, 0.85 + i * 0.28) * (1 - r(u, 8.7, 9.1)),
      flash: it.now ? bell(u, 3.9 + i * 0.28, 4.6 + i * 0.28) : 0,
    };
  });

  const alerts = ALERTS.map((a, i) => ({
    ...a,
    o: ease(u, 9.1 + i * 0.22, 9.5 + i * 0.22) * (1 - r(u, 13.25, 13.6)),
    x: (1 - ease(u, 9.1 + i * 0.22, 9.6 + i * 0.22)) * 40,
  }));

  const channels = ["Email", "Slack", "Push"].map((name, i) => ({
    name,
    s: pop(u, 10.1 + i * 0.28, 10.5 + i * 0.28) * (1 - r(u, 13.25, 13.6)),
    sent: u >= 10.3 + i * 0.28 && u < 13.6,
  }));

  // Cursor: glides to "Fixed - rescan" and clicks it.
  const cur = {
    o: span(u, 12.35, 13.4, 0.25),
    p: ease(u, 12.35, 12.95),
    click: bell(u, 12.95, 13.3),
  };

  return {
    u,
    step,
    stepP,
    caption: CAPTIONS[step],
    fade: Math.min(r(u, 0, 0.35), 1 - r(u, HERO_CYCLE - 0.4, HERO_CYCLE)),
    // Browser
    frameO: span(u, 0.2, 1.3, 0.2),
    flash: bell(u, 0.95, 1.35) * 0.8,
    stamp: pop(u, 1.3, 1.75) * (1 - r(u, 2.8, 3.1)),
    updateChip: pop(u, 3.0, 3.35) * (1 - r(u, 5.2, 5.5)),
    broken,
    scanY: r(u, 3.6, 5.4),
    scanO: span(u, 3.55, 5.55, 0.2),
    diffO: span(u, 5.6, 9.0, 0.35),
    fixChip: pop(u, 13.1, 13.45) * (1 - r(u, 14.3, 14.6)),
    rescanY: r(u, 13.6, 14.6),
    rescanO: span(u, 13.55, 14.75, 0.2),
    // Panel
    header:
      step === 0 ? "Snapshot · baseline v3" : step === 1 ? "Scanning /tents" : step === 2 ? "Compared with baseline v3" : step === 3 ? "1 alert · 3 changes" : "Resolving",
    items,
    listO: 1 - r(u, 8.7, 9.1),
    footer: step === 0 ? "saved 09:41 · 6 signals" : step === 1 ? `page ${1 + Math.floor(r(u, 3.6, 5.4) * 8.99)} of 9` : "compared 9 pages",
    footerRight: step === 0 ? "next scan · tomorrow" : step === 1 ? "same browser · same viewport" : "3 of 6 signals changed",
    progress: step === 0 ? ease(u, 0.5, 2.4) : step === 1 ? r(u, 3.6, 5.4) : 1,
    alerts,
    channels,
    groupedO: ease(u, 11.1, 11.5) * (1 - r(u, 13.25, 13.6)),
    actionsO: span(u, 12.1, 13.6, 0.3),
    cur,
    rescanning: span(u, 13.6, 14.7, 0.2),
    clearS: pop(u, 14.7, 15.15),
  };
}

export type HeroFrame = ReturnType<typeof heroFrameAt>;

const abs = (s: CSSProperties): CSSProperties => ({ position: "absolute", ...s });

/**
 * Text badges scale in rather than fade: a half-transparent label has
 * half its contrast, and an accessibility audit can land on that frame.
 */
const badgeIn = (p: number): CSSProperties => ({
  display: "inline-block",
  transform: `scale(${p})`,
  visibility: p > 0.01 ? "visible" : "hidden",
});

/* ------------------------------ step rail ------------------------------ */

function Rail({ f, compact }: { f: HeroFrame; compact: boolean }) {
  return (
    <div style={{ display: "flex", gap: compact ? 6 : 10, justifyContent: "center" }}>
      {STEPS.map((label, i) => {
        const done = i < f.step;
        const on = i === f.step;
        return (
          <div
            key={label}
            style={{
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: compact ? 34 : 38,
              padding: compact ? (on ? "0 14px 0 6px" : "0 6px") : "0 16px 0 7px",
              borderRadius: 999,
              border: `1.5px solid ${on ? INK : "rgba(21,21,21,0.14)"}`,
              background: on ? INK : "#fff",
              color: on ? "#F5F5F0" : INK,
              boxShadow: on ? `3px 3px 0 ${GOLD}` : "none",
              transition: "background 250ms, color 250ms, box-shadow 250ms, border-color 250ms",
            }}
          >
            <span
              style={{
                width: compact ? 22 : 24,
                height: compact ? 22 : 24,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: on || done ? GOLD : "#F3F1E6",
                color: INK,
                fontFamily: MONO,
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {done ? <Check size={13} strokeWidth={3} /> : i + 1}
            </span>
            {(!compact || on) && (
              <span style={{ fontSize: compact ? 13 : 14, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>
            )}
            {on && (
              <span
                style={abs({ left: 0, bottom: 0, height: 3, width: `${f.stepP * 100}%`, background: GOLD })}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Caption({ f, compact }: { f: HeroFrame; compact: boolean }) {
  return (
    <div style={{ textAlign: "center", marginTop: compact ? 14 : 18 }}>
      <div
        key={f.step}
        style={{
          fontSize: compact ? 19 : 24,
          lineHeight: 1.25,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: INK,
          opacity: ease(f.u, [0, 3, 5.6, 8.9, 12.3][f.step], [0, 3, 5.6, 8.9, 12.3][f.step] + 0.4),
        }}
      >
        {f.caption.title}
      </div>
      <div style={{ marginTop: 6, fontSize: compact ? 13.5 : 15, color: "#6B6B60" }}>{f.caption.sub}</div>
    </div>
  );
}

/* ------------------------------- browser ------------------------------- */

function Browser({ f, w, h }: { f: HeroFrame; w: number; h: number }) {
  const small = w < 500;
  const b = f.broken;
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        borderRadius: 16,
        border: `1.5px solid ${INK}`,
        background: "#fff",
        overflow: "hidden",
        boxShadow: `8px 8px 0 ${GOLD}, 8px 8px 0 1.5px ${INK}`,
      }}
    >
      {/* chrome */}
      <div style={{ height: 38, display: "flex", alignItems: "center", gap: 10, padding: "0 12px", background: "#F7F6EE", borderBottom: "1px solid rgba(0,0,0,0.1)" }}>
        <span style={{ display: "flex", gap: 5 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 9, height: 9, borderRadius: 9, border: "1px solid rgba(0,0,0,0.2)", background: i === 2 ? GOLD : "#fff" }} />
          ))}
        </span>
        <span style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 12px", borderRadius: 99, background: "#fff", border: "1px solid rgba(0,0,0,0.1)", fontFamily: MONO, fontSize: 11, color: "rgba(21,21,21,0.7)" }}>
            <Globe size={11} style={{ opacity: 0.4 }} />
            aurora-outdoor.com/tents
          </span>
        </span>
      </div>

      {/* the website */}
      <div style={{ position: "relative", padding: small ? 14 : 18, height: h - 38 - 34 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, fontSize: small ? 12 : 13, letterSpacing: "0.08em", color: "#2F3B2F" }}>AURORA</span>
          <span style={{ display: "flex", gap: small ? 10 : 14, fontSize: 10.5, color: "#6B6B60" }}>
            <span>Tents</span>
            <span>Packs</span>
            <span>Journal</span>
            <span style={{ fontWeight: 700, color: INK }}>Cart (0)</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: small ? 12 : 18, marginTop: small ? 12 : 16 }}>
          <div
            style={{
              width: small ? "48%" : 250,
              height: small ? 118 : 190,
              borderRadius: 12,
              background: "linear-gradient(145deg,#8FB39A 0%,#4F7A5E 55%,#2F4C3A 100%)",
              position: "relative",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 100 60" style={abs({ left: 0, bottom: 0, width: "100%" })} preserveAspectRatio="none">
              <path d="M0 60 L30 22 L48 40 L66 14 L100 60 Z" fill="rgba(255,255,255,0.18)" />
              <path d="M22 60 L50 30 L78 60 Z" fill="#F4B63F" />
              <path d="M50 30 L57 60 L43 60 Z" fill="#C98A1C" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: 9.5, color: "#6B6B60", letterSpacing: "0.1em" }}>2-PERSON · 1.9 KG</div>
            <div style={{ fontSize: small ? 16 : 21, fontWeight: 700, color: INK, marginTop: 4, lineHeight: 1.15 }}>Trail Tent 2P</div>
            <div style={{ fontSize: small ? 10.5 : 12, color: "#6B6B60", marginTop: 6, lineHeight: 1.45 }}>
              Pitches in three minutes, sheds a storm all night.
            </div>
            <div style={{ fontSize: small ? 15 : 18, fontWeight: 700, color: INK, marginTop: small ? 8 : 12 }}>$289</div>
            <div style={{ position: "relative", marginTop: small ? 8 : 12, height: small ? 30 : 36 }}>
              {/* the real button, gone while the page is broken */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: small ? 30 : 36,
                  padding: small ? "0 14px" : "0 20px",
                  borderRadius: 99,
                  background: "#D9731A",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: small ? 11.5 : 13,
                  opacity: 1 - b,
                  transform: `scale(${1 - b * 0.15})`,
                }}
              >
                Add to cart
              </div>
              {/* where it was: a dashed ghost with the diff label */}
              <div
                style={abs({
                  left: -6,
                  top: -6,
                  right: small ? -4 : "auto",
                  width: small ? undefined : 150,
                  height: (small ? 30 : 36) + 12,
                  borderRadius: 12,
                  border: `2px dashed ${RED}`,
                  background: `rgba(229,72,77,${0.07 * f.diffO})`,
                  borderColor: `rgba(229,72,77,${f.diffO})`,
                })}
              >
                <span style={abs({ left: 8, top: -11, ...badgeIn(f.diffO), background: RED_INK, color: "#fff", fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 5 })}>
                  MISSING
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* product cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: small ? 8 : 12, marginTop: small ? 14 : 20 }}>
          {["#E7DCC4", "#CFDCCB", "#DCD3E4"].map((c, i) => (
            <div key={c} style={{ borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", padding: 8 }}>
              <div style={{ height: small ? 34 : 54, borderRadius: 7, background: c }} />
              <div style={{ height: 6, width: "70%", background: "rgba(21,21,21,0.18)", borderRadius: 4, marginTop: 7 }} />
              <div style={{ height: 6, width: `${40 + i * 10}%`, background: "rgba(21,21,21,0.1)", borderRadius: 4, marginTop: 5 }} />
            </div>
          ))}
        </div>

        {/* whole-page visual diff tint */}
        <div style={abs({ inset: 0, background: "rgba(229,72,77,0.035)", opacity: f.diffO })} />

        {/* baseline: viewfinder brackets, shutter flash, stamp */}
        <div style={abs({ inset: 8, opacity: f.frameO })}>
          {[
            { left: 0, top: 0, bt: 1, bl: 1 },
            { right: 0, top: 0, bt: 1, br: 1 },
            { left: 0, bottom: 0, bb: 1, bl: 1 },
            { right: 0, bottom: 0, bb: 1, br: 1 },
          ].map((c, i) => (
            <span
              key={i}
              style={abs({
                ...("left" in c ? { left: 0 } : { right: 0 }),
                ...("top" in c ? { top: 0 } : { bottom: 0 }),
                width: 22,
                height: 22,
                borderTop: c.bt ? `3px solid ${GOLD}` : undefined,
                borderBottom: c.bb ? `3px solid ${GOLD}` : undefined,
                borderLeft: c.bl ? `3px solid ${GOLD}` : undefined,
                borderRight: c.br ? `3px solid ${GOLD}` : undefined,
                borderRadius: 4,
              })}
            />
          ))}
        </div>
        <div style={abs({ inset: 0, background: "#fff", opacity: f.flash })} />
        <div
          style={abs({
            left: small ? 22 : 30,
            top: small ? 58 : 70,
            transform: `scale(${f.stamp}) rotate(-6deg)`,
            opacity: Math.min(1, f.stamp * 1.4),
            border: `2px solid ${INK}`,
            background: GOLD,
            color: INK,
            borderRadius: 10,
            padding: small ? "5px 9px" : "7px 12px",
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: small ? 10 : 11.5,
            boxShadow: `3px 3px 0 ${INK}`,
            display: "flex",
            alignItems: "center",
            gap: 6,
          })}
        >
          <Check size={13} strokeWidth={3} /> BASELINE v3 · APPROVED
        </div>

        {/* the update that breaks it, and the fix */}
        {[
          { o: f.updateChip, text: "Theme update deployed", bg: INK, fg: "#F5F5F0", icon: <RotateCw size={12} /> },
          { o: f.fixChip, text: "Fix deployed", bg: GREEN, fg: "#fff", icon: <Check size={12} strokeWidth={3} /> },
        ].map((c) => (
          <div
            key={c.text}
            style={abs({
              left: small ? 22 : 30,
              top: small ? 58 : 70,
              transform: `translateY(${(1 - c.o) * -8}px) scale(${0.9 + c.o * 0.1})`,
              opacity: Math.min(1, c.o * 1.3),
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: c.bg,
              color: c.fg,
              borderRadius: 99,
              padding: "5px 11px",
              fontSize: 11.5,
              fontWeight: 600,
            })}
          >
            {c.icon}
            {c.text}
          </div>
        ))}

        {/* scan sweeps */}
        {[
          { y: f.scanY, o: f.scanO },
          { y: f.rescanY, o: f.rescanO },
        ].map((s, i) => (
          <div key={i} style={abs({ left: 0, right: 0, top: `${s.y * 100}%`, height: 0, opacity: s.o })}>
            <div style={abs({ left: 0, right: 0, bottom: 0, height: 70, background: `linear-gradient(to bottom, rgba(255,212,0,0), rgba(255,212,0,0.28))` })} />
            <div style={abs({ left: 0, right: 0, top: -1.5, height: 3, background: GOLD, boxShadow: `0 0 16px 3px rgba(255,212,0,0.8)` })} />
          </div>
        ))}
      </div>

      {/* view-source peek: the robots meta tag */}
      <div
        style={abs({
          left: 0,
          right: 0,
          bottom: 0,
          height: 34,
          background: "#151515",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 14px",
          fontFamily: MONO,
          fontSize: small ? 10.5 : 11.5,
          color: "#9C9E93",
          whiteSpace: "nowrap",
        })}
      >
        <span style={{ color: "#9C9E93" }}>&lt;head&gt;</span>
        <span>
          &lt;meta name=<span style={{ color: "#E9EBDF" }}>&quot;robots&quot;</span> content=
          <span style={{ position: "relative", display: "inline-block" }}>
            <span style={{ color: b > 0.5 ? RED : "#7EE2A8", fontWeight: 700 }}>{b > 0.5 ? "\"noindex\"" : "\"index\""}</span>
          </span>
          &gt;
        </span>
        <span
          style={{
            marginLeft: "auto",
            ...badgeIn(f.diffO),
            background: RED_INK,
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 5,
          }}
        >
          CHANGED
        </span>
      </div>
    </div>
  );
}

/* -------------------------------- panel -------------------------------- */

function StateIcon({ state }: { state: ItemState }) {
  const base: CSSProperties = { width: 20, height: 20, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
  if (state === "changed") return <span style={{ ...base, background: RED, color: "#fff" }}><X size={12} strokeWidth={3} /></span>;
  if (state === "match") return <span style={{ ...base, background: GREEN, color: "#fff" }}><Check size={12} strokeWidth={3} /></span>;
  return <span style={{ ...base, background: GOLD, color: INK }}><Check size={12} strokeWidth={3} /></span>;
}

function SevBadge({ sev }: { sev: string }) {
  const crit = sev === "CRITICAL";
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: 9.5,
        fontWeight: 700,
        padding: "3px 7px",
        borderRadius: 99,
        background: crit ? GOLD : "#fff",
        color: INK,
        border: crit ? "none" : "1px solid rgba(0,0,0,0.15)",
        flexShrink: 0,
      }}
    >
      {sev}
    </span>
  );
}

function Panel({ f, w, h }: { f: HeroFrame; w: number; h: number }) {
  const small = w < 400;
  const rowH = small ? 36 : 44;
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        borderRadius: 16,
        background: INK,
        color: "#E9EBDF",
        overflow: "hidden",
        border: `1.5px solid ${INK}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: small ? "12px 14px" : "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <LogoMark size={16} />
        </span>
        <span style={{ fontWeight: 600, fontSize: small ? 13.5 : 15 }}>{f.header}</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 10, color: "#9C9E93" }}>
          <span style={{ width: 7, height: 7, borderRadius: 7, background: f.step === 1 || f.rescanning > 0.5 ? GOLD : GREEN, boxShadow: `0 0 0 3px rgba(255,212,0,${f.step === 1 ? 0.25 : 0})` }} />
          {f.step === 1 || f.rescanning > 0.5 ? "SCANNING" : "LIVE"}
        </span>
      </div>

      {/* signals list: captured, then compared */}
      <div style={abs({ left: small ? 12 : 16, right: small ? 12 : 16, top: small ? 62 : 74, opacity: f.listO })}>
        {f.items.map((it) => (
          <div
            key={it.label}
            style={{
              height: rowH,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 10px",
              marginBottom: 6,
              borderRadius: 10,
              opacity: it.o,
              transform: `translateY(${(1 - it.o) * 8}px)`,
              background: it.state === "changed" ? `rgba(229,72,77,${0.14 + it.flash * 0.2})` : "rgba(255,255,255,0.05)",
              border: `1px solid ${it.state === "changed" ? "rgba(229,72,77,0.55)" : "rgba(255,255,255,0.07)"}`,
            }}
          >
            <StateIcon state={it.state} />
            <span style={{ fontSize: small ? 12 : 13.5, fontWeight: 500, whiteSpace: "nowrap" }}>{it.label}</span>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: small ? 10 : 11, whiteSpace: "nowrap", color: it.state === "changed" ? "#FF9EA1" : "#9C9E93" }}>
              {it.state === "changed" ? (
                <>
                  <span style={{ textDecoration: "line-through", opacity: 0.6 }}>{it.base}</span> → {it.now}
                </>
              ) : (
                it.base
              )}
            </span>
          </div>
        ))}
      </div>

      {/* footer: what the list is doing right now */}
      <div style={abs({ left: small ? 12 : 16, right: small ? 12 : 16, bottom: small ? 12 : 16, opacity: f.listO })}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: small ? 10 : 11, color: "#9C9E93" }}>
          <span>{f.footer}</span>
          <span style={{ color: f.step === 2 ? "#FF9EA1" : "#9C9E93" }}>{f.footerRight}</span>
        </div>
        <div style={{ marginTop: 8, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${f.progress * 100}%`, background: f.step === 2 ? RED : GOLD, borderRadius: 4 }} />
        </div>
      </div>

      {/* alert cards */}
      <div style={abs({ left: small ? 12 : 16, right: small ? 12 : 16, top: small ? 62 : 74 })}>
        {f.alerts.map((a) => (
          <div
            key={a.title}
            style={{
              opacity: a.o,
              transform: `translateX(${a.x}px)`,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: small ? "9px 11px" : "12px 14px",
              marginBottom: 8,
              borderRadius: 12,
              background: a.sev === "CRITICAL" ? "#FFF7CC" : "#fff",
              color: INK,
              border: a.sev === "CRITICAL" ? `1.5px solid ${GOLD}` : "1px solid rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: small ? 12.5 : 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: "#6B6B60", marginTop: 2 }}>/tents · {a.meta}</div>
            </div>
            <SevBadge sev={a.sev} />
          </div>
        ))}
        {/* channels */}
        <div style={{ display: "flex", gap: 8, marginTop: small ? 10 : 16 }}>
          {f.channels.map((c) => (
            <div
              key={c.name}
              style={{
                flex: 1,
                transform: `scale(${c.s})`,
                opacity: Math.min(1, c.s * 1.3),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                height: small ? 34 : 40,
                borderRadius: 10,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                fontSize: small ? 11.5 : 12.5,
                fontWeight: 600,
              }}
            >
              {c.name === "Email" ? <Mail size={15} /> : c.name === "Slack" ? <SlackIcon className="size-[15px]" /> : <Smartphone size={15} />}
              {c.name}
              {c.sent && <Check size={13} strokeWidth={3} color={GREEN} />}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, opacity: f.groupedO, fontFamily: MONO, fontSize: 10.5, color: "#9C9E93", display: "flex", alignItems: "center", gap: 6 }}>
          <Bell size={12} color={GOLD} /> grouped into one alert - not three emails
        </div>
      </div>

      {/* actions + cursor */}
      <div
        style={abs({
          left: small ? 12 : 16,
          right: small ? 12 : 16,
          bottom: small ? 12 : 16,
          display: "flex",
          gap: 8,
          opacity: f.actionsO,
        })}
      >
        <div style={{ flex: 1, height: small ? 36 : 42, borderRadius: 99, border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: small ? 11.5 : 13, fontWeight: 600 }}>
          Approve as baseline
        </div>
        <div
          style={{
            flex: 1,
            height: small ? 36 : 42,
            borderRadius: 99,
            background: GOLD,
            color: INK,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: small ? 11.5 : 13,
            fontWeight: 700,
            transform: `scale(${1 - f.cur.click * 0.06})`,
          }}
        >
          Fixed - rescan
        </div>
      </div>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        style={abs({
          left: w * (0.95 - f.cur.p * 0.2),
          top: h - (small ? 30 : 36) + (1 - f.cur.p) * 60,
          opacity: f.cur.o,
          filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.5))",
        })}
      >
        <path d="M4 2 L4 20 L9 15 L12.5 22 L15.5 20.6 L12 13.8 L19 13.8 Z" fill="#fff" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      </svg>

      {/* rescan + all clear */}
      <div style={abs({ left: 0, right: 0, top: "38%", textAlign: "center", opacity: f.rescanning, fontFamily: MONO, fontSize: 12, color: "#9C9E93" })}>
        Rescanning 9 pages…
      </div>
      <div
        style={abs({
          left: small ? 12 : 16,
          right: small ? 12 : 16,
          top: "50%",
          transform: `translateY(-50%) scale(${0.85 + f.clearS * 0.15})`,
          opacity: Math.min(1, f.clearS * 1.2),
          textAlign: "center",
        })}
      >
        <div style={{ width: small ? 52 : 64, height: small ? 52 : 64, margin: "0 auto", borderRadius: 99, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 8px rgba(22,163,74,0.2)" }}>
          <Check size={small ? 28 : 34} strokeWidth={3} color="#fff" />
        </div>
        <div style={{ marginTop: 16, fontSize: small ? 17 : 20, fontWeight: 700 }}>All 9 pages match baseline v3</div>
        <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 11, color: "#9C9E93" }}>resolved in 14 min · monitoring continues</div>
      </div>
    </div>
  );
}

/* -------------------------------- stages ------------------------------- */

function Stage({ w, h, k, children }: { w: number; h: number; k: number; children: ReactNode }) {
  return (
    <div aria-hidden style={abs({ left: 0, top: 0, width: w, height: h, transformOrigin: "0 0", transform: `scale(${k})`, color: INK })}>
      {children}
    </div>
  );
}

const LABEL =
  "Animation: how MyKavo works. 1, Baseline: MyKavo snapshots a product page and saves an approved baseline. 2, Scan: a theme update removes the Add to cart button and sets the page to noindex, and the scheduled scan runs. 3, Compare: each signal is compared with the baseline; the robots tag, the Add to cart button and the screenshot differ. 4, Alert: one grouped alert, ranked by severity, goes to email, Slack and push. 5, Resolve: the fix is deployed, MyKavo rescans and all pages match again.";

function Landscape() {
  const W = 1080;
  const H = 660;
  const { wrapRef, t, k } = useStageClock(W, STILL_T, FIRST_FRAME_T);
  const f = heroFrameAt(t);
  return (
    <div ref={wrapRef} role="img" aria-label={LABEL} style={{ position: "relative", width: "100%", aspectRatio: `${W} / ${H}` }}>
      <Stage w={W} h={H} k={k}>
        <div style={{ opacity: f.fade, height: "100%" }}>
          <Rail f={f} compact={false} />
          <Caption f={f} compact={false} />
          <div style={abs({ left: 0, top: 150 })}>
            <Browser f={f} w={620} h={490} />
          </div>
          <div style={abs({ left: 660, top: 150 })}>
            <Panel f={f} w={420} h={490} />
          </div>
        </div>
      </Stage>
    </div>
  );
}

function Portrait() {
  const W = 400;
  const H = 860;
  const { wrapRef, t, k } = useStageClock(W, STILL_T, FIRST_FRAME_T);
  const f = heroFrameAt(t);
  return (
    <div ref={wrapRef} role="img" aria-label={LABEL} style={{ position: "relative", width: "100%", aspectRatio: `${W} / ${H}` }}>
      <Stage w={W} h={H} k={k}>
        <div style={{ opacity: f.fade, height: "100%" }}>
          <Rail f={f} compact />
          <div style={{ height: 96 }}>
            <Caption f={f} compact />
          </div>
          <div style={abs({ left: 0, top: 150 })}>
            <Browser f={f} w={392} h={330} />
          </div>
          <div style={abs({ left: 0, top: 504 })}>
            <Panel f={f} w={400} h={356} />
          </div>
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
