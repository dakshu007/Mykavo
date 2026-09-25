"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  Check,
  Gauge,
  Home,
  Image as ImageIcon,
  LayoutGrid,
  Moon,
  MousePointer2,
  Pin,
  Plug,
  RefreshCw,
  Sun,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { useStageClock } from "./use-stage-clock";

/**
 * "The night shift" - the /wordpress-plugin hero animation. One night in
 * wp-admin, in five labelled steps:
 *
 *   02:00  WordPress auto-updates three plugins while you sleep
 *   02:01  Safe Updates checks every monitored page
 *   02:03  a verdict on each update: two verified, one broke two things
 *   08:30  you open wp-admin to the change, with the update named on it
 *   later  the Plugins screen warns before WooCommerce updates again
 *
 * Every string on screen is one the plugin really shows ("Verified - nothing
 * changed", "2 changes found after this update", the Plugins-screen line).
 * Same stage approach as the other landing animations (use-stage-clock.ts);
 * phones get a portrait stage without the admin sidebar, as wp-admin does.
 */

const GOLD = "#FFD400";
const INK = "#151515";
const DIM = "#6B6B60";
const RED = "#D63638"; // WordPress admin red
const RED_INK = "#B32D2E";
const GREEN = "#00A32A"; // WordPress admin green
const WP_BLUE = "#2271B1";
const WP_SIDEBAR = "#1D2327";
const MONO = "var(--font-geist-mono), ui-monospace, monospace";

export const NIGHT_CYCLE = 17;
const STILL_T = 8.6;
const FIRST_T = 2.9;

const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const r = (x: number, a: number, b: number) => cl((x - a) / (b - a));
const ease = (x: number, a: number, b: number) => 1 - Math.pow(1 - r(x, a, b), 3);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const pop = (x: number, a: number, b: number) => {
  const p = r(x, a, b);
  if (p <= 0) return 0;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};
const span = (x: number, a: number, b: number, f = 0.35) => Math.min(r(x, a, a + f), 1 - r(x, b - f, b));
const abs = (s: CSSProperties): CSSProperties => ({ position: "absolute", ...s });

export const STEPS = [
  { time: "02:00", label: "Updates run" },
  { time: "02:01", label: "MyKavo checks" },
  { time: "02:03", label: "The verdict" },
  { time: "08:30", label: "You know first" },
  { time: "Next", label: "You're warned" },
] as const;
const BOUNDS = [0, 3.6, 6.6, 9.6, 13.2, NIGHT_CYCLE];

const CAPTIONS = [
  "WordPress updates three plugins overnight, on its own.",
  "The moment it finishes, MyKavo checks every page you monitor.",
  "Every update gets a verdict - and one of them broke two things.",
  "You open wp-admin to the change, with the update that caused it.",
  "Next time WooCommerce has an update, WordPress tells you what happened last time.",
];

export const UPDATES = [
  { name: "WooCommerce", from: "9.8.1", to: "9.9.0", changes: 2 },
  { name: "Elementor", from: "3.29.2", to: "3.30.0", changes: 0 },
  { name: "Yoast SEO", from: "25.3", to: "25.4", changes: 0 },
];

export const PAGES = ["/", "/shop", "/shop/yirgacheffe", "/cart", "/checkout", "/subscribe", "/about", "/blog"];
const BROKEN = new Set(["/shop/yirgacheffe", "/subscribe"]);

