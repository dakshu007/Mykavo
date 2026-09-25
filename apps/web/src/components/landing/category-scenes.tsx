"use client";

import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, Check, Globe, X } from "lucide-react";
import { useStageClock } from "./use-stage-clock";

/**
 * One small animation per change category, for the "what MyKavo watches"
 * tabs. Each plays once when its tab opens - the page is fine, then the
 * change happens and MyKavo catches it - and holds on the verdict: a
 * Baseline → Current strip and the severity MyKavo assigns.
 *
 * Every scene is a pure function of `t` (seconds since the tab opened) drawn
 * on a fixed 480x400 stage scaled to fit, via useStageClock, so the tab
 * component remounts a scene to replay it. Reduced motion shows the end.
 */

const GOLD = "#FFD400";
const INK = "#151515";
const RED = "#E5484D";
const GREEN = "#16A34A";
const DIM = "#6B6B60";
const MONO = "var(--font-geist-mono), ui-monospace, monospace";

export const SCENE_W = 480;
export const SCENE_H = 400;
/** When the verdict strip lands; scenes hold after this. */
export const VERDICT_AT = 3.1;

const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const r = (x: number, a: number, b: number) => cl((x - a) / (b - a));
const ease = (x: number, a: number, b: number) => 1 - Math.pow(1 - r(x, a, b), 3);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const shake = (x: number, a: number, b: number) => (x > a && x < b ? Math.sin((x - a) * 60) * 5 * (1 - r(x, a, b)) : 0);
const pop = (x: number, a: number, b: number) => {
  const p = r(x, a, b);
  if (p <= 0) return 0;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};
const abs = (s: CSSProperties): CSSProperties => ({ position: "absolute", ...s });

export type SceneKey =
  | "availability"
  | "visual"
  | "seo"
  | "content"
  | "links"
  | "scripts"
  | "performance"
  | "conversion";

/** Numeric frame values per scene - pure, and tested for NaN. */
export const SCENE_FRAMES: Record<SceneKey, (t: number) => Record<string, number>> = {
  availability: (t) => ({
    lines: Math.floor(cl(t / 0.38, 0, 4)),
    failed: t >= 1.6 ? 1 : 0,
    shake: shake(t, 1.6, 2.2),
    ring: r(t, 1.6, 2.6),
    redBars: Math.floor(r(t, 1.6, 2.8) * 5),
  }),
  visual: (t) => ({
    wipe: ease(t, 0.5, 2.1),
    diffO: pop(t, 2.2, 2.6),
    blink: t > 2.2 ? 0.55 + 0.45 * Math.sin(t * 5) : 0,
    pct: t < 0.5 ? 0.3 : lerp(0.3, 12.4, ease(t, 0.5, 2.4)),
  }),
  seo: (t) => ({
    del: r(t, 0.7, 1.4),
    typed: r(t, 1.55, 2.6),
    caret: Math.floor(t * 2.5) % 2,
    serp: ease(t, 2.6, 3.0),
  }),
  content: (t) => ({
    strike: ease(t, 0.6, 1.5),
    oldO: 1 - r(t, 1.6, 1.9),
    typed: r(t, 1.9, 2.3),
    minus: ease(t, 2.3, 2.6),
    plus: ease(t, 2.5, 2.8),
  }),
  links: (t) => ({
    draw: ease(t, 0, 1.0),
    broken: r(t, 1.1, 2.6),
    count: Math.round(ease(t, 1.1, 2.6) * 17),
    grouped: pop(t, 2.6, 3.0),
  }),
  scripts: (t) => ({
    rows: ease(t, 0, 0.8),
    deploy: pop(t, 0.9, 1.2),
    gone: r(t, 1.5, 1.9),
    shake: shake(t, 1.3, 1.7),
    unknown: ease(t, 2.2, 2.7),
  }),
  performance: (t) => ({
    bars: ease(t, 0, 0.9),
    grow: ease(t, 1.1, 2.3),
    weight: lerp(1.4, 2.0, ease(t, 1.1, 2.3)),
    reqs: Math.round(lerp(38, 61, ease(t, 1.1, 2.3))),
    over: t >= 1.9 ? 1 : 0,
  }),
  conversion: (t) => ({
    aim: ease(t, 0.2, 1.0),
    lock: pop(t, 1.0, 1.3),
    gone: r(t, 1.6, 2.0),
    lost: t >= 2.0 ? 1 : 0,
    shake: shake(t, 2.0, 2.5),
  }),
};

