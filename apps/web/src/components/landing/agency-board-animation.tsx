"use client";

import type { CSSProperties } from "react";
import { CalendarClock, Check, MousePointer2, RefreshCw, Rocket, X } from "lucide-react";
import { useStageClock } from "./use-stage-clock";

/**
 * The agencies animation: one dashboard for every client site.
 *
 *   scan    - a sweep checks every client site; rows update to "just now"
 *   rank    - two sites change; they jump to the top, most severe first
 *   act     - open the worst one, see the three changes, fix, rescan, clear;
 *             it drops back into place
 *   deploy  - another client ships; the deploy check comes back verified
 *   report  - monthly white-label reports go out to every client
 *
 * Invented client sites (labelled illustrative by the section). Same stage
 * approach as the other landing animations - see use-stage-clock.ts.
 */

const GOLD = "#FFD400";
const INK = "#151515";
const DIM = "#6B6B60";
const RED = "#C4262C";
const GREEN = "#16A34A";
const MONO = "var(--font-geist-mono), ui-monospace, monospace";

const W = 560;
const H = 620;
export const AGENCY_CYCLE = 14;
const STILL_T = 4.3;
const FIRST_T = 2.4;

const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const r = (x: number, a: number, b: number) => cl((x - a) / (b - a));
const ease = (x: number, a: number, b: number) => {
  const p = r(x, a, b);
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
};
const out = (x: number, a: number, b: number) => 1 - Math.pow(1 - r(x, a, b), 3);
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

export const SITES = [
  { id: "northwind", host: "northwinddental.com", tile: "#2F6FEB" },
  { id: "bloom", host: "bloomandroot.shop", tile: "#16A34A" },
  { id: "harbor", host: "harborlaw.co", tile: "#7C3AED" },
  { id: "aurora", host: "aurora-outdoor.com", tile: "#D9731A" },
  { id: "lumen", host: "lumen-studio.io", tile: "#0E7490" },
  { id: "meridian", host: "meridianlegal.co", tile: "#151515" },
  { id: "pine", host: "pinecrestbakery.com", tile: "#B45309" },
] as const;
type SiteId = (typeof SITES)[number]["id"];

/** The list order at each settled moment, and when it moves to the next. */
const ORDERS: Array<{ at: number; order: SiteId[] }> = [
  { at: 0, order: ["northwind", "bloom", "harbor", "aurora", "lumen", "meridian", "pine"] },
  { at: 2.7, order: ["aurora", "northwind", "bloom", "harbor", "lumen", "meridian", "pine"] },
  { at: 3.7, order: ["aurora", "meridian", "northwind", "bloom", "harbor", "lumen", "pine"] },
  { at: 8.7, order: ["meridian", "northwind", "bloom", "harbor", "aurora", "lumen", "pine"] },
];
const MOVE = 0.6;

const ROW_Y0 = 92;
const ROW_H = 58;
const ROW_GAP = 8;