export function nightFrameAt(t: number) {
  const u = ((t % NIGHT_CYCLE) + NIGHT_CYCLE) % NIGHT_CYCLE;
  let step = 0;
  for (let i = 0; i < 5; i++) if (u >= BOUNDS[i]) step = i;
  return {
    u,
    step,
    stepP: r(u, BOUNDS[step], BOUNDS[step + 1]),
    caption: CAPTIONS[step],
    fade: Math.min(r(u, 0, 0.35), 1 - r(u, NIGHT_CYCLE - 0.45, NIGHT_CYCLE)),
    night: 1 - r(u, 9.4, 10.0),
    screen: step === 0 ? "updates" : step === 1 ? "checking" : step === 2 ? "verdict" : step === 3 ? "change" : "plugins",
    // A: three updates
    bars: UPDATES.map((_, i) => ease(u, 0.4 + i * 0.95, 1.25 + i * 0.95)),
    // B: pages checked in turn
    pages: PAGES.map((p, i) => ({ path: p, done: u >= 4.0 + i * 0.27, broken: BROKEN.has(p) })),
    checkP: r(u, 4.0, 4.0 + PAGES.length * 0.27),
    // C: verdict rows and the menu badge
    rows: UPDATES.map((_, i) => ease(u, 6.8 + i * 0.3, 7.3 + i * 0.3)),
    badge: pop(u, 7.2, 7.6),
    alertChip: pop(u, 8.1, 8.5) * (1 - r(u, 9.2, 9.5)),
    // D: the change, with a before/after wipe
    pulse: 0.5 + 0.5 * Math.sin(u * 5),
    appeared: pop(u, 10.9, 11.3),
    // E: the Plugins screen warning
    warn: r(u, 13.8, 15.2),
    cur: { o: span(u, 14.9, 16.6, 0.3), p: ease(u, 14.9, 15.7), hover: r(u, 15.7, 16.0) },
    screenIn: (at: number) => ease(u, at, at + 0.45),
  };
}

export type NightFrame = ReturnType<typeof nightFrameAt>;

/* ------------------------------ chrome ------------------------------ */

function Rail({ f, compact }: { f: NightFrame; compact: boolean }) {
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
                minWidth: compact ? 24 : 46,
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
              {done ? <Check size={13} strokeWidth={3} /> : compact ? i + 1 : s.time}
            </span>
            {(!compact || on) && <span style={{ fontSize: compact ? 13 : 14, fontWeight: 600, whiteSpace: "nowrap" }}>{s.label}</span>}
            {on && <span style={abs({ left: 0, bottom: 0, height: 3, width: `${f.stepP * 100}%`, background: GOLD })} />}
          </div>
        );
      })}
    </div>
  );
}

const MENU: Array<{ icon: typeof Home; label: string; mykavo?: boolean; active?: (s: string) => boolean }> = [
  { icon: Gauge, label: "Dashboard", active: (s) => s === "updates" },
  { icon: Pin, label: "MyKavo", mykavo: true, active: (s) => s === "checking" || s === "verdict" || s === "change" },
  { icon: Pin, label: "Posts" },
  { icon: ImageIcon, label: "Media" },
  { icon: LayoutGrid, label: "Pages" },
  { icon: Plug, label: "Plugins", active: (s) => s === "plugins" },
  { icon: Users, label: "Users" },
  { icon: Wrench, label: "Tools" },
];