/* ------------------------------ scenes ------------------------------ */

function Card({ style, children, dark = false }: { style: CSSProperties; children: ReactNode; dark?: boolean }) {
  return (
    <div
      style={abs({
        borderRadius: 14,
        border: `1.5px solid ${dark ? INK : "rgba(21,21,21,0.14)"}`,
        background: dark ? INK : "#fff",
        color: dark ? "#E9EBDF" : INK,
        overflow: "hidden",
        ...style,
      })}
    >
      {children}
    </div>
  );
}

function Availability({ t }: { t: number }) {
  const f = SCENE_FRAMES.availability(t);
  const log = [
    ["09:40:02", "200", "312 ms"],
    ["09:40:31", "200", "298 ms"],
    ["09:41:02", "200", "305 ms"],
    ["09:41:33", "500", "4.1 s"],
  ];
  return (
    <>
      <Card dark style={{ left: 20, top: 16, width: 440, height: 150, padding: "14px 16px" }}>
        <div style={{ fontFamily: MONO, fontSize: 11, color: "#9C9E93", letterSpacing: "0.14em" }}>REQUEST LOG · /checkout</div>
        <div style={{ marginTop: 10 }}>
          {log.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 14, fontFamily: MONO, fontSize: 13, lineHeight: "24px", opacity: i < f.lines ? 1 : 0, color: l[1] === "500" ? "#FF9EA1" : "#E9EBDF" }}>
              <span style={{ color: "#6B6B60" }}>{l[0]}</span>
              <span>GET /checkout</span>
              <span style={{ fontWeight: 700, color: l[1] === "500" ? RED : "#7EE2A8" }}>{l[1]}</span>
              <span style={{ marginLeft: "auto", color: "#9C9E93" }}>{l[2]}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card style={{ left: 20, top: 180, width: 440, height: 116, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ position: "relative", width: 96, height: 60, transform: `translateX(${f.shake}px)` }}>
            <span style={abs({ inset: -6, borderRadius: 14, border: `2px solid ${RED}`, opacity: f.failed * (1 - f.ring), transform: `scale(${1 + f.ring * 0.25})` })} />
            <div style={{ width: 96, height: 60, borderRadius: 12, background: f.failed ? RED : GREEN, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontWeight: 800, fontSize: 28 }}>
              {f.failed ? "500" : "200"}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{f.failed ? "Internal Server Error" : "OK"}</div>
            <div style={{ display: "flex", gap: 3, marginTop: 10 }}>
              {Array.from({ length: 30 }, (_, i) => (
                <span key={i} style={{ flex: 1, height: 22, borderRadius: 3, background: i >= 30 - f.redBars ? RED : "#7FCB97" }} />
              ))}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, color: DIM, marginTop: 6 }}>uptime · last 30 checks</div>
          </div>
        </div>
      </Card>
    </>
  );
}

function PageSkeleton({ shifted }: { shifted: boolean }) {
  return (
    <div style={{ padding: 16, height: "100%", background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ width: 60, height: 9, borderRadius: 4, background: INK }} />
        <span style={{ display: "flex", gap: 8 }}>
          {[0, 1, 2].map((i) => <span key={i} style={{ width: 30, height: 7, borderRadius: 4, background: "rgba(21,21,21,0.2)" }} />)}
        </span>
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: shifted ? 44 : 18 }}>
        <div style={{ width: shifted ? 120 : 170, height: 104, borderRadius: 10, background: shifted ? "#C9C3B4" : "linear-gradient(145deg,#8FB39A,#2F4C3A)" }} />
        <div style={{ flex: 1 }}>
          <span style={{ display: "block", width: "80%", height: 13, borderRadius: 5, background: INK }} />
          <span style={{ display: "block", width: "60%", height: 8, borderRadius: 4, background: "rgba(21,21,21,0.2)", marginTop: 10 }} />
          <span style={{ display: "block", width: "70%", height: 8, borderRadius: 4, background: "rgba(21,21,21,0.2)", marginTop: 6 }} />
          <span style={{ display: "block", width: 90, height: 26, borderRadius: 99, background: shifted ? "transparent" : "#D9731A", border: shifted ? "1.5px dashed rgba(21,21,21,0.25)" : "none", marginTop: 14 }} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 18 }}>
        {["#E7DCC4", "#CFDCCB", "#DCD3E4"].map((c) => <span key={c} style={{ height: 44, borderRadius: 8, background: c }} />)}
      </div>
    </div>
  );
}

