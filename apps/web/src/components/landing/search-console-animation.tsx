"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import { BarChart3, Check, MousePointer2, RefreshCw, TrendingDown } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { useStageClock } from "./use-stage-clock";

/**
 * The homepage Search Console animation, in five labelled steps:
 *
 *   1 Connect    - one click, read-only; pick the property
 *   2 Sync       - clicks, impressions, CTR and position fill in
 *   3 Drop       - clicks on /subscriptions fall 38% from Sep 12
 *   4 Why        - MyKavo's change history slides under the chart: the
 *                  canonical URL and title changed two days before the drop
 *   5 Prioritize - Priority Opportunities sort by what wins traffic back
 *
 * The chart is the story: Google's line says *what* happened, MyKavo's
 * change lane underneath says *why*. Every MyKavo string is one the real
 * Search Console dashboard shows (Priority Opportunities, "What changed
 * before the drop", "Likely cause found", the opportunity reasons). The
 * data is illustrative and the numbers are internally consistent (the drop
 * card's 412 → 255 is the chart's own 7-day sums). Same stage approach as
 * the other landing animations (use-stage-clock.ts); phones get a portrait
 * stage. The section is dark, so the stage itself stays transparent.
 */

const GOLD = "#FFD400";
const INK = "#151515";
const DIM = "#6B6B60";
const RED_INK = "#B42318";
const RED_SOFT = "#FEE9E8";
const AMBER_INK = "#93370D";
const AMBER_SOFT = "#FEF0C7";
const GREEN = "#1A7F37";
const PAPER = "#F6F5EF";
const LIGHT = "#E9EBDF";
const MONO = "var(--font-geist-mono), ui-monospace, monospace";

export const GSC_CYCLE = 19;
const STILL_T = 16.9;
const FIRST_T = 13.2;

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
const fmt = (n: number) => n.toLocaleString("en-US");

export const STEPS = ["Connect", "Sync", "Drop", "Why", "Prioritize"] as const;
const BOUNDS = [0, 3.6, 7.4, 10.8, 14.4, GSC_CYCLE];

const CAPTIONS = [
  "Connect Google in one click - read-only, tokens encrypted.",
  "Clicks, impressions, CTR and position sync every day.",
  "Clicks on /subscriptions fall 38%. Google shows you what.",
  "MyKavo shows you why: it changed two days before.",
  "Then ranks every fix by the traffic it wins back.",
];

/* ------------------------------ data ------------------------------ */

/** 28 days of clicks, Aug 25 - Sep 21. The drop starts at index 18 (Sep 12). */
export const CLICKS = [
  54, 58, 60, 52, 49, 57, 61, 59, 56, 62, 58, 57, 61, 55, 62, 60, 58, 59,
  44, 38, 35, 36, 34, 33, 35, 37, 34, 36,
];
export const ONSET = 18;
/** Where MyKavo detected the changes: Sep 10, two days before the drop. */
export const CAUSE_AT = 16;
export const IMPRESSIONS = CLICKS.map(
  (_, i) => (i < ONSET ? 3300 : 2500) + (((i * 37) % 9) - 4) * 45,
);
const TOTAL_CLICKS = CLICKS.reduce((a, b) => a + b, 0);
const TOTAL_IMPRESSIONS = IMPRESSIONS.reduce((a, b) => a + b, 0);

const sum = (from: number, to: number) => CLICKS.slice(from, to).reduce((a, b) => a + b, 0);
/** The drop card's "412 → 255 over 7 days". */
export const CLICKS_BEFORE = sum(ONSET - 7, ONSET);
export const CLICKS_AFTER = sum(ONSET, ONSET + 7);
export const DROP_PERCENT = Math.round(((CLICKS_BEFORE - CLICKS_AFTER) / CLICKS_BEFORE) * 100);

const QUERIES = [
  { q: "northwind coffee", clicks: 318, impr: 2904 },
  { q: "coffee subscription", clicks: 196, impr: 9812 },
  { q: "ethiopia yirgacheffe beans", clicks: 141, impr: 6220 },
  { q: "pour over kit", clicks: 88, impr: 7406 },
  { q: "best decaf beans", clicks: 52, impr: 5117 },
];

