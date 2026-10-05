"use client";

import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, Check, Lock, Mail, MousePointer2, Plus, Puzzle, RotateCw, ShieldCheck, X } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { stageClip, useStageClock } from "./use-stage-clock";

/**
 * "One click" - the /chrome-extension hero animation. The extension's real
 * flow in five labelled steps:
 *
 *   1  open any page, click MyKavo in the toolbar
 *   2  the instant SEO check runs in the popup
 *   3  Protect: mykavo.app opens with the site filled in, one click to add
 *   4  back on the site, the popup shows it protected, monitored in the cloud
 *   5  a critical change: the toolbar badge, the status flips, the email
 *
 * The popup and connect screens mirror the shipped extension and the
 * /connect/chrome page (wording included). Same stage approach as the other
 * landing animations (use-stage-clock.ts); phones get a portrait stage.
 */

const GOLD = "#FFD400";
const INK = "#151515";
const DIM = "#6A6A5F";
const CREAM = "#FBFAF3";
const SURFACE = "#F4F2E7";
const GREEN = "#16A34A";
const GREEN_SOFT = "#E5F6EC";
const GREEN_INK = "#147A3A";
const AMBER_SOFT = "#FDF3E0";
const AMBER_INK = "#B45309";
const RED = "#E5484D";
const RED_SOFT = "#FDEAEB";
const RED_INK = "#B91C1C";
const MONO = "var(--font-geist-mono), ui-monospace, monospace";
const DISPLAY = "var(--font-poppins), var(--font-app-sans), sans-serif";

export const CHROME_CYCLE = 18;
const STILL_T = 11.6;
const FIRST_T = 4.9;
export const SITE = "northwind.coffee";

const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const r = (x: number, a: number, b: number) => cl((x - a) / (b - a));
const ease = (x: number, a: number, b: number) => 1 - Math.pow(1 - r(x, a, b), 3);
const inOut = (x: number, a: number, b: number) => {
  const p = r(x, a, b);
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
};
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const pop = (x: number, a: number, b: number) => {
  const p = r(x, a, b);
  if (p <= 0) return 0;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};
const abs = (s: CSSProperties): CSSProperties => ({ position: "absolute", ...s });

export const STEPS = [
  { n: "01", label: "Open any page" },
  { n: "02", label: "Instant check" },
  { n: "03", label: "Protect it" },
  { n: "04", label: "Monitored 24/7" },
  { n: "05", label: "You know first" },
] as const;
const BOUNDS = [0, 3, 6.4, 10.4, 14, CHROME_CYCLE];

const CAPTIONS = [
  "Open any page and click MyKavo in the toolbar.",
  "An instant SEO check, run right in your browser. Nothing is sent anywhere.",
  "Press Protect. MyKavo opens with your website already filled in.",
  "MyKavo monitors it around the clock in the cloud. Chrome can stay closed.",
  "When something important breaks, the extension and your inbox say so first.",
];

export const CHECKS: Array<{ name: string; why: string; status: "pass" | "warn" | "fail" }> = [
  { name: "Structured data", why: "No JSON-LD - the page can't earn rich results.", status: "fail" },
  { name: "Meta description", why: "38 characters - expand toward 70-155.", status: "warn" },
  { name: "Image alt text", why: "3 of 14 images missing alt text.", status: "warn" },
  { name: "Canonical", why: "Self-referencing canonical present.", status: "pass" },
];
export const SCORE = 82;

type Pt = { x: number; y: number };
/** Eased movement through timed waypoints. */
export const path = (t: number, keys: Array<[number, Pt]>): Pt => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, p1] = keys[i];
    const [t0, p0] = keys[i - 1];
    if (t <= t1) {
      const p = inOut(t, t0, t1);
      return { x: lerp(p0.x, p1.x, p), y: lerp(p0.y, p1.y, p) };
    }
  }
  return keys[keys.length - 1][1];
};