export function agencyFrameAt(t: number) {
  const u = ((t % AGENCY_CYCLE) + AGENCY_CYCLE) % AGENCY_CYCLE;

  // Row positions: ease from the previous order to the current one.
  const slot = (id: SiteId) => {
    let i = 0;
    for (let k = 0; k < ORDERS.length; k++) if (u >= ORDERS[k].at) i = k;
    const now = ORDERS[i].order.indexOf(id);
    if (i === 0) return now;
    const prev = ORDERS[i - 1].order.indexOf(id);
    return lerp(prev, now, ease(u, ORDERS[i].at, ORDERS[i].at + MOVE));
  };

  const auroraBad = u >= 2.7 && u < 8.3;
  const meridianBad = u >= 3.7;
  const attention = (auroraBad ? 1 : 0) + (meridianBad ? 1 : 0);

  const rows = SITES.map((s, i) => {
    // The scan sweep reaches row i (in the first order) in turn.
    const scannedAt = 0.4 + i * 0.28;
    return {
      ...s,
      y: ROW_Y0 + slot(s.id) * (ROW_H + ROW_GAP),
      scanning: u >= scannedAt - 0.28 && u < scannedAt,
      lastScan: u >= scannedAt ? "just now" : `${3 + i}h ago`,
      state:
        s.id === "aurora"
          ? auroraBad
            ? "critical"
            : u >= 8.3
              ? "fixed"
              : "healthy"
          : s.id === "meridian" && meridianBad
            ? "high"
            : "healthy",
      // Badges pop when their state changes, and sit at full size otherwise.
      badgePop:
        s.id === "aurora"
          ? u < 2.7
            ? 1
            : u < 8.3
              ? pop(u, 2.7, 3.05)
              : pop(u, 8.3, 8.65)
          : s.id === "meridian" && u >= 3.7
            ? pop(u, 3.7, 4.05)
            : 1,
      flash: s.id === "aurora" ? bell(u, 2.7, 3.4) : s.id === "meridian" ? bell(u, 3.7, 4.4) : s.id === "bloom" ? bell(u, 9.8, 10.6) : 0,
    };
  });

  return {
    u,
    fade: Math.min(r(u, 0, 0.35), 1 - r(u, AGENCY_CYCLE - 0.45, AGENCY_CYCLE)),
    rows,
    attention,
    healthy: 12 - attention,
    scanP: r(u, 0.12, 0.4 + SITES.length * 0.28),
    scanning: u < 0.4 + SITES.length * 0.28,
    // cursor opens aurora, then presses "Fixed - rescan"
    cur: {
      o: span(u, 4.3, 7.2, 0.3),
      x: u < 5.4 ? lerp(470, 200, out(u, 4.3, 4.9)) : lerp(200, 470, out(u, 5.6, 6.6)),
      y: u < 5.4 ? lerp(560, ROW_Y0 + 26, out(u, 4.3, 4.9)) : lerp(ROW_Y0 + 26, 552, out(u, 5.6, 6.6)),
      click: Math.max(bell(u, 4.95, 5.25), bell(u, 6.7, 7.0)),
    },
    drawer: out(u, 5.1, 5.6) * (1 - out(u, 8.1, 8.6)),
    fixes: [0, 1, 2].map((i) => out(u, 5.5 + i * 0.18, 5.9 + i * 0.18)),
    rescanning: u >= 7.0 && u < 7.8,
    clear: pop(u, 7.8, 8.15),
    deploy: pop(u, 9.8, 10.15) * (1 - r(u, 11.6, 11.9)),
    report: pop(u, 11.7, 12.05),
  };
}

export type AgencyFrame = ReturnType<typeof agencyFrameAt>;

/* ------------------------------ pieces ------------------------------ */

function Badge({ state, s }: { state: string; s: number }) {
  const style: CSSProperties =
    state === "critical"
      ? { background: GOLD, color: INK, border: `1px solid rgba(21,21,21,0.15)` }
      : state === "high"
        ? { background: INK, color: "#F5F5F0" }
        : state === "fixed"
          ? { background: "#E7F6EC", color: "#15803D", border: "1px solid rgba(22,163,74,0.35)" }
          : { background: "#fff", color: "rgba(21,21,21,0.7)", border: "1px solid rgba(21,21,21,0.15)" };
  const text = state === "critical" ? "3 critical changes" : state === "high" ? "2 high changes" : state === "fixed" ? "Resolved" : "Healthy";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 11px",
        borderRadius: 99,
        fontSize: 12.5,
        fontWeight: 600,
        whiteSpace: "nowrap",
        transform: `scale(${s})`,
        ...style,
      }}
    >
      {state === "fixed" && <Check size={13} strokeWidth={3} />}
      {text}
    </span>
  );
}