/** Priority Opportunities, in the order they arrive, then sorted. */
export const OPPORTUNITIES = [
  {
    page: "/brew-guides/pour-over",
    high: false,
    stats: "8,905 impr · pos 4.2",
    reason: "Ranks 4.2 with only 1.1% CTR - the snippet is underperforming its position.",
    action: "Rework the title and description; consider FAQ/product schema for a richer result.",
  },
  {
    page: "/shop",
    high: true,
    stats: "12,442 impr · pos 5.1",
    reason: "12,442 impressions with no meta description - the snippet is left to chance.",
    action: "Write a 70-155 character description that sells the click.",
  },
  {
    page: "/subscriptions",
    high: true,
    stats: "17,640 impr · pos 7.9",
    reason: `Clicks dropped by ${CLICKS_BEFORE - CLICKS_AFTER} vs the previous period.`,
    action: "Compare this page against its baseline in Changes - something on it likely regressed.",
  },
];
/** Arrival slot -> sorted slot: the drop first, then /shop, then the CTR fix. */
export const SORTED_SLOT = [2, 1, 0];

const date = (i: number) => {
  const d = 25 + i;
  return d <= 31 ? `Aug ${d}` : `Sep ${d - 31}`;
};

/* ------------------------------ frame ------------------------------ */

export function gscFrameAt(t: number) {
  const u = ((t % GSC_CYCLE) + GSC_CYCLE) % GSC_CYCLE;
  let step = 0;
  for (let i = 0; i < 5; i++) if (u >= BOUNDS[i]) step = i;
  const connectPress = bell(u, 1.1, 1.4);
  const pickPress = bell(u, 2.45, 2.75);
  return {
    u,
    step,
    stepP: r(u, BOUNDS[step], BOUNDS[step + 1]),
    caption: CAPTIONS[step],
    fade: Math.min(r(u, 0, 0.35), 1 - r(u, GSC_CYCLE - 0.45, GSC_CYCLE)),
    panel: u < 3.6 ? "connect" : u < 8.4 ? "queries" : u < 14.4 ? "drop" : "priority",
    in: (at: number) => ease(u, at, at + 0.45),
    // 1: connect
    connectPress,
    picker: u >= 1.6,
    picked: u >= 2.6,
    pickPress,
    status: u < 2.9 ? "none" : u < 4.2 ? "syncing" : "synced",
    // 2: sync
    count: ease(u, 3.9, 5.3),
    draw1: ease(u, 4.0, 6.4),
    queries: QUERIES.map((_, i) => ease(u, 4.5 + i * 0.28, 4.95 + i * 0.28)),
    // 3: drop
    draw2: ease(u, 7.6, 8.6),
    dropMark: pop(u, 8.5, 8.9),
    dropChip: pop(u, 8.8, 9.2),
    ring: (u * 0.9) % 1,
    // 4: why
    lane: ease(u, 10.9, 11.4),
    beam: ease(u, 11.3, 11.9),
    bracket: pop(u, 11.9, 12.3),
    likely: pop(u, 12.1, 12.5),
    suspects: [0, 1].map((i) => ease(u, 12.3 + i * 0.35, 12.75 + i * 0.35)),
    evidence: ease(u, 13.2, 13.7),
    // 5: prioritize
    rows: OPPORTUNITIES.map((_, i) => ease(u, 14.8 + i * 0.3, 15.25 + i * 0.3)),
    sort: ease(u, 16.2, 17.0),
    lift: bell(u, 16.2, 17.0),
    top: pop(u, 17.2, 17.6),
    cur: {
      o: span(u, 0.5, 3.1, 0.25),
      // panel coordinates: the Connect button, then the first property
      x: u < 1.6 ? lerp(330, 150, ease(u, 0.5, 1.05)) : lerp(150, 170, ease(u, 1.7, 2.35)),
      y: u < 1.6 ? lerp(360, 158, ease(u, 0.5, 1.05)) : lerp(158, 86, ease(u, 1.7, 2.35)),
      click: Math.max(connectPress, pickPress),
    },
  };
}

export type GscFrame = ReturnType<typeof gscFrameAt>;

/* ------------------------------ chrome ------------------------------ */

function Rail({ f, compact }: { f: GscFrame; compact: boolean }) {
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
              border: `1.5px solid ${on ? GOLD : "rgba(233,235,223,0.2)"}`,
              background: on ? GOLD : "rgba(233,235,223,0.05)",
              color: on ? INK : LIGHT,
            }}
          >
            <span style={{ width: compact ? 24 : 26, height: compact ? 24 : 26, borderRadius: 99, background: on ? INK : done ? GOLD : "rgba(233,235,223,0.12)", color: on ? GOLD : done ? INK : LIGHT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 11, fontWeight: 700 }}>
              {done ? <Check size={13} strokeWidth={3} /> : i + 1}
            </span>
            {(!compact || on) && <span style={{ fontSize: compact ? 13 : 14, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>}
            {on && <span style={abs({ left: 0, bottom: 0, height: 3, width: `${f.stepP * 100}%`, background: INK })} />}
          </div>
        );
      })}
    </div>
  );
}