export function chromeFrameAt(t: number) {
  const u = ((t % CHROME_CYCLE) + CHROME_CYCLE) % CHROME_CYCLE;
  let step = 0;
  for (let i = 0; i < 5; i++) if (u >= BOUNDS[i]) step = i;
  // Which tab is in front: the site, or mykavo.app's connect page.
  const onMykavo = u >= 7.8 && u < 10.5;
  // Popup states: closed, check (READY), connected status.
  const checkOpen = u >= 2.7 && u < 7.6;
  const statusOpen = u >= 10.9;
  return {
    u,
    step,
    stepP: r(u, BOUNDS[step], BOUNDS[step + 1]),
    caption: CAPTIONS[step],
    fade: Math.min(r(u, 0, 0.35), 1 - r(u, CHROME_CYCLE - 0.45, CHROME_CYCLE)),
    pageIn: ease(u, 0.2, 1.1),
    onMykavo,
    tabSwap: onMykavo ? ease(u, 7.8, 8.3) : u >= 10.5 ? ease(u, 10.5, 10.9) : 1,
    // The toolbar icon: a press ring on each click, and the alert badge.
    iconPress: Math.max(r(u, 2.45, 2.7) * (1 - r(u, 2.7, 3.1)), r(u, 10.55, 10.75) * (1 - r(u, 10.75, 11.1))),
    badge: pop(u, 14.5, 14.9),
    // READY popup.
    checkOpen,
    checkIn: checkOpen ? Math.min(pop(u, 2.7, 3.1), 1 - r(u, 7.4, 7.6)) : 0,
    ring: ease(u, 3.2, 4.6),
    score: Math.round(SCORE * ease(u, 3.2, 4.6)),
    chips: ease(u, 4.2, 4.6),
    rows: CHECKS.map((_, i) => ease(u, 3.7 + i * 0.22, 4.1 + i * 0.22)),
    protectIn: ease(u, 4.6, 5.1),
    protectPress: u >= 7.25 && u < 7.55 ? 1 : 0,
    // mykavo.app/connect/chrome
    approvePress: u >= 9.0 && u < 9.25 ? 1 : 0,
    formOut: r(u, 9.25, 9.45),
    done: ease(u, 9.45, 9.85),
    doneCheck: pop(u, 9.5, 9.9),
    // Connected popup.
    statusOpen,
    statusIn: statusOpen ? pop(u, 10.9, 11.3) : 0,
    tiles: ease(u, 11.2, 11.9),
    uptime: Math.round(lerp(0, 100, ease(u, 11.2, 12.1))),
    cloud: ease(u, 12.2, 12.7) * (1 - r(u, 13.7, 14.0)),
    critical: u >= 14.6 ? 1 : 0,
    flip: ease(u, 14.6, 15.0),
    mail: ease(u, 15.1, 15.6),
    cursor: {
      o: Math.max(r(u, 1.2, 1.5) * (1 - r(u, 2.9, 3.2)), r(u, 6.2, 6.5) * (1 - r(u, 7.6, 7.9)), r(u, 8.3, 8.5) * (1 - r(u, 9.6, 9.9)), r(u, 10.0, 10.2) * (1 - r(u, 10.8, 11.0))),
      down: (u >= 2.45 && u < 2.7) || (u >= 7.25 && u < 7.5) || (u >= 9.0 && u < 9.25) || (u >= 10.55 && u < 10.8),
    },
  };
}

export type ChromeFrame = ReturnType<typeof chromeFrameAt>;

/* ------------------------------ chrome ------------------------------ */

