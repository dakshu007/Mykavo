"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  AppWindow,
  BarChart3,
  Check,
  FileText,
  Home,
  Megaphone,
  MousePointer2,
  Package,
  Percent,
  RefreshCw,
  Search,
  Store,
  Tag,
  Users,
  X,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { useStageClock } from "./use-stage-clock";

/**
 * The /shopify-app hero animation: a theme publish, inside the Shopify
 * admin, in five labelled steps.
 *
 *   1 Publish  - the merchant publishes "Dawn (Summer sale)"
 *   2 Check    - MyKavo checks the monitored store pages
 *   3 Verdict  - Theme checks: "3 changes found after this change"
 *   4 Evidence - the missing Add to cart button, found after that theme
 *   5 Fixed    - "Marked as resolved.", and nothing needs attention
 *
 * Every string in the MyKavo screens is one the Shopify app really shows.
 * The admin chrome is a neutral sketch of Shopify's layout, not a copy of
 * its logo or artwork. Same stage approach as the other landing
 * animations (use-stage-clock.ts); phones get a portrait stage without the
 * admin sidebar.
 */

const GOLD = "#FFD400";
const INK = "#151515";
const DIM = "#616161";
const RED_INK = "#B42318";
const GREEN = "#1A7F37";
const SHOP_BG = "#F1F1F1";
const SHOP_NAV = "#EBEBEB";
const SHOP_TOP = "#1A1A1A";
const MONO = "var(--font-geist-mono), ui-monospace, monospace";

export const SHOP_CYCLE = 17;
const STILL_T = 11;
const FIRST_T = 1.2;

const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const r = (x: number, a: number, b: number) => cl((x - a) / (b - a));
const ease = (x: number, a: number, b: number) => 1 - Math.pow(1 - r(x, a, b), 3);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const bell = (x: number, a: number, b: number) => Math.sin(Math.PI * r(x, a, b));
const span = (x: number, a: number, b: number, f = 0.3) => Math.min(r(x, a, a + f), 1 - r(x, b - f, b));
const pop = (x: number, a: number, b: number) => {
  const p = r(x, a, b);
  if (p <= 0) return 0;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};
const abs = (s: CSSProperties): CSSProperties => ({ position: "absolute", ...s });

export const STEPS = ["Publish", "Check", "Verdict", "Evidence", "Fixed"] as const;
const BOUNDS = [0, 3.4, 6.4, 9.4, 12.8, SHOP_CYCLE];

const CAPTIONS = [
  "You publish a new theme - the summer sale goes live.",
  "The moment it is live, MyKavo checks your store pages.",
  "Every theme change gets a verdict. This one broke three things.",
  "The evidence, with the theme change that caused it.",
  "Fix it, mark it fixed - and the store is verified again.",
];

export const STORE_PAGES = [
  { label: "Home page", broken: false },
  { label: "All products", broken: false },
  { label: "Ethiopia Yirgacheffe", broken: true },
  { label: "Cart", broken: true },
  { label: "Search", broken: false },
  { label: "Summer sale", broken: false },
];

export function shopFrameAt(t: number) {
  const u = ((t % SHOP_CYCLE) + SHOP_CYCLE) % SHOP_CYCLE;
  let step = 0;
  for (let i = 0; i < 5; i++) if (u >= BOUNDS[i]) step = i;
  return {
    u,
    step,
    stepP: r(u, BOUNDS[step], BOUNDS[step + 1]),
    caption: CAPTIONS[step],
    fade: Math.min(r(u, 0, 0.35), 1 - r(u, SHOP_CYCLE - 0.45, SHOP_CYCLE)),
    screen: step === 0 ? "themes" : step === 1 ? "checking" : step === 2 ? "verdict" : "change",
    in: (at: number) => ease(u, at, at + 0.45),
    // 1: publish
    published: u >= 1.9,
    publishPress: bell(u, 1.6, 1.95),
    toast: span(u, 2.0, 3.3, 0.25),
    // 2: checking
    pages: STORE_PAGES.map((p, i) => ({ ...p, done: u >= 3.9 + i * 0.35 })),
    checkP: r(u, 3.9, 3.9 + STORE_PAGES.length * 0.35),
    // 3: verdict
    rows: [0, 1].map((i) => ease(u, 6.6 + i * 0.3, 7.1 + i * 0.3)),
    tabBadge: pop(u, 6.8, 7.2),
    // 4-5: evidence, then fixed
    found: pop(u, 10.0, 10.4),
    pulse: 0.5 + 0.5 * Math.sin(u * 5),
    cur: {
      o: Math.max(span(u, 0.9, 2.1, 0.25), span(u, 12.9, 14.3, 0.25)),
      // publish button, then "Fixed"
      x: u < 5 ? lerp(640, 552, ease(u, 0.9, 1.55)) : lerp(640, 196, ease(u, 12.9, 13.6)),
      y: u < 5 ? lerp(420, 218, ease(u, 0.9, 1.55)) : lerp(420, 406, ease(u, 12.9, 13.6)),
      click: Math.max(bell(u, 1.6, 1.95), bell(u, 13.7, 14.0)),
    },
    resolvedToast: span(u, 14.0, 15.3, 0.25),
    clear: pop(u, 15.0, 15.4),
  };
}