function Visual({ t }: { t: number }) {
  const f = SCENE_FRAMES.visual(t);
  const x = f.wipe * 440;
  return (
    <Card style={{ left: 20, top: 16, width: 440, height: 282 }}>
      <div style={{ height: 30, display: "flex", alignItems: "center", gap: 6, padding: "0 12px", background: "#F7F6EE", borderBottom: "1px solid rgba(0,0,0,0.08)", fontFamily: MONO, fontSize: 11, color: DIM }}>
        <Globe size={12} /> bloomandroot.shop /
        <span style={{ marginLeft: "auto", fontWeight: 700, color: f.pct > 5 ? RED : DIM }}>diff {f.pct.toFixed(1)}%</span>
      </div>
      <div style={{ position: "relative", height: 252 }}>
        <div style={abs({ inset: 0 })}><PageSkeleton shifted={false} /></div>
        <div style={abs({ inset: 0, clipPath: `inset(0 ${440 - x}px 0 0)` })}><PageSkeleton shifted /></div>
        {/* diff boxes */}
        {[
          { left: 12, top: 36, width: 190, height: 124 },
          { left: 210, top: 108, width: 104, height: 40 },
        ].map((b, i) => (
          <span key={i} style={abs({ ...b, border: `2px solid ${RED}`, background: "rgba(229,72,77,0.18)", borderRadius: 8, opacity: f.diffO * f.blink })} />
        ))}
        {/* wipe handle */}
        <div style={abs({ left: x - 1, top: 0, bottom: 0, width: 2, background: GOLD, opacity: f.wipe > 0 && f.wipe < 1 ? 1 : 0 })}>
          <span style={abs({ left: -13, top: 110, width: 28, height: 28, borderRadius: 99, background: GOLD, border: `2px solid ${INK}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 })}>⇆</span>
        </div>
        <span style={abs({ left: 10, bottom: 10, fontFamily: MONO, fontSize: 10, fontWeight: 700, background: INK, color: "#fff", padding: "3px 7px", borderRadius: 5 })}>AFTER</span>
        <span style={abs({ right: 10, bottom: 10, fontFamily: MONO, fontSize: 10, fontWeight: 700, background: "#fff", color: INK, border: "1px solid rgba(0,0,0,0.15)", padding: "3px 7px", borderRadius: 5, opacity: 1 - f.wipe })}>BASELINE</span>
      </div>
    </Card>
  );
}

function Seo({ t }: { t: number }) {
  const f = SCENE_FRAMES.seo(t);
  const oldV = "index, follow";
  const newV = "noindex, nofollow";
  const shown = f.typed > 0 ? newV.slice(0, Math.round(f.typed * newV.length)) : oldV.slice(0, Math.round((1 - f.del) * oldV.length));
  const isNew = f.typed > 0;
  return (
    <>
      <Card dark style={{ left: 20, top: 16, width: 440, height: 132, padding: "14px 16px", fontFamily: MONO, fontSize: 12.5, lineHeight: "24px" }}>
        <div style={{ color: "#6B6B60" }}>&lt;head&gt;</div>
        <div style={{ paddingLeft: 16 }}>
          &lt;title&gt;<span style={{ color: "#E9EBDF" }}>Trail Tents · Aurora</span>&lt;/title&gt;
        </div>
        <div style={{ paddingLeft: 16, whiteSpace: "nowrap" }}>
          &lt;meta name=<span style={{ color: "#E9EBDF" }}>&quot;robots&quot;</span> content=&quot;
          <span style={{ color: isNew ? "#FF9EA1" : "#7EE2A8", fontWeight: 700, background: isNew ? "rgba(229,72,77,0.2)" : "transparent", borderRadius: 3 }}>{shown}</span>
          <span style={{ display: "inline-block", width: 2, height: 15, background: GOLD, verticalAlign: "-2px", opacity: f.typed < 1 && t > 0.5 ? f.caret : 0 }} />
          &quot;&gt;
        </div>
        <div style={{ paddingLeft: 16, color: "#9C9E93" }}>&lt;link rel=&quot;canonical&quot; href=&quot;/tents&quot;&gt;</div>
      </Card>
      <Card style={{ left: 20, top: 162, width: 440, height: 134, padding: "16px 18px" }}>
        <div style={{ filter: `grayscale(${f.serp})`, opacity: 1 - f.serp * 0.55 }}>
          <div style={{ fontSize: 11.5, color: "#4D5156" }}>aurora-outdoor.com › tents</div>
          <div style={{ fontSize: 18, color: "#1A0DAB", marginTop: 3 }}>Trail Tents for Every Season · Aurora</div>
          <div style={{ fontSize: 12.5, color: "#4D5156", marginTop: 4, lineHeight: 1.45 }}>Lightweight 1-4 person tents that pitch in minutes. Free returns.</div>
        </div>
        <span style={abs({ right: 14, top: 14, transform: `scale(${f.serp})`, background: RED, color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 99 })}>
          Will drop out of Google
        </span>
      </Card>
    </>
  );
}

function Content({ t }: { t: number }) {
  const f = SCENE_FRAMES.content(t);
  const oldH = "Simple pricing for every team";
  const newH = "Home";
  return (
    <>
      <Card style={{ left: 20, top: 16, width: 440, height: 150, padding: "18px 22px" }}>
        <div style={{ fontFamily: MONO, fontSize: 11, color: DIM, letterSpacing: "0.12em" }}>H1 · /pricing</div>
        <div style={{ position: "relative", marginTop: 14, height: 70 }}>
          <div style={abs({ left: 0, top: 0, fontSize: 28, fontWeight: 700, lineHeight: 1.15, opacity: f.oldO, color: f.strike > 0 ? "rgba(21,21,21,0.55)" : INK })}>
            <span style={{ position: "relative" }}>
              {oldH}
              <span style={abs({ left: 0, top: "52%", height: 3, width: `${f.strike * 100}%`, background: RED, borderRadius: 2 })} />
            </span>
          </div>
          <div style={abs({ left: 0, top: 0, fontSize: 28, fontWeight: 700, color: INK })}>
            {newH.slice(0, Math.round(f.typed * newH.length))}
          </div>
        </div>
      </Card>
      <Card style={{ left: 20, top: 180, width: 440, height: 116, padding: "14px 16px", fontFamily: MONO, fontSize: 13 }}>
        <div style={{ fontSize: 11, color: DIM, letterSpacing: "0.12em" }}>TEXT DIFF</div>
        <div style={{ marginTop: 10, padding: "6px 10px", borderRadius: 8, background: "#FDECEC", color: "#B4232A", opacity: f.minus, transform: `translateX(${(1 - f.minus) * 12}px)` }}>- {oldH}</div>
        <div style={{ marginTop: 6, padding: "6px 10px", borderRadius: 8, background: "#E7F6EC", color: "#15803D", opacity: f.plus, transform: `translateX(${(1 - f.plus) * 12}px)` }}>+ {newH}</div>
      </Card>
    </>
  );
}

function Links({ t }: { t: number }) {
  const f = SCENE_FRAMES.links(t);
  const cx = 250;
  const cy = 152;
  const nodes = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(a) * 150, y: cy + Math.sin(a) * 104 };
  });
  const brokenOrder = [2, 5, 7, 9, 11];
  return (
    <>
      <svg width={SCENE_W} height={300} style={abs({ left: 0, top: 0 })}>
        {nodes.map((n, i) => {
          const bi = brokenOrder.indexOf(i);
          const isBroken = bi >= 0 && f.broken > (bi + 1) / (brokenOrder.length + 1);
          return (
            <g key={i}>
              <line x1={cx} y1={cy} x2={lerp(cx, n.x, f.draw)} y2={lerp(cy, n.y, f.draw)} stroke={isBroken ? RED : "rgba(21,21,21,0.25)"} strokeWidth={isBroken ? 2 : 1.5} strokeDasharray={isBroken ? "4 4" : undefined} />
              <circle cx={n.x} cy={n.y} r={isBroken ? 13 : 11} fill={isBroken ? RED : "#fff"} stroke={isBroken ? RED : INK} strokeWidth={1.5} opacity={f.draw} />
              {isBroken && <path d={`M${n.x - 4} ${n.y - 4} L${n.x + 4} ${n.y + 4} M${n.x + 4} ${n.y - 4} L${n.x - 4} ${n.y + 4}`} stroke="#fff" strokeWidth={2} />}
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={24} fill={GOLD} stroke={INK} strokeWidth={2} />
        <text x={cx} y={cy + 5} textAnchor="middle" fontFamily="monospace" fontSize={15} fontWeight={700} fill={INK}>/</text>
      </svg>
      <div style={abs({ left: 20, top: 16, background: "#fff", border: "1.5px solid rgba(21,21,21,0.14)", borderRadius: 12, padding: "8px 12px" })}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: DIM }}>BROKEN LINKS</div>
        <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 800, color: f.count > 0 ? RED : INK }}>{f.count}</div>
      </div>
      <div style={abs({ right: 20, top: 16, transform: `scale(${f.grouped})`, transformOrigin: "top right", background: INK, color: "#fff", borderRadius: 12, padding: "9px 12px", fontSize: 12.5, fontWeight: 600 })}>
        1 alert · not 17 emails
      </div>
    </>
  );
}

function Scripts({ t }: { t: number }) {
  const f = SCENE_FRAMES.scripts(t);
  const rows = [
    { key: "gtm", name: "Google Tag Manager", host: "googletagmanager.com", badge: "GTM", color: "#246FDB" },
    { key: "stripe", name: "Stripe.js", host: "js.stripe.com", badge: "S", color: "#635BFF" },
    { key: "hotjar", name: "Hotjar", host: "static.hotjar.com", badge: "H", color: "#FD3A5C" },
  ];
  return (
    <Card style={{ left: 20, top: 16, width: 440, height: 282, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", fontFamily: MONO, fontSize: 11, color: DIM, letterSpacing: "0.12em" }}>
        THIRD-PARTY SCRIPTS · site-wide
        <span style={{ marginLeft: "auto", transform: `scale(${f.deploy})`, background: INK, color: "#fff", borderRadius: 99, padding: "3px 9px", letterSpacing: 0, fontWeight: 600 }}>Deploy v2.3</span>
      </div>
      <div style={{ marginTop: 12 }}>
        {rows.map((row, i) => {
          const isGtm = row.key === "gtm";
          const o = f.rows * (isGtm ? 1 - f.gone * 0.65 : 1);
          return (
            <div
              key={row.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                height: 48,
                padding: "0 12px",
                marginBottom: 8,
                borderRadius: 12,
                opacity: o,
                transform: `translate(${isGtm ? f.shake : (1 - f.rows) * 16 * (i + 1)}px, 0)`,
                border: isGtm && f.gone > 0 ? `2px dashed ${RED}` : "1px solid rgba(21,21,21,0.1)",
                background: isGtm && f.gone > 0 ? "#FDECEC" : "#FBFAF3",
              }}
            >
              <span style={{ width: 30, height: 30, borderRadius: 8, background: row.color, color: "#fff", fontSize: row.badge.length > 1 ? 9.5 : 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", filter: isGtm ? `grayscale(${f.gone})` : undefined }}>
                {row.badge}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, textDecoration: isGtm && f.gone > 0.5 ? "line-through" : "none" }}>{row.name}</span>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: DIM }}>{row.host}</span>
              </span>
              <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10.5, fontWeight: 700, color: isGtm && f.gone > 0.5 ? RED : GREEN }}>
                {isGtm && f.gone > 0.5 ? "MISSING" : "PRESENT"}
              </span>
            </div>
          );
        })}
        <div style={{ display: "flex", alignItems: "center", gap: 12, height: 48, padding: "0 12px", borderRadius: 12, opacity: f.unknown, transform: `translateY(${(1 - f.unknown) * 10}px)`, border: `1.5px solid ${GOLD}`, background: "#FFF7CC" }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: "#C9C3B4", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>?</span>
          <span>
            <span style={{ display: "block", fontSize: 13.5, fontWeight: 600 }}>Unknown script added</span>
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: DIM }}>cdn.px-collect.net</span>
          </span>
          <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10.5, fontWeight: 700, color: "#8A6A00" }}>NEW</span>
        </div>
      </div>
    </Card>
  );
}

function Performance({ t }: { t: number }) {
  const f = SCENE_FRAMES.performance(t);
  const hist = [1.32, 1.38, 1.35, 1.41, 1.36, 1.4, 1.37, 1.39, 1.4];
  const H = 150;
  const max = 2.2;
  const y = (v: number) => H - (v / max) * H;
  return (
    <Card style={{ left: 20, top: 16, width: 440, height: 282, padding: "14px 18px" }}>
      <div style={{ display: "flex", fontFamily: MONO, fontSize: 11, color: DIM, letterSpacing: "0.12em" }}>
        PAGE WEIGHT · /booking
        <span style={{ marginLeft: "auto", letterSpacing: 0 }}>last 10 scans</span>
      </div>
      <div style={{ position: "relative", height: H, marginTop: 20 }}>
        {/* baseline and threshold lines */}
        <div style={abs({ left: 0, right: 0, top: y(1.4), borderTop: "1.5px dashed rgba(21,21,21,0.35)" })}>
          <span style={abs({ left: 0, top: -17, fontFamily: MONO, fontSize: 9.5, color: DIM })}>baseline 1.4 MB</span>
        </div>
        <div style={abs({ left: 0, right: 0, top: y(1.68), borderTop: `1.5px dashed ${RED}` })}>
          <span style={abs({ left: 0, top: -17, fontFamily: MONO, fontSize: 9.5, color: RED })}>+20% threshold</span>
        </div>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: 10 }}>
          {hist.map((v, i) => (
            <span key={i} style={{ flex: 1, height: (v / max) * H * f.bars, borderRadius: "6px 6px 0 0", background: "#D8D4C6" }} />
          ))}
          <span style={{ flex: 1, height: (f.weight / max) * H * f.bars, borderRadius: "6px 6px 0 0", background: f.over ? RED : GOLD, boxShadow: f.over ? "0 0 0 3px rgba(229,72,77,0.2)" : "none" }} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        {[
          { k: "Weight", v: `${f.weight.toFixed(1)} MB`, d: `+${Math.round(((f.weight - 1.4) / 1.4) * 100)}%` },
          { k: "Requests", v: String(f.reqs), d: `+${f.reqs - 38}` },
        ].map((m) => (
          <div key={m.k} style={{ borderRadius: 10, background: "#FBFAF3", border: "1px solid rgba(21,21,21,0.1)", padding: "8px 12px", display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 12, color: DIM }}>{m.k}</span>
            <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800 }}>{m.v}</span>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 11, fontWeight: 700, color: f.over ? RED : DIM }}>{m.d}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Conversion({ t }: { t: number }) {
  const f = SCENE_FRAMES.conversion(t);
  // Reticle glides from the corner onto the button.
  const bx = 124;
  const by = 214;
  const rx = lerp(380, bx, f.aim);
  const ry = lerp(40, by, f.aim);
  const tone = f.lost ? RED : f.lock > 0 ? GREEN : GOLD;
  return (
    <Card style={{ left: 20, top: 16, width: 440, height: 282 }}>
      <div style={{ padding: "20px 24px" }}>
        <div style={{ fontFamily: MONO, fontSize: 11, color: DIM, letterSpacing: "0.12em" }}>PRO PLAN · /pricing</div>
        <div style={{ fontSize: 34, fontWeight: 800, marginTop: 8 }}>
          $29<span style={{ fontSize: 15, fontWeight: 500, color: DIM }}>/month</span>
        </div>
        {["25 websites · daily scans", "Conversion monitoring"].map((x) => (
          <div key={x} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginTop: 7 }}>
            <Check size={14} color={GREEN} strokeWidth={3} /> {x}
          </div>
        ))}
      </div>
      <div
        style={abs({
          left: 24,
          top: by - 20,
          width: 200,
          height: 44,
          borderRadius: 99,
          background: INK,
          color: GOLD,
          fontWeight: 700,
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 1 - f.gone,
          transform: `scale(${1 - f.gone * 0.2})`,
        })}
      >
        Start Free Trial
      </div>
      {/* reticle */}
      <div style={abs({ left: rx - 115, top: ry - 32, width: 230, height: 64, transform: `translateX(${f.shake}px)` })}>
        {(
          [
            [{ left: 0, top: 0 }, "tl"],
            [{ right: 0, top: 0 }, "tr"],
            [{ left: 0, bottom: 0 }, "bl"],
            [{ right: 0, bottom: 0 }, "br"],
          ] as Array<[CSSProperties, string]>
        ).map(([pos, c]) => {
          const line = `3px solid ${tone}`;
          return (
            <span
              key={c}
              style={abs({
                ...pos,
                width: 18,
                height: 18,
                borderTop: c[0] === "t" ? line : undefined,
                borderBottom: c[0] === "b" ? line : undefined,
                borderLeft: c[1] === "l" ? line : undefined,
                borderRight: c[1] === "r" ? line : undefined,
              })}
            />
          );
        })}
        <span style={abs({ left: 0, top: 70, fontFamily: MONO, fontSize: 10.5, fontWeight: 700, color: "#fff", background: tone === GOLD ? INK : tone, padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" })}>
          #start-trial · {f.lost ? "not found" : f.lock > 0 ? "visible ✓" : "locating…"}
        </span>
      </div>
    </Card>
  );
}

const SCENES: Record<SceneKey, (p: { t: number }) => ReactNode> = {
  availability: Availability,
  visual: Visual,
  seo: Seo,
  content: Content,
  links: Links,
  scripts: Scripts,
  performance: Performance,
  conversion: Conversion,
};

/* --------------------------- verdict + stage --------------------------- */

const clamp2: CSSProperties = {
  fontFamily: MONO,
  fontSize: 12.5,
  lineHeight: "16px",
  marginTop: 4,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

function Verdict({ t, before, after, severity }: { t: number; before: string; after: string; severity: string }) {
  const o = ease(t, VERDICT_AT, VERDICT_AT + 0.45);
  const stamp = pop(t, VERDICT_AT + 0.35, VERDICT_AT + 0.75);
  return (
    <div style={abs({ left: 20, right: 20, top: 312, height: 80, display: "flex", alignItems: "center", gap: 10, opacity: o, transform: `translateY(${(1 - o) * 14}px)` })}>
      <div style={{ flex: 1, minWidth: 0, height: 74, borderRadius: 12, background: "#fff", border: "1.5px solid rgba(21,21,21,0.14)", padding: "9px 12px" }}>
        <div style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: DIM, letterSpacing: "0.14em" }}>BASELINE</div>
        <div style={clamp2}>{before}</div>
      </div>
      <ArrowRight size={18} color={INK} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, height: 74, borderRadius: 12, background: GOLD, border: `1.5px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, padding: "9px 12px" }}>
        <div style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: "rgba(21,21,21,0.6)", letterSpacing: "0.14em" }}>CURRENT SCAN</div>
        <div style={{ ...clamp2, fontWeight: 700 }}>{after}</div>
      </div>
      <div
        style={{
          position: "absolute",
          right: -6,
          top: -18,
          transform: `scale(${stamp}) rotate(8deg)`,
          background: severity === "CRITICAL" ? INK : severity === "HIGH" ? RED : "#fff",
          color: severity === "CRITICAL" ? GOLD : severity === "HIGH" ? "#fff" : INK,
          border: `1.5px solid ${INK}`,
          borderRadius: 8,
          padding: "4px 9px",
          fontFamily: MONO,
          fontSize: 11,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <X size={12} strokeWidth={3} /> {severity}
      </div>
    </div>
  );
}

export function CategoryScene({
  scene,
  before,
  after,
  severity,
  label,
}: {
  scene: SceneKey;
  before: string;
  after: string;
  severity: string;
  label: string;
}) {
  const { wrapRef, t, k } = useStageClock(SCENE_W, 12);
  const Scene = SCENES[scene];
  return (
    <div ref={wrapRef} role="img" aria-label={label} style={{ position: "relative", width: "100%", aspectRatio: `${SCENE_W} / ${SCENE_H}` }}>
      <div aria-hidden style={abs({ left: 0, top: 0, width: SCENE_W, height: SCENE_H, transform: `scale(${k})`, transformOrigin: "0 0", color: INK })}>
        <Scene t={t} />
        <Verdict t={t} before={before} after={after} severity={severity} />
      </div>
    </div>
  );
}