function Rail({ f, compact }: { f: ChromeFrame; compact: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: compact ? 5 : 8 }}>
      {STEPS.map((s, i) => {
        const on = i === f.step;
        const done = i < f.step;
        return (
          <div
            key={s.label}
            style={{
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: compact ? 34 : 40,
              padding: compact ? (on ? "0 12px 0 5px" : "0 5px") : "0 14px 0 6px",
              borderRadius: 99,
              border: `1.5px solid ${on ? INK : "rgba(21,21,21,0.14)"}`,
              background: on ? INK : "#fff",
              color: on ? "#F5F5F0" : INK,
              boxShadow: on ? `3px 3px 0 ${GOLD}` : "none",
            }}
          >
            <span
              style={{
                minWidth: 26,
                height: compact ? 24 : 26,
                padding: "0 6px",
                borderRadius: 99,
                background: on || done ? GOLD : "#F3F1E6",
                color: INK,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: MONO,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {done ? <Check size={13} strokeWidth={3} /> : compact ? i + 1 : s.n}
            </span>
            {(!compact || on) && <span style={{ fontSize: compact ? 13 : 14, fontWeight: 600, whiteSpace: "nowrap" }}>{s.label}</span>}
            {on && <span style={abs({ left: 0, bottom: 0, height: 3, width: `${f.stepP * 100}%`, background: GOLD })} />}
          </div>
        );
      })}
    </div>
  );
}

function Caption({ f, compact }: { f: ChromeFrame; compact: boolean }) {
  const o = Math.min(r(f.stepP, 0, 0.08), 1 - r(f.stepP, 0.94, 1));
  return (
    <p
      key={f.step}
      style={{
        margin: compact ? "16px 8px 0" : "18px 0 0",
        textAlign: "center",
        fontSize: compact ? 15 : 17,
        lineHeight: 1.4,
        fontWeight: 500,
        color: INK,
        opacity: f.step === 0 && f.u < 0.4 ? 1 : o,
        minHeight: compact ? 44 : 24,
      }}
    >
      {f.caption}
    </p>
  );
}