function Row({ row }: { row: AgencyFrame["rows"][number] }) {
  const bad = row.state === "critical" || row.state === "high";
  return (
    <div
      style={abs({
        left: 16,
        right: 16,
        top: row.y,
        height: ROW_H,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 14px",
        borderRadius: 14,
        background: "#fff",
        border: `1.5px solid ${bad ? (row.state === "critical" ? INK : "rgba(21,21,21,0.35)") : "rgba(21,21,21,0.1)"}`,
        boxShadow: row.state === "critical" ? `3px 3px 0 ${INK}` : row.flash > 0 ? `0 0 0 ${row.flash * 5}px rgba(255,212,0,0.35)` : "none",
        zIndex: bad ? 2 : 1,
      })}
    >
      <span style={{ width: 30, height: 30, borderRadius: 8, background: row.tile, color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {row.host[0].toUpperCase()}
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: "block", fontFamily: MONO, fontSize: 13.5, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.host}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: DIM, marginTop: 2 }}>
          {row.scanning ? (
            <>
              <RefreshCw size={11} color={INK} /> scanning…
            </>
          ) : (
            <>scanned {row.lastScan}</>
          )}
        </span>
      </span>
      {/* uptime bars */}
      <span style={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} style={{ width: 3, height: 16, borderRadius: 2, background: row.state === "critical" && i === 11 ? RED : "#7FCB97" }} />
        ))}
      </span>
      <span style={{ width: 150, display: "flex", justifyContent: "flex-end" }}>
        <Badge state={row.state} s={row.badgePop} />
      </span>
    </div>
  );
}

function Drawer({ f }: { f: AgencyFrame }) {
  const changes = [
    { t: "“Add to cart” button missing", p: "/tents · conversion" },
    { t: "Page set to noindex", p: "/tents · SEO" },
    { t: "/checkout returns 500", p: "/checkout · availability" },
  ];
  return (
    <div
      style={abs({
        top: 74,
        bottom: 16,
        right: 16,
        width: 330,
        transform: `translateX(${(1 - f.drawer) * 360}px)`,
        borderRadius: 16,
        background: INK,
        color: "#E9EBDF",
        padding: 18,
        boxShadow: "-12px 0 40px -12px rgba(0,0,0,0.35)",
        zIndex: 5,
      })}
    >
      <div style={{ fontFamily: MONO, fontSize: 12, color: "#9C9E93" }}>aurora-outdoor.com</div>
      <div style={{ fontSize: 19, fontWeight: 700, marginTop: 4 }}>{f.clear > 0 ? "All clear" : "3 critical changes"}</div>
      <div style={{ marginTop: 14 }}>
        {changes.map((c, i) => (
          <div
            key={c.t}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              marginBottom: 8,
              borderRadius: 12,
              background: f.clear > 0 ? "rgba(22,163,74,0.14)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${f.clear > 0 ? "rgba(22,163,74,0.4)" : "rgba(255,255,255,0.1)"}`,
              opacity: f.fixes[i],
              transform: `translateX(${(1 - f.fixes[i]) * 16}px)`,
            }}
          >
            <span style={{ width: 22, height: 22, borderRadius: 99, flexShrink: 0, background: f.clear > 0 ? GREEN : GOLD, color: f.clear > 0 ? "#fff" : INK, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {f.clear > 0 ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, textDecoration: f.clear > 0 ? "line-through" : "none", opacity: f.clear > 0 ? 0.75 : 1 }}>{c.t}</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: "#9C9E93" }}>{c.p}</span>
            </span>
          </div>
        ))}
      </div>
      <div
        style={abs({
          left: 18,
          right: 18,
          bottom: 18,
          height: 44,
          borderRadius: 99,
          background: f.clear > 0 ? GREEN : GOLD,
          color: f.clear > 0 ? "#fff" : INK,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontSize: 14,
          fontWeight: 700,
          transform: `scale(${1 - f.cur.click * 0.05})`,
        })}
      >
        {f.clear > 0 ? (
          <>
            <Check size={16} strokeWidth={3} /> Matches baseline again
          </>
        ) : f.rescanning ? (
          <>
            <RefreshCw size={15} /> Rescanning…
          </>
        ) : (
          "Fixed - rescan"
        )}
      </div>
    </div>
  );
}

const LABEL =
  "Animation: an agency's MyKavo dashboard of client websites. A scan checks every site. aurora-outdoor.com turns up 3 critical changes and jumps to the top, and meridianlegal.co 2 high changes second. The agency opens aurora-outdoor.com, sees the three changes, marks them fixed and rescans, and it drops back as resolved. A deploy check on bloomandroot.shop comes back verified, and monthly reports are sent to every client.";