function Sidebar({ f }: { f: NightFrame }) {
  return (
    <div style={{ width: 168, background: WP_SIDEBAR, paddingTop: 8, flexShrink: 0 }}>
      {MENU.map((m) => {
        const on = m.active?.(f.screen) ?? false;
        return (
          <div
            key={m.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              height: 36,
              padding: "0 12px",
              background: on ? WP_BLUE : "transparent",
              color: on ? "#fff" : "#C3C4C7",
              fontSize: 13.5,
            }}
          >
            {m.mykavo ? <LogoMark size={16} /> : <m.icon size={16} />}
            {m.label}
            {m.mykavo && (
              <span
                style={{
                  marginLeft: 4,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  background: RED,
                  color: "#fff",
                  fontSize: 10.5,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${f.badge})`,
                }}
              >
                2
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AdminBar({ f }: { f: NightFrame }) {
  const night = f.night > 0.5;
  return (
    <div style={{ height: 34, background: "#1D2327", color: "#F0F0F1", display: "flex", alignItems: "center", gap: 14, padding: "0 12px", fontSize: 12.5 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="11" fill="none" stroke="#C3C4C7" strokeWidth="1.6" />
        <text x="12" y="16.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="#C3C4C7" fontFamily="Georgia, serif">W</text>
      </svg>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Home size={14} /> Northwind Coffee
      </span>
      <span
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 10px",
          borderRadius: 99,
          background: night ? "#2C3338" : GOLD,
          color: night ? "#E9EBDF" : INK,
          fontFamily: MONO,
          fontSize: 11.5,
          fontWeight: 700,
        }}
      >
        {night ? <Moon size={12} /> : <Sun size={12} />}
        {f.step === 0 ? "02:00" : f.step === 1 ? "02:01" : f.step === 2 ? "02:03" : f.step === 3 ? "08:30" : "Tuesday"}
      </span>
      <span>Howdy, admin</span>
    </div>
  );
}

/* ------------------------------ screens ------------------------------ */

function Screen({ o, children }: { o: number; children: ReactNode }) {
  return <div style={abs({ inset: 0, padding: 22, opacity: o, transform: `translateY(${(1 - o) * 10}px)`, pointerEvents: "none" })}>{children}</div>;
}

function H({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 21, fontWeight: 600, color: "#1D2327", marginBottom: 14 }}>{children}</div>;
}

function Box({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ background: "#fff", border: "1px solid #DCDCDE", borderRadius: 8, ...style }}>{children}</div>;
}

function UpdatesScreen({ f }: { f: NightFrame }) {
  return (
    <>
      <H>WordPress Updates</H>
      <div style={{ fontSize: 13, color: "#50575E", marginBottom: 12, display: "flex", alignItems: "center", gap: 7 }}>
        <RefreshCw size={14} /> Automatic background updates are running.
      </div>
      <Box>
        {UPDATES.map((p, i) => {
          const done = f.bars[i] >= 1;
          return (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderTop: i ? "1px solid #F0F0F1" : "none" }}>
              <span style={{ width: 34, height: 34, borderRadius: 7, background: ["#7F54B3", "#92003B", "#A4286A"][i], color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {p.name[0]}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 11.5, color: "#50575E" }}>
                  {p.from} → {p.to}
                </div>
                <div style={{ marginTop: 7, height: 5, borderRadius: 4, background: "#F0F0F1", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${f.bars[i] * 100}%`, background: done ? GREEN : WP_BLUE }} />
                </div>
              </div>
              <span style={{ width: 92, textAlign: "right", fontSize: 12.5, fontWeight: 600, color: done ? GREEN : "#50575E" }}>
                {done ? "✓ Updated" : f.bars[i] > 0 ? "Updating…" : "Waiting"}
              </span>
            </div>
          );
        })}
      </Box>
    </>
  );
}