function ToolbarIcon({ f }: { f: ChromeFrame }) {
  return (
    <div style={{ position: "relative", width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: f.iconPress > 0 ? "rgba(21,21,21,0.08)" : "transparent" }}>
      {f.iconPress > 0 && <span style={abs({ inset: -4, borderRadius: 12, border: `2px solid ${GOLD}`, opacity: f.iconPress, transform: `scale(${0.8 + f.iconPress * 0.3})` })} />}
      <span style={{ width: 20, height: 20, borderRadius: 5, background: INK, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LogoMark size={14} />
      </span>
      <span
        style={abs({
          right: -3,
          bottom: -2,
          minWidth: 14,
          height: 14,
          borderRadius: 7,
          background: RED,
          color: "#fff",
          fontSize: 10,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${f.badge})`,
        })}
      >
        !
      </span>
    </div>
  );
}

function BrowserBar({ f, compact }: { f: ChromeFrame; compact: boolean }) {
  const url = f.onMykavo ? "mykavo.app/connect/chrome" : `${SITE}/shop`;
  return (
    <div style={{ background: "#ECEAE0", borderBottom: "1px solid rgba(21,21,21,0.1)" }}>
      <div style={{ height: 32, display: "flex", alignItems: "flex-end", gap: 4, padding: "0 10px" }}>
        <div style={{ display: "flex", gap: 6, alignSelf: "center", marginRight: 8 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 10, height: 10, borderRadius: 5, background: "#D3D0C3" }} />
          ))}
        </div>
        <Tab active={!f.onMykavo} label="Northwind Coffee" dot="#C2410C" compact={compact} />
        {(f.onMykavo || f.u >= 10.5) && f.u >= 7.8 && <Tab active={f.onMykavo} label="MyKavo" mark compact={compact} />}
      </div>
      <div style={{ height: 40, display: "flex", alignItems: "center", gap: 10, padding: "0 10px", background: "#fff" }}>
        <RotateCw size={14} color={DIM} />
        <div style={{ flex: 1, height: 28, borderRadius: 99, background: SURFACE, display: "flex", alignItems: "center", gap: 7, padding: "0 12px", fontSize: 12.5, color: "#4B4B43", overflow: "hidden", whiteSpace: "nowrap" }}>
          <Lock size={11} color={DIM} />
          {url}
        </div>
        <Puzzle size={16} color={DIM} />
        <ToolbarIcon f={f} />
      </div>
    </div>
  );
}

function Tab({ active, label, dot, mark, compact }: { active: boolean; label: string; dot?: string; mark?: boolean; compact: boolean }) {
  return (
    <div
      style={{
        height: 26,
        width: compact ? 120 : 170,
        borderRadius: "8px 8px 0 0",
        background: active ? "#fff" : "transparent",
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "0 10px",
        fontSize: 11.5,
        color: active ? INK : DIM,
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      {mark ? <LogoMark size={12} /> : <span style={{ width: 10, height: 10, borderRadius: 5, background: dot }} />}
      {label}
    </div>
  );
}

/* ------------------------------ the site ------------------------------ */

function SitePage({ f, compact }: { f: ChromeFrame; compact: boolean }) {
  const o = f.pageIn;
  return (
    <div style={abs({ inset: 0, background: "#F7F1EA", color: "#3B2A20", fontFamily: "Georgia, 'Times New Roman', serif", padding: compact ? "18px 18px" : "26px 36px" })}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: compact ? 12 : 13.5, opacity: o }}>
        <b>Northwind Coffee</b>
        {!compact && <span style={{ color: "#6B5848" }}>Shop · Subscribe · Journal · Cart (0)</span>}
      </div>
      <div style={{ marginTop: compact ? 26 : 34, fontSize: compact ? 30 : 46, lineHeight: 1.05, maxWidth: compact ? 260 : 460, opacity: o, transform: `translateY(${(1 - o) * 10}px)` }}>
        Small-batch coffee, roasted weekly.
      </div>
      <div style={{ marginTop: 14, fontSize: compact ? 13 : 15, lineHeight: 1.6, maxWidth: compact ? 280 : 430, color: "#6B5848", opacity: o }}>
        Single-origin beans, roasted on Mondays and shipped by Wednesday. Free delivery over $40.
      </div>
      <div style={{ display: "flex", gap: compact ? 10 : 16, marginTop: compact ? 22 : 30, opacity: o }}>
        {["#E3CDB3", "#C9B49A", "#D9C2A8"].slice(0, compact ? 2 : 3).map((c, i) => (
          <div key={c} style={{ width: compact ? 120 : 150, height: compact ? 120 : 140, borderRadius: 8, background: `linear-gradient(160deg, ${c}, #A88563)`, transform: `translateY(${(1 - ease(f.u, 0.4 + i * 0.12, 1.2 + i * 0.12)) * 12}px)` }} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ popup ------------------------------ */

function PopupFrame({ children, width, scale, origin }: { children: ReactNode; width: number; scale: number; origin: string }) {
  return (
    <div
      style={abs({
        right: 10,
        top: 6,
        width,
        borderRadius: 12,
        overflow: "hidden",
        background: CREAM,
        border: "1px solid rgba(21,21,21,0.14)",
        boxShadow: "0 18px 44px rgba(21,21,21,0.24)",
        transform: `scale(${0.92 + scale * 0.08})`,
        transformOrigin: origin,
        opacity: Math.min(1, scale * 1.4),
        zIndex: 5,
      })}
    >
      <div style={{ height: 44, display: "flex", alignItems: "center", gap: 9, padding: "0 12px", background: "#fff", borderBottom: "1px solid rgba(21,21,21,0.08)" }}>
        <LogoMark size={20} />
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 13.5 }}>MyKavo</div>
          <div style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: "0.12em", color: DIM }}>SEO &amp; WEBSITE MONITOR</div>
        </div>
      </div>
      <div style={{ padding: 10, display: "grid", gap: 8 }}>{children}</div>
    </div>
  );
}

function Ring({ value, p }: { value: number; p: number }) {
  const R = 25;
  const C = 2 * Math.PI * R;
  return (
    <div style={{ position: "relative", width: 62, height: 62, flexShrink: 0 }}>
      <svg width="62" height="62" viewBox="0 0 62 62" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="31" cy="31" r={R} fill="none" stroke={SURFACE} strokeWidth="6" />
        <circle cx="31" cy="31" r={R} fill="none" stroke={value >= 75 ? GREEN : "#F59E0B"} strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - (SCORE / 100) * p)} />
      </svg>
      <div style={abs({ inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontWeight: 700, fontSize: 19 })}>{value}</div>
    </div>
  );
}

const TONE = {
  pass: { bg: GREEN_SOFT, fg: GREEN_INK },
  warn: { bg: AMBER_SOFT, fg: AMBER_INK },
  fail: { bg: RED_SOFT, fg: RED_INK },
};

function Badge({ status }: { status: "pass" | "warn" | "fail" }) {
  const t = TONE[status];
  return (
    <span style={{ width: 17, height: 17, borderRadius: 9, background: t.bg, color: t.fg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, fontWeight: 800 }}>
      {status === "pass" ? <Check size={10} strokeWidth={3.4} /> : status === "warn" ? "!" : <X size={10} strokeWidth={3.4} />}
    </span>
  );
}

function CheckPopup({ f, width }: { f: ChromeFrame; width: number }) {
  return (
    <PopupFrame width={width} scale={f.checkIn} origin="top right">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 20, height: 20, borderRadius: 6, background: "#fff", border: "1px solid rgba(21,21,21,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ width: 9, height: 9, borderRadius: 5, background: "#C2410C" }} />
        </span>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{SITE}</div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: DIM }}>/shop</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, borderRadius: 11, background: "#fff", border: "1px solid rgba(21,21,21,0.1)" }}>
        <Ring value={f.score} p={f.ring} />
        <div>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.14em", color: DIM }}>SEO HEALTH</div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 13.5, marginTop: 2 }}>In good shape</div>
          <div style={{ display: "flex", gap: 4, marginTop: 6, opacity: f.chips }}>
            {[
              ["pass", "11 passed"],
              ["warn", "2 warnings"],
              ["fail", "1 issue"],
            ].map(([s, l]) => (
              <span key={s} style={{ padding: "2px 6px", borderRadius: 99, fontSize: 9, fontWeight: 700, background: TONE[s as "pass"].bg, color: TONE[s as "pass"].fg, whiteSpace: "nowrap" }}>
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ borderRadius: 11, background: "#fff", border: "1px solid rgba(21,21,21,0.1)", padding: "4px 6px" }}>
        {CHECKS.slice(0, 3).map((c, i) => (
          <div key={c.name} style={{ display: "flex", gap: 8, padding: "5px 4px", opacity: f.rows[i], transform: `translateY(${(1 - f.rows[i]) * 6}px)` }}>
            <Badge status={c.status} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700 }}>{c.name}</div>
              <div style={{ fontSize: 9, color: DIM, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.why}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ borderRadius: 11, background: INK, color: "#F4F2E7", padding: 11, opacity: f.protectIn, transform: `translateY(${(1 - f.protectIn) * 8}px)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 12.5, color: "#fff" }}>Protect this website</div>
            <div style={{ fontSize: 9, color: "#A3A397", marginTop: 2 }}>Continuous monitoring by MyKavo.</div>
          </div>
          <span style={{ width: 22, height: 22, borderRadius: 6, background: GOLD, color: INK, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={13} />
          </span>
        </div>
        <div
          style={{
            marginTop: 9,
            height: 28,
            borderRadius: 99,
            background: f.protectPress ? "#E6BF00" : GOLD,
            color: INK,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 700,
            transform: `translateY(${f.protectPress}px)`,
          }}
        >
          Protect {SITE} <ArrowRight size={11} />
        </div>
      </div>
    </PopupFrame>
  );
}

function StatusPopup({ f, width }: { f: ChromeFrame; width: number }) {
  const crit = f.critical === 1;
  const pill = crit ? { bg: RED_SOFT, fg: RED_INK, label: "Critical changes" } : { bg: GREEN_SOFT, fg: GREEN_INK, label: "Protected" };
  return (
    <PopupFrame width={width} scale={f.statusIn} origin="top right">
      <div style={{ borderRadius: 11, background: "#fff", border: "1px solid rgba(21,21,21,0.1)", padding: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 99, background: pill.bg, color: pill.fg, fontSize: 10, fontWeight: 700, transform: crit ? `scale(${0.9 + f.flip * 0.1})` : undefined }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: "currentColor" }} />
          {pill.label}
        </span>
        <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 17, marginTop: 7 }}>{SITE}</div>
        <div style={{ fontSize: 9.5, color: DIM, marginTop: 1 }}>{crit ? "Last checked just now · 1 critical change" : "Last checked 2 minutes ago · next in 23 hours"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 10, opacity: f.tiles }}>
          {[
            ["CRITICAL", crit ? "1" : "0", crit ? "noindex on /shop" : "nothing open", crit ? RED_INK : INK],
            ["UPTIME", `${f.uptime}%`, "last 7 days", INK],
            ["SEO", String(SCORE), "this page", INK],
          ].map(([l, v, s, c]) => (
            <div key={l} style={{ borderRadius: 8, background: SURFACE, padding: "7px 8px" }}>
              <div style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: "0.12em", color: DIM }}>{l}</div>
              <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16, marginTop: 3, color: c }}>{v}</div>
              <div style={{ fontSize: 8, color: DIM, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }}>
          <div style={{ height: 26, borderRadius: 99, background: GOLD, border: "1px solid rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>Open MyKavo</div>
          <div style={{ height: 26, borderRadius: 99, background: "#fff", border: "1px solid rgba(21,21,21,0.18)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 10, fontWeight: 700 }}>
            <RotateCw size={10} /> Scan now
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, borderRadius: 9, background: crit ? RED_SOFT : SURFACE, color: crit ? RED_INK : "#4B4B43", padding: "7px 9px", fontSize: 9.5, fontWeight: 600 }}>
        {crit ? <X size={11} strokeWidth={3} /> : <ShieldCheck size={11} />}
        {crit ? "Page became noindex - /shop is out of Google" : "Monitored in the cloud by MyKavo"}
      </div>
    </PopupFrame>
  );
}

/* ------------------------------ mykavo.app ------------------------------ */

function ConnectPage({ f, compact }: { f: ChromeFrame; compact: boolean }) {
  const w = compact ? 300 : 340;
  return (
    <div style={abs({ inset: 0, background: "#ECEEF4", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: compact ? 22 : 26 })}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: DISPLAY, fontWeight: 600, fontSize: 15 }}>
        <LogoMark size={18} /> MyKavo
      </div>
      <div style={{ position: "relative", marginTop: 14, width: w, borderRadius: 18, background: "#fff", boxShadow: "0 8px 24px rgba(22,24,29,0.08)", padding: 20, minHeight: compact ? 300 : 310 }}>
        <div style={{ opacity: 1 - f.formOut, transform: `translateY(${-f.formOut * 6}px)` }}>
          <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.16em", color: "#7F8697" }}>CHROME EXTENSION</div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 18, marginTop: 6 }}>Protect {SITE}</div>
          <div style={{ fontSize: 10.5, color: "#5C6270", marginTop: 4, lineHeight: 1.45 }}>MyKavo will monitor it around the clock for SEO, content, visual, link, performance and uptime changes.</div>
          <div style={{ marginTop: 10, borderRadius: 10, background: "#F6F7FB", padding: "8px 10px", fontSize: 11, fontWeight: 700 }}>
            {SITE}
            <div style={{ fontFamily: MONO, fontSize: 9, color: "#5C6270", fontWeight: 400 }}>/shop</div>
          </div>
          <div style={{ marginTop: 10, borderRadius: 10, background: "#F6F7FB", padding: "8px 10px", fontSize: 9.5, color: "#5C6270", lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, color: INK, display: "flex", alignItems: "center", gap: 4 }}>
              <Lock size={9} /> The extension will be able to
            </div>
            <div>✓ Show this website&apos;s monitoring status</div>
            <div>✓ Start a scan when you ask it to</div>
          </div>
          <div
            style={{
              marginTop: 12,
              height: 34,
              borderRadius: 99,
              background: f.approvePress ? "#E6BF00" : GOLD,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontSize: 11.5,
              fontWeight: 700,
              transform: `translateY(${f.approvePress}px)`,
            }}
          >
            <Plus size={12} /> Add &amp; protect {SITE}
          </div>
        </div>
        <div style={abs({ inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 22, textAlign: "center", opacity: f.done, pointerEvents: "none" })}>
          <span style={{ width: 52, height: 52, borderRadius: 26, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${f.doneCheck})` }}>
            <Check size={26} strokeWidth={2.6} />
          </span>
          <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 17, marginTop: 14 }}>{SITE} is ready</div>
          <div style={{ fontSize: 10.5, color: "#5C6270", marginTop: 6, lineHeight: 1.5 }}>Choose the pages to watch and MyKavo takes the first baseline straight away.</div>
          <span style={{ marginTop: 10, padding: "3px 9px", borderRadius: 99, background: GREEN_SOFT, color: GREEN_INK, fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            <Puzzle size={10} /> Extension connected
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ assembly ------------------------------ */

function Mail_({ f, compact }: { f: ChromeFrame; compact: boolean }) {
  if (f.mail <= 0) return null;
  return (
    <div
      style={abs({
        left: compact ? 12 : 22,
        right: compact ? 12 : undefined,
        bottom: compact ? 14 : 22,
        width: compact ? undefined : 340,
        borderRadius: 12,
        background: "#fff",
        border: `1.5px solid ${INK}`,
        boxShadow: `4px 4px 0 ${INK}`,
        padding: "10px 12px",
        display: "flex",
        gap: 10,
        opacity: f.mail,
        transform: `translateY(${(1 - f.mail) * 24}px)`,
        zIndex: 6,
      })}
    >
      <span style={{ width: 30, height: 30, borderRadius: 8, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Mail size={15} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 9.5, color: DIM }}>MyKavo · now</div>
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 1 }}>Critical changes detected on {SITE}</div>
        <div style={{ fontSize: 10.5, color: "#4B4B43", marginTop: 2 }}>/shop became noindex. Review the change →</div>
      </div>
    </div>
  );
}