export type ShopFrame = ReturnType<typeof shopFrameAt>;

/* ------------------------------ chrome ------------------------------ */

function Rail({ f, compact }: { f: ShopFrame; compact: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: compact ? 5 : 8 }}>
      {STEPS.map((label, i) => {
        const on = i === f.step;
        const done = i < f.step;
        return (
          <div
            key={label}
            style={{
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: compact ? 34 : 40,
              padding: compact ? (on ? "0 12px 0 5px" : "0 5px") : "0 16px 0 6px",
              borderRadius: 99,
              border: `1.5px solid ${on ? INK : "rgba(21,21,21,0.14)"}`,
              background: on ? INK : "#fff",
              color: on ? "#F5F5F0" : INK,
              boxShadow: on ? `3px 3px 0 ${GOLD}` : "none",
            }}
          >
            <span style={{ width: compact ? 24 : 26, height: compact ? 24 : 26, borderRadius: 99, background: on || done ? GOLD : "#F3F1E6", color: INK, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 11, fontWeight: 700 }}>
              {done ? <Check size={13} strokeWidth={3} /> : i + 1}
            </span>
            {(!compact || on) && <span style={{ fontSize: compact ? 13 : 14, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>}
            {on && <span style={abs({ left: 0, bottom: 0, height: 3, width: `${f.stepP * 100}%`, background: GOLD })} />}
          </div>
        );
      })}
    </div>
  );
}

const NAV = [
  { icon: Home, label: "Home" },
  { icon: Tag, label: "Orders" },
  { icon: Package, label: "Products" },
  { icon: Users, label: "Customers" },
  { icon: FileText, label: "Content" },
  { icon: BarChart3, label: "Analytics" },
  { icon: Megaphone, label: "Marketing" },
  { icon: Percent, label: "Discounts" },
];