function Caption({ f, compact }: { f: GscFrame; compact: boolean }) {
  return (
    <div style={{ textAlign: "center", marginTop: compact ? 14 : 18, fontSize: compact ? 18 : 23, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.3, color: LIGHT, opacity: ease(f.u, BOUNDS[f.step], BOUNDS[f.step] + 0.4) }}>
      {f.caption}
    </div>
  );
}

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(21,21,21,0.1)", ...style }}>{children}</div>;
}

function Title({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{children}</span>
      {right}
    </div>
  );
}

function Header({ f, compact }: { f: GscFrame; compact: boolean }) {
  const status =
    f.status === "none" ? "Not connected" : f.status === "syncing" ? "First sync in progress…" : "Synced Sep 25, 2:04 AM";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, height: compact ? 34 : 40 }}>
      <LogoMark size={compact ? 20 : 22} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: compact ? 15 : 17, fontWeight: 700, lineHeight: 1.1 }}>Northwind Coffee</div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: DIM, marginTop: 2, opacity: f.picked ? 1 : 0.5 }}>
          {f.picked ? "sc-domain:northwind.coffee" : "Search Console"}
        </div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: compact ? 11 : 12.5, color: f.status === "synced" ? GREEN : DIM, fontWeight: 600 }}>
          {f.status === "syncing" && <RefreshCw size={12} style={{ transform: `rotate(${f.u * 300}deg)` }} />}
          {f.status === "synced" && <span style={{ width: 7, height: 7, borderRadius: 99, background: GREEN }} />}
          {status}
        </span>
        {!compact && (
          <span style={{ padding: "7px 13px", borderRadius: 99, border: "1px solid rgba(21,21,21,0.15)", background: "#fff", fontSize: 12.5, fontWeight: 600 }}>Sync now</span>
        )}
      </div>
    </div>
  );
}