function Cloud({ f, compact }: { f: ChromeFrame; compact: boolean }) {
  if (f.cloud <= 0) return null;
  return (
    <div style={abs({ left: compact ? 12 : 22, bottom: compact ? 14 : 22, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 99, background: INK, color: "#F4F2E7", fontSize: 11.5, fontWeight: 600, opacity: f.cloud, transform: `translateY(${(1 - f.cloud) * 14}px)`, zIndex: 6 })}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: "#34C979", boxShadow: `0 0 0 ${3 + 3 * Math.sin(f.u * 6)}px rgba(52,201,121,0.25)` }} />
      Health check · 200 OK · every 5 minutes
    </div>
  );
}

/**
 * The cursor's waypoints, in window pixels: the toolbar icon, Protect in the
 * popup, and Add & protect on the connect page - each a layout position.
 */
function Cursor({ f, w, h, popupW, protectY, approveY }: { f: ChromeFrame; w: number; h: number; popupW: number; protectY: number; approveY: number }) {
  if (f.cursor.o <= 0) return null;
  const icon = { x: w - 30, y: 50 };
  const protect = { x: w - 10 - popupW / 2, y: protectY };
  const p = path(f.u, [
    [1.2, { x: w * 0.5, y: h * 0.7 }],
    [2.45, icon],
    [6.2, { x: w * 0.55, y: h * 0.75 }],
    [7.25, protect],
    [8.3, { x: w * 0.62, y: h * 0.9 }],
    [9.0, { x: w * 0.5 + 40, y: approveY }],
    [10.0, { x: w * 0.6, y: h * 0.45 }],
    [10.55, icon],
  ]);
  return (
    <div style={abs({ left: p.x, top: p.y, opacity: f.cursor.o, zIndex: 10, transform: `scale(${f.cursor.down ? 0.86 : 1})`, transformOrigin: "0 0" })}>
      <MousePointer2 size={22} fill={INK} color="#fff" strokeWidth={1.5} />
    </div>
  );
}