function Sidebar({ f }: { f: ShopFrame }) {
  const themes = f.screen === "themes";
  return (
    <div style={{ width: 176, background: SHOP_NAV, padding: "10px 8px", flexShrink: 0, borderRight: "1px solid #DDD" }}>
      {NAV.map((n) => (
        <div key={n.label} style={{ display: "flex", alignItems: "center", gap: 9, height: 30, padding: "0 10px", fontSize: 13, color: "#303030", fontWeight: 500 }}>
          <n.icon size={15} color="#4A4A4A" /> {n.label}
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: DIM, fontWeight: 600, padding: "12px 10px 4px" }}>Sales channels</div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, height: 30, padding: "0 10px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: themes ? "#fff" : "transparent", color: "#303030" }}>
        <Store size={15} /> Online Store
      </div>
      <div style={{ fontSize: 11.5, color: DIM, fontWeight: 600, padding: "12px 10px 4px" }}>Apps</div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, height: 30, padding: "0 10px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: themes ? "transparent" : "#fff", color: "#303030" }}>
        <LogoMark size={15} /> MyKavo
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <div style={{ height: 44, background: SHOP_TOP, display: "flex", alignItems: "center", gap: 12, padding: "0 14px", color: "#E3E3E3" }}>
      <span style={{ width: 24, height: 24, borderRadius: 6, background: "#303030", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AppWindow size={14} />
      </span>
      <span style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, width: 360, maxWidth: "70%", height: 28, padding: "0 12px", borderRadius: 8, background: "#303030", color: "#A8A8A8", fontSize: 12.5 }}>
          <Search size={13} /> Search
        </span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
        <span style={{ width: 24, height: 24, borderRadius: 6, background: "#C97B2E", color: "#fff", fontWeight: 800, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>NC</span>
        Northwind Coffee
      </span>
    </div>
  );
}

/* ------------------------------ screens ------------------------------ */

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 0 rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)", ...style }}>{children}</div>;
}

function Screen({ o, children }: { o: number; children: ReactNode }) {
  return <div style={abs({ inset: 0, padding: 20, opacity: o, transform: `translateY(${(1 - o) * 10}px)` })}>{children}</div>;
}

function ThemesScreen({ f }: { f: ShopFrame }) {
  return (
    <>
      <div style={{ fontSize: 19, fontWeight: 700, color: "#303030", marginBottom: 14 }}>Themes</div>
      <Card style={{ padding: 16, display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ width: 150, height: 92, borderRadius: 8, overflow: "hidden", background: f.published ? "linear-gradient(135deg,#FFD9A8,#F4A259)" : "linear-gradient(135deg,#E8E2D6,#C9BFAE)", flexShrink: 0, transition: "background 400ms" }}>
          <div style={{ height: 14, background: "rgba(0,0,0,0.12)" }} />
          <div style={{ margin: 10, height: 10, width: 70, borderRadius: 3, background: "rgba(0,0,0,0.3)" }} />
          <div style={{ margin: "0 10px", height: 26, borderRadius: 4, background: "rgba(255,255,255,0.55)" }} />
        </div>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#CDFEE1", color: "#0C5132" }}>Current theme</span>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>{f.published ? "Dawn (Summer sale)" : "Dawn"}</div>
          <div style={{ fontSize: 12, color: DIM, marginTop: 2 }}>{f.published ? "Published just now" : "Published 3 weeks ago"}</div>
        </div>
      </Card>
      <div style={{ fontSize: 14, fontWeight: 650, margin: "16px 0 8px", color: "#303030" }}>Theme library</div>
      <Card style={{ padding: 14, display: "flex", alignItems: "center", gap: 14, opacity: f.published ? 0.45 : 1 }}>
        <div style={{ width: 64, height: 40, borderRadius: 6, background: "linear-gradient(135deg,#FFD9A8,#F4A259)" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 650 }}>Dawn (Summer sale)</div>
          <div style={{ fontSize: 12, color: DIM }}>Last saved yesterday</div>
        </div>
        <span style={{ padding: "6px 14px", borderRadius: 8, background: "#303030", color: "#fff", fontSize: 12.5, fontWeight: 650, transform: `scale(${1 - f.publishPress * 0.08})` }}>Publish</span>
      </Card>
    </>
  );
}

function AppHeader({ tab, f, compact }: { tab: string; f: ShopFrame; compact: boolean }) {
  const tabs = compact ? [tab] : ["Overview", "Changes", "Theme checks", "Scans", "Pages"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
      <LogoMark size={20} />
      <span style={{ fontSize: 17, fontWeight: 700 }}>MyKavo</span>
      <span style={{ display: "flex", gap: 3, marginLeft: 8, padding: 3, borderRadius: 99, background: "#fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.08)" }}>
        {tabs.map((x) => (
          <span key={x} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: x === tab ? INK : "transparent", color: x === tab ? "#fff" : DIM }}>
            {x}
            {x === "Changes" && f.step >= 2 && f.step < 4 && (
              <span style={{ minWidth: 16, height: 16, borderRadius: 8, background: GOLD, color: INK, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${f.tabBadge})` }}>3</span>
            )}
          </span>
        ))}
      </span>
    </div>
  );
}

function CheckingScreen({ f, compact }: { f: ShopFrame; compact: boolean }) {
  return (
    <>
      <AppHeader tab="Theme checks" f={f} compact={compact} />
      <Card style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 650 }}>
          <RefreshCw size={15} style={{ transform: `rotate(${f.u * 240}deg)` }} />
          Theme check · Published theme Dawn (Summer sale)
        </div>
        <div style={{ marginTop: 10, height: 5, borderRadius: 4, background: "#F1F1F1", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${f.checkP * 100}%`, background: GOLD }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr 1fr" : "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
          {f.pages.map((p) => (
            <div
              key={p.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 11px",
                borderRadius: 10,
                background: p.done ? (p.broken ? "#FEE9E8" : "#E3F6E9") : "#F7F7F7",
                border: `1px solid ${p.done && p.broken ? "rgba(180,35,24,0.35)" : "transparent"}`,
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              <span style={{ width: 18, height: 18, borderRadius: 99, flexShrink: 0, background: p.done ? (p.broken ? RED_INK : GREEN) : "#D4D4D4", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {p.done && (p.broken ? <X size={11} strokeWidth={3} /> : <Check size={11} strokeWidth={3} />)}
              </span>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function VerdictScreen({ f, compact }: { f: ShopFrame; compact: boolean }) {
  const rows = [
    { title: "Published theme Dawn (Summer sale)", when: "just now", bad: true },
    { title: "Edited theme Dawn", when: "3 days ago", bad: false },
  ];
  return (
    <>
      <AppHeader tab="Theme checks" f={f} compact={compact} />
      <Card>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEE", fontSize: 14, fontWeight: 650 }}>Theme changes</div>
        {rows.map((row, i) => (
          <div key={row.title} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderTop: i ? "1px solid #EEE" : "none", opacity: f.rows[i], transform: `translateX(${(1 - f.rows[i]) * 14}px)` }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: "#F1F1F1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Store size={14} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 650 }}>{row.title}</div>
              <div style={{ fontSize: 11.5, color: DIM }}>{row.when}</div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 5, padding: "3px 8px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, background: row.bad ? "#FEE9E8" : "#E3F6E9", color: row.bad ? RED_INK : GREEN }}>
                {row.bad ? <X size={11} strokeWidth={3} /> : <Check size={11} strokeWidth={3} />}
                {row.bad ? "3 changes found after this change" : "Verified - nothing changed"}
              </span>
            </div>
            {row.bad && !compact && <span style={{ padding: "7px 12px", borderRadius: 99, background: INK, color: "#fff", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>Review changes ›</span>}
          </div>
        ))}
      </Card>
    </>
  );
}

function ProductPane({ button, pulse, compact }: { button: boolean; pulse: number; compact: boolean }) {
  return (
    <div style={{ height: "100%", padding: 12, background: "#FFFDF8", display: "flex", gap: 12 }}>
      <div style={{ width: compact ? 60 : 96, height: compact ? 60 : 84, borderRadius: 8, flexShrink: 0, background: "linear-gradient(145deg,#B08968,#6B4226)" }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Ethiopia Yirgacheffe</div>
        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>$18.00</div>
        <div
          style={{
            marginTop: 7,
            width: compact ? 88 : 100,
            height: 26,
            borderRadius: 99,
            background: button ? INK : "transparent",
            color: "#fff",
            border: button ? "none" : `1.5px dashed rgba(180,35,24,${0.5 + pulse * 0.5})`,
            boxShadow: button ? "none" : `0 0 0 ${pulse * 5}px rgba(180,35,24,0.12)`,
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
  );
}

function ChangeScreen({ f, compact }: { f: ShopFrame; compact: boolean }) {
  const resolved = f.u >= 14.0;
  return (
    <>
      <AppHeader tab="Changes" f={f} compact={compact} />
      <Card style={{ padding: 16, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ padding: "3px 8px", borderRadius: 99, background: resolved ? "#E3F6E9" : "#FEE9E8", color: resolved ? GREEN : RED_INK, fontSize: 10.5, fontWeight: 800, fontFamily: MONO }}>{resolved ? "✓ RESOLVED" : "● CRITICAL"}</span>
          <span style={{ fontSize: 12, color: DIM }}>Conversion · /products/ethiopia-yirgacheffe</span>
        </div>
        <div style={{ fontSize: 16.5, fontWeight: 700, marginTop: 8 }}>“Add to cart” button is missing</div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, padding: "4px 10px", borderRadius: 99, background: GOLD, color: INK, fontSize: 12, fontWeight: 700, transform: `scale(${f.found})`, transformOrigin: "left center" }}>
          <Store size={12} /> Found after: Published theme Dawn (Summer sale)
        </span>
        <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 10, marginTop: 12 }}>
          {[
            { label: "BEFORE · baseline", button: true },
            { label: resolved ? "AFTER · rescanned" : "AFTER · theme change", button: resolved },
          ].map((pane) => (
            <div key={pane.label} style={{ position: "relative", height: compact ? 84 : 108, borderRadius: 8, overflow: "hidden", border: `1px solid ${pane.button ? "#E3E3E3" : "rgba(180,35,24,0.4)"}` }}>
              <ProductPane button={pane.button} pulse={pane.button ? 0 : f.pulse} compact={compact} />
              <span style={abs({ right: 8, top: 8, fontFamily: MONO, fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: pane.button ? "#fff" : INK, color: pane.button ? INK : "#fff", border: "1px solid #E3E3E3" })}>{pane.label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {["Approve change", "Fixed", "Ignore"].map((b) => (
            <span
              key={b}
              style={{
                padding: "7px 13px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 650,
                background: b === "Fixed" ? INK : "#fff",
                color: b === "Fixed" ? "#fff" : "#303030",
                boxShadow: b === "Fixed" ? "none" : "0 0 0 1px rgba(0,0,0,0.12)",
                transform: b === "Fixed" ? `scale(${1 - f.cur.click * 0.08})` : undefined,
              }}
            >
              {b}
            </span>
          ))}
        </div>
      </Card>
      <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 12, background: "#E3F6E9", color: GREEN, fontSize: 13, fontWeight: 650, transform: `scale(${f.clear})`, transformOrigin: "left center" }}>
        <Check size={15} strokeWidth={3} /> Nothing important changed since your last approved baseline.
      </div>
    </>
  );
}

/* ------------------------------ stages ------------------------------ */

function Window({ f, w, h, compact }: { f: ShopFrame; w: number; h: number; compact: boolean }) {
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 14, border: `1.5px solid ${INK}`, overflow: "hidden", background: SHOP_BG, boxShadow: `10px 10px 0 ${GOLD}, 10px 10px 0 1.5px ${INK}` }}>
      <TopBar />
      <div style={{ display: "flex", height: h - 44 }}>
        {!compact && <Sidebar f={f} />}
        <div style={{ position: "relative", flex: 1 }}>
          {f.screen === "themes" && (
            <Screen o={f.in(0)}>
              <ThemesScreen f={f} />
            </Screen>
          )}
          {f.screen === "checking" && (
            <Screen o={f.in(3.4)}>
              <CheckingScreen f={f} compact={compact} />
            </Screen>
          )}
          {f.screen === "verdict" && (
            <Screen o={f.in(6.4)}>
              <VerdictScreen f={f} compact={compact} />
            </Screen>
          )}
          {f.screen === "change" && (
            <Screen o={f.in(9.4)}>
              <ChangeScreen f={f} compact={compact} />
            </Screen>
          )}
          {/* Shopify-style toasts */}
          {[
            { o: f.toast, text: "Dawn (Summer sale) published" },
            { o: f.resolvedToast, text: "Marked as resolved." },
          ].map((toast) => (
            <div key={toast.text} style={abs({ left: "50%", bottom: 18, transform: `translate(-50%, ${(1 - toast.o) * 12}px)`, opacity: toast.o, padding: "9px 16px", borderRadius: 10, background: "#1A1A1A", color: "#fff", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" })}>
              {toast.text}
            </div>
          ))}
          <div style={abs({ left: compact ? f.cur.x * 0.52 : f.cur.x, top: f.cur.y, opacity: f.cur.o, transform: `scale(${1 - f.cur.click * 0.15})`, filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.35))" })}>
            <MousePointer2 size={24} fill="#fff" color={INK} strokeWidth={1.6} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Caption({ f, compact }: { f: ShopFrame; compact: boolean }) {
  return (
    <div style={{ textAlign: "center", marginTop: compact ? 14 : 18, fontSize: compact ? 18 : 23, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.3, color: INK, opacity: ease(f.u, BOUNDS[f.step], BOUNDS[f.step] + 0.4) }}>
      {f.caption}
    </div>
  );
}

const LABEL =
  "Animation: MyKavo inside the Shopify admin. The merchant publishes the theme Dawn (Summer sale). MyKavo checks six store pages; the product page and cart fail. Theme checks shows: Published theme Dawn (Summer sale) - 3 changes found after this change. The change: the Add to cart button is missing, found after that theme change, with before and after. The merchant presses Fixed, the change is marked as resolved, and nothing important has changed since the last approved baseline.";

function Landscape() {
  const W = 1080;
  const H = 610;
  const { wrapRef, t, k } = useStageClock(W, STILL_T, FIRST_T);
  const f = shopFrameAt(t);
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
  const H = 660;
  const { wrapRef, t, k } = useStageClock(W, STILL_T, FIRST_T);
  const f = shopFrameAt(t);
  return (
    <div ref={wrapRef} role="img" aria-label={LABEL} style={{ position: "relative", width: "100%", aspectRatio: `${W} / ${H}` }}>
      <div aria-hidden style={abs({ left: 0, top: 0, width: W, height: H, transform: `scale(${k})`, transformOrigin: "0 0", color: INK, opacity: f.fade })}>
        <Rail f={f} compact />
        <div style={{ height: 100 }}>
          <Caption f={f} compact />
        </div>
        <div style={abs({ left: 0, top: 150 })}>
          <Window f={f} w={388} h={498} compact />
        </div>
      </div>
    </div>
  );
}

export function ShopifyAdminAnimation() {
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