function MyKavoHeader({ tab, compact = false }: { tab: string; compact?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <LogoMark size={22} />
      <span style={{ fontSize: 19, fontWeight: 700 }}>MyKavo</span>
      <span style={{ display: "flex", gap: 4, marginLeft: 12, padding: 3, borderRadius: 99, background: "#fff", border: "1px solid #DCDCDE" }}>
        {(compact ? [tab] : ["Overview", "Changes", "Safe Updates"]).map((x) => (
          <span key={x} style={{ padding: "4px 11px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: x === tab ? INK : "transparent", color: x === tab ? "#fff" : "#50575E" }}>
            {x}
          </span>
        ))}
      </span>
    </div>
  );
}

function CheckingScreen({ f, compact }: { f: NightFrame; compact: boolean }) {
  return (
    <>
      <MyKavoHeader tab="Safe Updates" compact={compact} />
      <Box style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 600 }}>
          <RefreshCw size={15} style={{ transform: `rotate(${f.u * 240}deg)` }} />
          Checking {PAGES.length} pages after 3 updates
          <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 12, color: DIM }}>{Math.round(f.checkP * 100)}%</span>
        </div>
        <div style={{ marginTop: 10, height: 5, borderRadius: 4, background: "#F0F0F1", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${f.checkP * 100}%`, background: GOLD }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
          {f.pages.map((p) => (
            <div
              key={p.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 10px",
                borderRadius: 8,
                border: `1px solid ${p.done && p.broken ? "rgba(214,54,56,0.5)" : "#DCDCDE"}`,
                background: p.done ? (p.broken ? "#FCF0F1" : "#EDFAEF") : "#fff",
                fontFamily: MONO,
                fontSize: 11.5,
                transform: `scale(${p.done ? 1 : 0.97})`,
              }}
            >
              <span style={{ width: 16, height: 16, borderRadius: 99, flexShrink: 0, background: p.done ? (p.broken ? RED : GREEN) : "#DCDCDE", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {p.done && (p.broken ? <X size={10} strokeWidth={3} /> : <Check size={10} strokeWidth={3} />)}
              </span>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.path}</span>
            </div>
          ))}
        </div>
      </Box>
    </>
  );
}

function VerdictScreen({ f, compact }: { f: NightFrame; compact: boolean }) {
  return (
    <>
      <MyKavoHeader tab="Safe Updates" compact={compact} />
      <Box>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #F0F0F1", fontSize: 14, fontWeight: 600 }}>Update history</div>
        {UPDATES.map((p, i) => {
          const bad = p.changes > 0;
          return (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderTop: i ? "1px solid #F0F0F1" : "none", opacity: f.rows[i], transform: `translateX(${(1 - f.rows[i]) * 14}px)` }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #DCDCDE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Plug size={14} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                  Auto-updated {p.name} {p.from} → {p.to}
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    marginTop: 5,
                    padding: "3px 8px",
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: 700,
                    background: bad ? "#FCF0F1" : "#EDFAEF",
                    color: bad ? RED_INK : "#007017",
                  }}
                >
                  {bad ? <X size={11} strokeWidth={3} /> : <Check size={11} strokeWidth={3} />}
                  {bad ? `${p.changes} changes found after this update` : "Verified - nothing changed"}
                </span>
              </div>
              {bad && !compact && <span style={{ padding: "7px 12px", borderRadius: 99, background: INK, color: "#fff", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>Review changes ›</span>}
            </div>
          );
        })}
      </Box>
      <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 99, background: INK, color: "#E9EBDF", fontSize: 12, transform: `scale(${f.alertChip})`, transformOrigin: "left center" }}>
        <span style={{ width: 7, height: 7, borderRadius: 7, background: GOLD }} /> Email alert sent · 02:03
      </div>
    </>
  );
}

function MiniPage({ button, pulse = 0, compact = false }: { button: boolean; pulse?: number; compact?: boolean }) {
  return (
    <div style={{ height: "100%", padding: 14, background: "#FBFAF6" }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: compact ? 64 : 110, height: compact ? 64 : 88, borderRadius: 8, flexShrink: 0, background: "linear-gradient(145deg,#B08968,#6B4226)" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Ethiopia Yirgacheffe</div>
          {!compact && <div style={{ fontSize: 11, color: DIM, marginTop: 3 }}>Bright, floral, bergamot.</div>}
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: compact ? 3 : 8 }}>$18.00</div>
          <div
            style={{
              marginTop: compact ? 5 : 8,
              width: compact ? 84 : 92,
              height: compact ? 22 : 26,
              borderRadius: 99,
              background: button ? "#C97B2E" : "transparent",
              border: button ? "none" : `1.5px dashed rgba(214,54,56,${0.5 + pulse * 0.5})`,
              boxShadow: button ? "none" : `0 0 0 ${pulse * 5}px rgba(214,54,56,0.15)`,
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {button ? "Add to cart" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChangeScreen({ f, compact }: { f: NightFrame; compact: boolean }) {
  return (
    <>
      <MyKavoHeader tab="Changes" compact={compact} />
      <Box style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ padding: "3px 8px", borderRadius: 99, background: "#FCF0F1", color: RED_INK, fontSize: 10.5, fontWeight: 800, fontFamily: MONO }}>● CRITICAL</span>
          <span style={{ fontSize: 12, color: DIM }}>Conversion · /shop/yirgacheffe</span>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, marginTop: 8 }}>“Add to cart” button is missing</div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 8,
            padding: "4px 10px",
            borderRadius: 99,
            background: GOLD,
            color: INK,
            fontSize: 12,
            fontWeight: 700,
            transform: `scale(${f.appeared})`,
            transformOrigin: "left center",
          }}
        >
          <Plug size={12} /> Appeared after: WooCommerce 9.8.1 → 9.9.0
        </span>
        <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 10, marginTop: 12 }}>
          {[
            { label: "BEFORE · baseline", button: true },
            { label: "AFTER · 02:01", button: false },
          ].map((pane) => (
            <div key={pane.label} style={{ position: "relative", height: compact ? 94 : 126, borderRadius: 8, overflow: "hidden", border: `1px solid ${pane.button ? "#DCDCDE" : "rgba(214,54,56,0.45)"}` }}>
              <MiniPage button={pane.button} pulse={pane.button ? 0 : f.pulse} compact={compact} />
              <span style={abs({ right: 8, top: 8, fontFamily: MONO, fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: pane.button ? "#fff" : INK, color: pane.button ? INK : "#fff", border: "1px solid #DCDCDE" })}>
                {pane.label}
              </span>
            </div>
          ))}
        </div>
      </Box>
    </>
  );
}

function PluginsScreen({ f, compact }: { f: NightFrame; compact: boolean }) {
  const warning = "MyKavo: last time this plugin updated (9.8.1 to 9.9.0), 2 things changed on your site.";
  return (
    <>
      <H>Plugins</H>
      <Box>
        <div style={{ padding: "14px 16px", borderLeft: `4px solid ${WP_BLUE}` }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>WooCommerce</div>
          <div style={{ fontSize: 12, color: "#50575E", marginTop: 3 }}>Version 9.9.0 | By Automattic | View details</div>
          <div style={{ fontSize: 12.5, color: RED_INK, fontWeight: 600, marginTop: 6, minHeight: compact ? 34 : 18, lineHeight: 1.4 }}>
            {warning.slice(0, Math.round(f.warn * warning.length))}
          </div>
        </div>
        <div style={{ position: "relative", margin: "0 16px 14px", padding: "10px 12px", background: "#FCF9E8", borderLeft: "4px solid #DBA617", fontSize: 12.5, color: "#1D2327" }}>
          There is a new version of WooCommerce available.{" "}
          <span style={{ color: WP_BLUE, textDecoration: "underline", fontWeight: f.cur.hover > 0.5 ? 700 : 400 }}>Update now</span>
        </div>
        {["Elementor", "Yoast SEO"].map((n) => (
          <div key={n} style={{ padding: "12px 16px", borderTop: "1px solid #F0F0F1", fontSize: 13.5, fontWeight: 600, color: "#50575E" }}>
            {n}
          </div>
        ))}
      </Box>
    </>
  );
}

/* ------------------------------ stages ------------------------------ */

function Window({ f, w, h, compact }: { f: NightFrame; w: number; h: number; compact: boolean }) {
  const s = f.screenIn;
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        borderRadius: 14,
        border: `1.5px solid ${INK}`,
        overflow: "hidden",
        background: "#F0F0F1",
        boxShadow: `10px 10px 0 ${GOLD}, 10px 10px 0 1.5px ${INK}`,
      }}
    >
      <AdminBar f={f} />
      <div style={{ display: "flex", height: h - 34 }}>
        {!compact && <Sidebar f={f} />}
        <div style={{ position: "relative", flex: 1 }}>
          {f.screen === "updates" && (
            <Screen o={s(0)}>
              <UpdatesScreen f={f} />
            </Screen>
          )}
          {f.screen === "checking" && (
            <Screen o={s(3.6)}>
              <CheckingScreen f={f} compact={compact} />
            </Screen>
          )}
          {f.screen === "verdict" && (
            <Screen o={s(6.6)}>
              <VerdictScreen f={f} compact={compact} />
            </Screen>
          )}
          {f.screen === "change" && (
            <Screen o={s(9.6)}>
              <ChangeScreen f={f} compact={compact} />
            </Screen>
          )}
          {f.screen === "plugins" && (
            <Screen o={s(13.2)}>
              <PluginsScreen f={f} compact={compact} />
            </Screen>
          )}
          {/* night tint */}
          <div style={abs({ inset: 0, background: "rgba(16,24,48,0.07)", opacity: f.night, pointerEvents: "none" })} />
          <div
            style={abs({
              left: lerp(compact ? 300 : 560, compact ? 250 : 398, f.cur.p),
              top: lerp(compact ? 360 : 330, compact ? 222 : 188, f.cur.p),
              opacity: f.cur.o,
              filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.35))",
            })}
          >
            <MousePointer2 size={24} fill="#fff" color={INK} strokeWidth={1.6} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Caption({ f, compact }: { f: NightFrame; compact: boolean }) {
  return (
    <div style={{ textAlign: "center", marginTop: compact ? 14 : 18, fontSize: compact ? 18 : 23, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.3, color: INK, opacity: ease(f.u, BOUNDS[f.step], BOUNDS[f.step] + 0.4) }}>
      {f.caption}
    </div>
  );
}

const LABEL =
  "Animation: one night with the MyKavo WordPress plugin. At 02:00 WordPress auto-updates WooCommerce, Elementor and Yoast SEO. At 02:01 MyKavo checks eight monitored pages. At 02:03 each update gets a verdict: Elementor and Yoast are verified with nothing changed; WooCommerce 9.8.1 to 9.9.0 has two changes found after it, and an email alert is sent. At 08:30 the admin opens the change - the Add to cart button is missing - labelled with the update it appeared after. Next time WooCommerce has an update, the Plugins screen warns that last time it updated, 2 things changed on the site.";

function Landscape() {
  const W = 1080;
  const H = 610;
  const { wrapRef, t, k } = useStageClock(W, STILL_T, FIRST_T);
  const f = nightFrameAt(t);
  return (
    <div ref={wrapRef} role="img" aria-label={LABEL} style={{ position: "relative", width: "100%", aspectRatio: `${W} / ${H}` }}>
      <div aria-hidden style={abs({ left: 0, top: 0, width: W, height: H, transform: `scale(${k})`, transformOrigin: "0 0", color: INK, opacity: f.fade })}>
        <Rail f={f} compact={false} />
        <Caption f={f} compact={false} />
        <div style={abs({ left: 0, top: 118 })}>
          <Window f={f} w={1068} h={480} compact={false} />
        </div>
      </div>
    </div>
  );
}

function Portrait() {
  const W = 400;
  const H = 640;
  const { wrapRef, t, k } = useStageClock(W, STILL_T, FIRST_T);
  const f = nightFrameAt(t);
  return (
    <div ref={wrapRef} role="img" aria-label={LABEL} style={{ position: "relative", width: "100%", aspectRatio: `${W} / ${H}` }}>
      <div aria-hidden style={abs({ left: 0, top: 0, width: W, height: H, transform: `scale(${k})`, transformOrigin: "0 0", color: INK, opacity: f.fade })}>
        <Rail f={f} compact />
        <div style={{ height: 100 }}>
          <Caption f={f} compact />
        </div>
        <div style={abs({ left: 0, top: 150 })}>
          <Window f={f} w={388} h={478} compact />
        </div>
      </div>
    </div>
  );
}

export function WpNightShiftAnimation() {
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