function Window({ f, w, h, compact }: { f: ChromeFrame; w: number; h: number; compact: boolean }) {
  const bar = 72;
  const popupW = compact ? 292 : 320;
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 16, border: `1.5px solid ${INK}`, background: "#fff", overflow: "hidden", boxShadow: `8px 8px 0 ${INK}` }}>
      <BrowserBar f={f} compact={compact} />
      <div style={abs({ left: 0, right: 0, top: bar, bottom: 0, overflow: "hidden" })}>
        <div style={abs({ inset: 0, opacity: f.onMykavo ? 1 - f.tabSwap : f.tabSwap })}>
          <SitePage f={f} compact={compact} />
        </div>
        {f.onMykavo && (
          <div style={abs({ inset: 0, opacity: f.tabSwap, transform: `translateY(${(1 - f.tabSwap) * 14}px)` })}>
            <ConnectPage f={f} compact={compact} />
          </div>
        )}
        {f.checkOpen && <CheckPopup f={f} width={popupW} />}
        {f.statusOpen && <StatusPopup f={f} width={popupW} />}
        <Cloud f={f} compact={compact} />
        <Mail_ f={f} compact={compact} />
      </div>
      <Cursor f={f} w={w} h={h} popupW={popupW} protectY={compact ? 386 : 392} approveY={compact ? 362 : 366} />
    </div>
  );
}