function Metrics({ f, compact }: { f: GscFrame; compact: boolean }) {
  const shown = f.u >= 3.9;
  const cards = [
    { label: "Clicks · 28d", value: fmt(Math.round(TOTAL_CLICKS * f.count)) },
    { label: "Impressions", value: fmt(Math.round(TOTAL_IMPRESSIONS * f.count)) },
    { label: "Average CTR", value: `${((TOTAL_CLICKS / TOTAL_IMPRESSIONS) * 100 * f.count).toFixed(1)}%` },
    { label: "Average position", value: (6.4 * f.count).toFixed(1) },
  ].slice(0, compact ? 2 : 4);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cards.length}, 1fr)`, gap: 10 }}>
      {cards.map((c) => (
        <Card key={c.label} style={{ padding: compact ? "9px 12px" : "11px 14px" }}>
          <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: DIM }}>{c.label}</div>
          <div style={{ fontSize: compact ? 20 : 24, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{shown ? c.value : "-"}</div>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------ the chart ------------------------------ */

/**
 * Google's clicks line on top, MyKavo's change lane underneath. The drop's
 * onset and the change that preceded it get joined by a gold beam.
 */
function Chart({ f, w, h, compact }: { f: GscFrame; w: number; h: number; compact: boolean }) {
  const clip = useId();
  const top = compact ? 22 : 26;
  const x = (i: number) => 8 + (i * (w - 16)) / (CLICKS.length - 1);
  const yC = (v: number) => h - 8 - (v / 70) * (h - top - 8);
  const yI = (v: number) => h - 8 - (v / 3900) * (h - top - 8);
  const line = (vals: number[], y: (v: number) => number, from: number, to: number) =>
    vals
      .slice(from, to + 1)
      .map((v, k) => `${k ? "L" : "M"}${x(from + k).toFixed(1)},${y(v).toFixed(1)}`)
      .join(" ");
  const last = CLICKS.length - 1;
  // the fall itself (day before onset -> onset) belongs to the red segment
  const pre = line(CLICKS, yC, 0, ONSET - 1);
  const post = line(CLICKS, yC, ONSET - 1, last);
  const reveal = lerp(0, x(ONSET - 1), f.draw1) + (x(last) - x(ONSET - 1)) * f.draw2;
  const laneH = compact ? 34 : 40;
  const laneY = h + 8;

  return (
    <div style={{ position: "relative", width: w, height: h + 8 + laneH }}>
      <svg width={w} height={h} style={abs({ left: 0, top: 0, overflow: "visible" })}>
        <defs>
          <clipPath id={clip}>
            <rect x={0} y={-10} width={Math.max(0, reveal + 3)} height={h + 20} />
          </clipPath>
        </defs>
        {[0, 1, 2, 3].map((g) => (
          <line key={g} x1={0} x2={w} y1={top + (g * (h - top - 8)) / 3} y2={top + (g * (h - top - 8)) / 3} stroke="rgba(21,21,21,0.07)" />
        ))}
        <g clipPath={`url(#${clip})`}>
          <path d={line(IMPRESSIONS, yI, 0, last)} fill="none" stroke="rgba(21,21,21,0.2)" strokeWidth={1.5} strokeDasharray="4 4" />
          <path d={`${pre} L${x(ONSET - 1)},${h - 8} L${x(0)},${h - 8} Z`} fill="rgba(255,212,0,0.28)" />
          <path d={`${post} L${x(last)},${h - 8} L${x(ONSET - 1)},${h - 8} Z`} fill="rgba(180,35,24,0.08)" />
          <path d={pre} fill="none" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
          <path d={post} fill="none" stroke={RED_INK} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
        </g>
        {f.dropMark > 0 && (
          <g>
            <line x1={x(ONSET)} x2={x(ONSET)} y1={top - 6} y2={h - 8} stroke={RED_INK} strokeWidth={1.2} strokeDasharray="3 4" opacity={Math.min(1, f.dropMark)} />
            <circle cx={x(ONSET)} cy={yC(CLICKS[ONSET])} r={5 + f.ring * 12} fill="none" stroke={RED_INK} strokeWidth={1.5} opacity={1 - f.ring} />
            <circle cx={x(ONSET)} cy={yC(CLICKS[ONSET])} r={5.5 * f.dropMark} fill={RED_INK} stroke="#fff" strokeWidth={2} />
          </g>
        )}
      </svg>

      {/* legend */}
      {!compact && (
        <>
          <span style={abs({ left: 0, top: -2, fontFamily: MONO, fontSize: 10, color: DIM })}>Clicks</span>
          <span style={abs({ right: 0, top: -2, fontFamily: MONO, fontSize: 10, color: DIM, display: "flex", alignItems: "center", gap: 5 })}>
            <span style={{ width: 14, borderTop: "1.5px dashed rgba(21,21,21,0.35)" }} /> Impressions
          </span>
        </>
      )}

      {/* the drop callout */}
      <span
        style={abs({
          left: x(ONSET + 3.5),
          top: yC(CLICKS[ONSET + 4]) + (compact ? 12 : 18),
          transform: `translateX(-50%) scale(${f.dropChip})`,
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: compact ? "3px 8px" : "4px 10px",
          borderRadius: 99,
          background: RED_SOFT,
          color: RED_INK,
          border: `1px solid rgba(180,35,24,0.3)`,
          fontSize: compact ? 11 : 12,
          fontWeight: 700,
          whiteSpace: "nowrap",
        })}
      >
        <TrendingDown size={compact ? 12 : 13} /> -{DROP_PERCENT}% clicks
      </span>

      {/* the onset date under the axis */}
      <span style={abs({ left: x(ONSET), top: h - 4, transform: `translateX(-50%) scale(${f.dropMark})`, fontFamily: MONO, fontSize: 10, fontWeight: 700, color: RED_INK, background: "#fff", padding: "0 3px" })}>
        {date(ONSET)}
      </span>

      {/* MyKavo's change lane */}
      <div style={abs({ left: 0, right: 0, top: laneY, height: laneH, borderRadius: 8, background: PAPER, border: "1px dashed rgba(21,21,21,0.18)", opacity: 0.35 + 0.65 * f.lane })}>
        <span style={abs({ left: 8, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: compact ? 9 : 10, fontWeight: 700, color: DIM, letterSpacing: "0.04em" })}>
          <LogoMark size={compact ? 11 : 13} /> {compact ? "CHANGES" : "MYKAVO CHANGES"}
        </span>
        {/* a quiet, earlier change (info) */}
        <span style={abs({ left: x(6) - 4, top: "50%", width: 8, height: 8, marginTop: -4, borderRadius: 99, background: "#A3A39A", transform: `scale(${f.lane})` })} />
        {/* the two changes, two days before the drop */}
        <span
          style={abs({
            left: x(CAUSE_AT),
            top: "50%",
            transform: `translate(-50%, -50%) scale(${f.lane})`,
            display: "flex",
            gap: 3,
            padding: "4px 6px",
            borderRadius: 99,
            background: "#fff",
            border: `1.5px solid ${f.beam > 0 ? INK : "rgba(21,21,21,0.25)"}`,
            boxShadow: f.beam > 0 ? `0 0 0 ${3 + f.ring * 5}px rgba(255,212,0,${0.55 * (1 - f.ring)})` : "none",
          })}
        >
          <span style={{ width: 8, height: 8, borderRadius: 99, background: RED_INK }} />
          <span style={{ width: 8, height: 8, borderRadius: 99, background: "#DC6803" }} />
        </span>
      </div>

      {/* the gold beam: the change -> the drop */}
      <span
        style={abs({
          left: x(CAUSE_AT) - 1,
          top: top - 6,
          height: laneY + laneH / 2 - 12 - (top - 6),
          width: 2,
          background: `repeating-linear-gradient(to bottom, ${GOLD} 0 5px, transparent 5px 9px)`,
          transformOrigin: "50% 100%",
          transform: `scaleY(${f.beam})`,
        })}
      />
      <div
        style={abs({
          left: x(CAUSE_AT),
          top: top - 6,
          width: x(ONSET) - x(CAUSE_AT),
          height: 0,
          borderTop: `2px solid ${GOLD}`,
          opacity: f.bracket > 0 ? 1 : 0,
          transformOrigin: "0 50%",
          transform: `scaleX(${cl(f.bracket)})`,
        })}
      />
      <span
        style={abs({
          left: (x(CAUSE_AT) + x(ONSET)) / 2,
          top: top - (compact ? 28 : 32),
          transform: `translateX(-50%) scale(${f.bracket})`,
          padding: compact ? "2px 7px" : "3px 9px",
          borderRadius: 99,
          background: GOLD,
          color: INK,
          border: `1px solid ${INK}`,
          fontFamily: MONO,
          fontSize: compact ? 10 : 11,
          fontWeight: 700,
          whiteSpace: "nowrap",
        })}
      >
        2 days before
      </span>
    </div>
  );
}