export function AgencyBoardAnimation() {
  const { wrapRef, t, k } = useStageClock(W, STILL_T, FIRST_T);
  const f = agencyFrameAt(t);
  return (
    <div ref={wrapRef} role="img" aria-label={LABEL} style={{ position: "relative", width: "100%", aspectRatio: `${W} / ${H}` }}>
      <div aria-hidden style={abs({ left: 0, top: 0, width: W, height: H, transform: `scale(${k})`, transformOrigin: "0 0", color: INK, opacity: f.fade })}>
        <div
          style={abs({
            inset: 0,
            borderRadius: 22,
            border: `1.5px solid ${INK}`,
            background: "#FBFAF3",
            boxShadow: `8px 8px 0 ${GOLD}, 8px 8px 0 1.5px ${INK}`,
            overflow: "hidden",
          })}
        >
          {/* header */}
          <div style={abs({ left: 16, right: 16, top: 16, height: 58, display: "flex", alignItems: "center", gap: 10, padding: "0 16px", borderRadius: 14, background: "#fff", border: "1px solid rgba(21,21,21,0.1)" })}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>Clients</span>
            <span style={{ fontFamily: MONO, fontSize: 11.5, color: DIM }}>12 websites</span>
            <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 99, background: f.attention ? GOLD : "#F3F1E6", fontSize: 12, fontWeight: 700 }}>
                <span style={{ width: 7, height: 7, borderRadius: 7, background: f.attention ? INK : "#C9C3B4" }} />
                {f.attention} need attention
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 99, background: "#E7F6EC", color: "#15803D", fontSize: 12, fontWeight: 700 }}>
                <span style={{ width: 7, height: 7, borderRadius: 7, background: GREEN }} />
                {f.healthy} healthy
              </span>
            </span>
          </div>
          {/* scan progress line under the header */}
          <div style={abs({ left: 32, right: 32, top: 78, height: 3, borderRadius: 3, background: "rgba(21,21,21,0.06)", opacity: f.scanning ? 1 : 0 })}>
            <div style={{ height: "100%", width: `${f.scanP * 100}%`, borderRadius: 3, background: GOLD }} />
          </div>

          {/* rows: healthy first so the flagged ones paint on top while they move */}
          {[...f.rows].sort((a, b) => (a.state === "healthy" ? 0 : 1) - (b.state === "healthy" ? 0 : 1)).map((row) => (
            <Row key={row.id} row={row} />
          ))}

          {/* deploy verified on bloomandroot.shop */}
          {(() => {
            const bloom = f.rows.find((x) => x.id === "bloom");
            if (!bloom) return null;
            return (
              <div
                style={abs({
                  right: 30,
                  top: bloom.y - 14,
                  transform: `scale(${f.deploy})`,
                  transformOrigin: "right center",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 11px",
                  borderRadius: 99,
                  background: GREEN,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  boxShadow: "0 6px 16px -6px rgba(22,163,74,0.6)",
                  zIndex: 4,
                })}
              >
                <Rocket size={13} /> Deploy verified · v2.4
              </div>
            );
          })()}

          {/* monthly reports */}
          <div
            style={abs({
              left: "50%",
              bottom: 18,
              transform: `translateX(-50%) scale(${f.report})`,
              display: "flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
              padding: "10px 16px",
              borderRadius: 12,
              background: INK,
              color: "#E9EBDF",
              fontSize: 13.5,
              boxShadow: `4px 4px 0 ${GOLD}`,
              zIndex: 4,
            })}
          >
            <CalendarClock size={16} color={GOLD} /> Monthly reports sent to 12 clients · your brand
          </div>

          <Drawer f={f} />

          <div style={abs({ left: f.cur.x, top: f.cur.y, opacity: f.cur.o, transform: `scale(${1 - f.cur.click * 0.15})`, filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.35))", zIndex: 6 })}>
            <MousePointer2 size={26} fill="#fff" color={INK} strokeWidth={1.6} />
          </div>
        </div>
      </div>
    </div>
  );
}