const LABEL =
  "How the MyKavo Chrome extension works: open any page and click MyKavo for an instant SEO check, press Protect to add the website to MyKavo in one click, then the extension shows it protected and flags critical changes, with an email alert.";

function Landscape() {
  const W = 1080;
  const H = 620;
  const { wrapRef, t, k, fitted } = useStageClock(W, STILL_T, FIRST_T);
  const f = chromeFrameAt(t);
  return (
    <div ref={wrapRef} role="img" aria-label={LABEL} style={{ position: "relative", width: "100%", aspectRatio: `${W} / ${H}`, overflow: stageClip(fitted) }}>
      <div aria-hidden style={abs({ left: 0, top: 0, width: W, height: H, transform: `scale(${k})`, transformOrigin: "0 0", color: INK, opacity: f.fade })}>
        <Rail f={f} compact={false} />
        <Caption f={f} compact={false} />
        <div style={abs({ left: 0, top: 118 })}>
          <Window f={f} w={1068} h={490} compact={false} />
        </div>
      </div>
    </div>
  );
}

function Portrait() {
  const W = 400;
  const H = 680;
  const { wrapRef, t, k, fitted } = useStageClock(W, STILL_T, FIRST_T);
  const f = chromeFrameAt(t);
  return (
    <div ref={wrapRef} role="img" aria-label={LABEL} style={{ position: "relative", width: "100%", aspectRatio: `${W} / ${H}`, overflow: stageClip(fitted) }}>
      <div aria-hidden style={abs({ left: 0, top: 0, width: W, height: H, transform: `scale(${k})`, transformOrigin: "0 0", color: INK, opacity: f.fade })}>
        <Rail f={f} compact />
        <Caption f={f} compact />
        <div style={abs({ left: 0, top: 150 })}>
          <Window f={f} w={390} h={520} compact />
        </div>
      </div>
    </div>
  );
}

export function ChromeExtensionAnimation() {
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