/* ------------------------------ the side panel ------------------------------ */

function Screen({ o, children }: { o: number; children: ReactNode }) {
  return <div style={abs({ inset: 0, padding: 16, opacity: o, transform: `translateY(${(1 - o) * 10}px)` })}>{children}</div>;
}

function ConnectScreen({ f }: { f: GscFrame }) {
  if (!f.picker) {
    return (
      <>
        <span style={{ width: 40, height: 40, borderRadius: 10, background: GOLD, border: `1.5px solid ${INK}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BarChart3 size={20} />
        </span>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#3D3D36", margin: "12px 0 14px" }}>
          Connect the Google account that owns <span style={{ fontFamily: MONO, fontSize: 12.5 }}>northwind.coffee</span> in Search Console. MyKavo asks for read-only access and stores tokens encrypted.
        </p>
        <span style={{ display: "inline-flex", alignItems: "center", height: 38, padding: "0 18px", borderRadius: 99, background: INK, color: "#fff", fontSize: 13, fontWeight: 600, transform: `scale(${1 - f.connectPress * 0.07})` }}>
          Connect Google Search Console
        </span>
      </>
    );
  }
  const props = ["sc-domain:northwind.coffee", "https://blog.northwind.coffee/"];
  return (
    <>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#3D3D36", margin: "0 0 12px" }}>
        Google connected. Pick the Search Console property that matches this website:
      </p>
      {props.map((p, i) => {
        const on = i === 0 && f.picked;
        return (
          <div
            key={p}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              height: 42,
              padding: "0 12px",
              marginBottom: 8,
              borderRadius: 10,
              border: `1.5px solid ${on ? INK : "rgba(21,21,21,0.14)"}`,
              background: on ? "#FFFBE0" : "#fff",
              boxShadow: on ? `3px 3px 0 ${GOLD}` : "none",
              fontFamily: MONO,
              fontSize: 12,
              transform: i === 0 ? `scale(${1 - f.pickPress * 0.03})` : undefined,
            }}
          >
            <span style={{ width: 16, height: 16, borderRadius: 99, border: `1.5px solid ${on ? INK : "rgba(21,21,21,0.3)"}`, background: on ? INK : "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: GOLD }}>
              {on && <Check size={10} strokeWidth={3.5} />}
            </span>
            {p}
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {["Read-only access", "Tokens encrypted"].map((c) => (
          <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 99, background: "#E3F6E9", color: GREEN, fontSize: 11.5, fontWeight: 700, transform: `scale(${f.picked ? 1 : 0})`, transformOrigin: "left center" }}>
            <Check size={11} strokeWidth={3} /> {c}
          </span>
        ))}
      </div>
    </>
  );
}

function QueriesScreen({ f, compact }: { f: GscFrame; compact: boolean }) {
  const rows = compact ? QUERIES.slice(0, 4) : QUERIES;
  return (
    <>
      <Title right={<span style={{ fontFamily: MONO, fontSize: 10, color: DIM }}>CLICKS · IMPR.</span>}>Top queries</Title>
      {rows.map((q, i) => (
        <div key={q.q} style={{ display: "flex", alignItems: "center", gap: 10, height: compact ? 34 : 44, borderTop: i ? "1px solid rgba(21,21,21,0.07)" : "none", opacity: f.queries[i], transform: `translateX(${(1 - f.queries[i]) * 16}px)` }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{q.q}</span>
          <span style={{ width: 70, height: 6, borderRadius: 3, background: "#F1EFE4", overflow: "hidden", flexShrink: 0 }}>
            <span style={{ display: "block", height: "100%", width: `${(q.clicks / 318) * 100 * f.queries[i]}%`, background: GOLD }} />
          </span>
          <span style={{ width: 34, textAlign: "right", fontFamily: MONO, fontSize: 12, fontWeight: 700 }}>{q.clicks}</span>
          <span style={{ width: 44, textAlign: "right", fontFamily: MONO, fontSize: 11, color: DIM }}>{fmt(q.impr)}</span>
        </div>
      ))}
    </>
  );
}

function Severity({ high }: { high: boolean }) {
  return (
    <span style={{ width: 66, textAlign: "center", padding: "2px 0", borderRadius: 99, fontFamily: MONO, fontSize: 10, fontWeight: 800, background: high ? RED_SOFT : AMBER_SOFT, color: high ? RED_INK : AMBER_INK, flexShrink: 0 }}>
      {high ? "HIGH" : "MEDIUM"}
    </span>
  );
}

function DropScreen({ f, compact }: { f: GscFrame; compact: boolean }) {
  const suspects = [
    { title: "Canonical URL changed", high: true },
    { title: "Title tag changed", high: false },
  ];
  const matching = f.u < 12.3;
  return (
    <>
      <Title>What changed before the drop</Title>
      {!compact && (
        <p style={{ fontSize: 12, lineHeight: 1.5, color: DIM, margin: "-4px 0 12px" }}>
          Pages whose search clicks fell, matched against what MyKavo detected on them beforehand.
        </p>
      )}
      <div style={{ borderTop: "1px solid rgba(21,21,21,0.08)", paddingTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <TrendingDown size={15} color={RED_INK} />
          <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600 }}>/subscriptions</span>
          <span style={{ padding: "2px 9px", borderRadius: 99, background: RED_SOFT, color: RED_INK, fontSize: 11, fontWeight: 700, transform: `scale(${f.likely})`, transformOrigin: "left center" }}>
            Likely cause found
          </span>
        </div>
        <p style={{ fontSize: compact ? 12 : 12.5, lineHeight: 1.55, color: "#3D3D36", margin: "7px 0 0" }}>
          <b style={{ color: INK }}>-{DROP_PERCENT}% clicks</b> from {date(ONSET)} · {CLICKS_BEFORE} → {CLICKS_AFTER} over 7 days · average position 4.1 → 7.9
        </p>
        <div style={{ position: "relative", marginTop: 12, height: 64 }}>
          {matching ? (
            [0, 1].map((i) => (
              <div key={i} style={{ height: 22, marginBottom: 8, borderRadius: 6, background: `linear-gradient(90deg, #F1EFE4 ${((f.u * 60) % 100) - 30}%, #FAF8EE ${((f.u * 60) % 100)}%, #F1EFE4 ${((f.u * 60) % 100) + 30}%)`, width: i ? "70%" : "88%" }} />
            ))
          ) : (
            suspects.map((s, i) => (
              <div key={s.title} style={{ display: "flex", alignItems: "center", gap: 8, height: 28, marginBottom: 4, opacity: f.suspects[i], transform: `translateY(${(1 - f.suspects[i]) * 8}px)` }}>
                <Severity high={s.high} />
                <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{s.title}</span>
                <span style={{ fontSize: 12, color: DIM, whiteSpace: "nowrap" }}>2 days before</span>
              </div>
            ))
          )}
        </div>
        {!compact && (
          <div style={{ marginTop: 10, borderRadius: 10, border: "1px solid rgba(21,21,21,0.1)", background: PAPER, padding: "10px 12px", opacity: f.evidence, transform: `translateY(${(1 - f.evidence) * 10}px)` }}>
            <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: DIM, letterSpacing: "0.06em", marginBottom: 6 }}>CANONICAL URL · /subscriptions</div>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline", fontFamily: MONO, fontSize: 12 }}>
              <span style={{ width: 62, flexShrink: 0, fontSize: 10, fontWeight: 700, color: DIM }}>PREVIOUS</span>
              <span style={{ color: GREEN }}>northwind.coffee/subscriptions</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline", fontFamily: MONO, fontSize: 12, marginTop: 4 }}>
              <span style={{ width: 62, flexShrink: 0, fontSize: 10, fontWeight: 700, color: DIM }}>CURRENT</span>
              <span style={{ color: RED_INK, background: RED_SOFT, padding: "0 4px", borderRadius: 4 }}>northwind.coffee/</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function PriorityScreen({ f, compact }: { f: GscFrame; compact: boolean }) {
  const rowH = compact ? 78 : 100;
  return (
    <>
      <Title
        right={
          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: INK, background: GOLD, padding: "3px 8px", borderRadius: 99, transform: `scale(${f.rows[0]})` }}>
            SEARCH × AUDIT
          </span>
        }
      >
        Priority Opportunities
      </Title>
      <div style={{ position: "relative", height: rowH * 3 }}>
        {OPPORTUNITIES.map((o, i) => {
          const slot = lerp(i, SORTED_SLOT[i], f.sort);
          const isTop = SORTED_SLOT[i] === 0;
          const lifted = isTop ? f.lift : 0;
          const hi = isTop ? f.top : 0;
          return (
            <div
              key={o.page}
              style={abs({
                left: 0,
                right: 0,
                top: slot * rowH,
                height: rowH - 8,
                padding: compact ? "8px 10px" : "10px 12px",
                borderRadius: 10,
                background: "#fff",
                border: `1.5px solid ${hi > 0.5 ? INK : "rgba(21,21,21,0.1)"}`,
                boxShadow: hi > 0.5 ? `4px 4px 0 ${GOLD}` : lifted > 0 ? `0 ${10 * lifted}px ${24 * lifted}px rgba(0,0,0,0.18)` : "none",
                transform: `translateX(${(1 - f.rows[i]) * 18}px) scale(${1 + lifted * 0.03})`,
                opacity: f.rows[i],
                zIndex: isTop ? 2 : 1,
                overflow: "hidden",
              })}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 10.5, fontWeight: 700, background: o.high ? RED_SOFT : AMBER_SOFT, color: o.high ? RED_INK : AMBER_INK, whiteSpace: "nowrap" }}>
                  {o.high ? "High priority" : "Medium"}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.page}</span>
                {!compact && <span style={{ marginLeft: "auto", fontSize: 10.5, color: DIM, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{o.stats}</span>}
              </div>
              <div style={{ fontSize: compact ? 11.5 : 13, lineHeight: compact ? 1.35 : 1.4, marginTop: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{o.reason}</div>
              {/* the top fix earns its next step */}
              {!compact && isTop && (
                <div style={{ fontSize: 12, lineHeight: 1.4, marginTop: 3, color: DIM, opacity: cl(hi), display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>→ {o.action}</div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function Panel({ f, compact }: { f: GscFrame; compact: boolean }) {
  return (
    <Card style={{ position: "relative", height: "100%", overflow: "hidden" }}>
      {f.panel === "connect" && (
        <Screen o={f.in(0)}>
          <ConnectScreen f={f} />
        </Screen>
      )}
      {f.panel === "queries" && (
        <Screen o={f.in(3.6)}>
          <QueriesScreen f={f} compact={compact} />
        </Screen>
      )}
      {f.panel === "drop" && (
        <Screen o={f.in(8.4)}>
          <DropScreen f={f} compact={compact} />
        </Screen>
      )}
      {f.panel === "priority" && (
        <Screen o={f.in(14.4)}>
          <PriorityScreen f={f} compact={compact} />
        </Screen>
      )}
    </Card>
  );
}

function Cursor({ f, dx, dy }: { f: GscFrame; dx: number; dy: number }) {
  return (
    <div style={abs({ left: dx + f.cur.x, top: dy + f.cur.y, opacity: f.cur.o, transform: `scale(${1 - f.cur.click * 0.15})`, filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.35))", zIndex: 5 })}>
      <MousePointer2 size={24} fill="#fff" color={INK} strokeWidth={1.6} />
    </div>
  );
}

/* ------------------------------ stages ------------------------------ */

const LABEL =
  "Animation: MyKavo's Search Console dashboard for an example store. It connects Google Search Console with read-only access and picks the property. Clicks, impressions, CTR and position sync, with top queries. Clicks on /subscriptions then fall 38 percent from September 12. MyKavo's change history, shown under the chart, finds that the canonical URL and title tag changed on that page two days before the drop: likely cause found. Finally Priority Opportunities sorts the pages by what wins traffic back - the /subscriptions drop first, then /shop with 12,442 impressions and no meta description, then a pour-over guide with low CTR. Illustrative data.";

const frameShell = (f: GscFrame, w: number, h: number): CSSProperties => ({
  position: "relative",
  width: w,
  height: h,
  borderRadius: 14,
  overflow: "hidden",
  background: PAPER,
  color: INK,
  border: `1.5px solid ${INK}`,
  boxShadow: `10px 10px 0 ${GOLD}`,
  opacity: f.fade,
});

function Landscape() {
  const W = 1080;
  const H = 614;
  const { wrapRef, t, k } = useStageClock(W, STILL_T, FIRST_T);
  const f = gscFrameAt(t);
  const winW = 1068;
  const winH = 484;
  const pad = 18;
  const leftW = 580;
  return (
    <div ref={wrapRef} role="img" aria-label={LABEL} style={{ position: "relative", width: "100%", aspectRatio: `${W} / ${H}` }}>
      <div aria-hidden style={abs({ left: 0, top: 0, width: W, height: H, transform: `scale(${k})`, transformOrigin: "0 0" })}>
        <Rail f={f} compact={false} />
        <Caption f={f} compact={false} />
        <div style={abs({ left: 0, top: 118 })}>
          <div style={frameShell(f, winW, winH)}>
            <div style={{ padding: pad }}>
              <Header f={f} compact={false} />
              <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
                <div style={{ width: leftW, flexShrink: 0 }}>
                  <Metrics f={f} compact={false} />
                  <Card style={{ marginTop: 12, padding: "12px 16px 14px" }}>
                    <Title right={<RangePills />}>Performance</Title>
                    <Chart f={f} w={leftW - 34} h={196} compact={false} />
                  </Card>
                </div>
                <div style={{ flex: 1, height: winH - pad * 2 - 40 - 14 }}>
                  <Panel f={f} compact={false} />
                </div>
              </div>
            </div>
            <Cursor f={f} dx={pad + leftW + 16} dy={pad + 40 + 14} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RangePills() {
  return (
    <span style={{ display: "flex", gap: 4 }}>
      {["7d", "28d", "90d"].map((d) => (
        <span key={d} style={{ padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: d === "28d" ? INK : "transparent", color: d === "28d" ? "#fff" : DIM, border: d === "28d" ? "none" : "1px solid rgba(21,21,21,0.12)" }}>
          {d}
        </span>
      ))}
    </span>
  );
}

function Portrait() {
  const W = 400;
  const H = 804;
  const { wrapRef, t, k } = useStageClock(W, STILL_T, FIRST_T);
  const f = gscFrameAt(t);
  const winW = 388;
  const winH = 640;
  const pad = 12;
  return (
    <div ref={wrapRef} role="img" aria-label={LABEL} style={{ position: "relative", width: "100%", aspectRatio: `${W} / ${H}` }}>
      <div aria-hidden style={abs({ left: 0, top: 0, width: W, height: H, transform: `scale(${k})`, transformOrigin: "0 0" })}>
        <Rail f={f} compact />
        <div style={{ height: 110 }}>
          <Caption f={f} compact />
        </div>
        <div style={abs({ left: 0, top: 152 })}>
          <div style={frameShell(f, winW, winH)}>
            <div style={{ padding: pad }}>
              <Header f={f} compact />
              <div style={{ marginTop: 10 }}>
                <Metrics f={f} compact />
              </div>
              <Card style={{ marginTop: 10, padding: "10px 12px 12px" }}>
                <Chart f={f} w={winW - pad * 2 - 26} h={132} compact />
              </Card>
              <div style={{ marginTop: 10, height: 296 }}>
                <Panel f={f} compact />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SearchConsoleAnimation() {
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
