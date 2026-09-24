"use client";

import type { CSSProperties } from "react";
import { useStageClock } from "./use-stage-clock";

/**
 * The homepage Site Audit animation: the crawl runs and the page count
 * climbs, issues arrive in crawl order and then sort themselves by severity,
 * the cursor opens "how to fix" on a broken link and marks it fixed, the
 * other fixes follow, and the health score climbs as each one lands.
 *
 * Ported from the Claude Design file "Site Audit Section.dc.html". Numbers
 * are illustrative (the section labels them so). Same stage approach as the
 * other homepage animations - see use-stage-clock.ts.
 */

const GOLD = "#FFD400";
const INK = "#111";
const STAGE_W = 640;
const STAGE_H = 540;
const INTRO = 1.2;
const CYCLE = 13;
/** Still frame for reduced motion: fixes landed, score up. */
const STILL_T = INTRO + 10;
const MONO = "var(--font-geist-mono), ui-monospace, monospace";

const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const r = (x: number, a: number, b: number) => cl((x - a) / (b - a));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const bell = (x: number, a: number, b: number) => Math.sin(Math.PI * r(x, a, b));
const live = (x: number, a: number, b: number) => x > a && x < b;
const enter = (x: number, a: number, b: number) => 1 - Math.pow(1 - r(x, a, b), 3);
const draw = (x: number, a: number, b: number) => {
  const p = r(x, a, b);
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
};
const pop = (x: number, a: number, b: number) => {
  const p = r(x, a, b);
  if (p <= 0) return 0;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

const PATHS = ["/", "/shop", "/blog", "/about", "/shop/beans", "/blog/spring-roast", "/checkout", "/contact", "/shop?filter=decaf", "/blog/brew-guide", "/wholesale", "/careers"];

/** Issues in severity order; `shuf` is where each first appears in crawl order. */
const ISSUES = [
  { label: "4XX page", dot: "#e5484d", n: 7, sev: "e", shuf: 2, fix: 7.1, gain: 8 },
  { label: "Broken internal link", dot: "#e5484d", n: 12, sev: "e", shuf: 4, fix: 6.2, gain: 12 },
  { label: "Missing meta description", dot: "#f76b15", n: 23, sev: "w", shuf: 1, fix: 7.5, gain: 7 },
  { label: "Duplicate title", dot: "#f76b15", n: 9, sev: "w", shuf: 3, fix: 7.9, gain: 5 },
  { label: "Title too long", dot: "#3a4fd6", n: 31, sev: "n", shuf: 0, fix: null, gain: 0 },
] as const;

/** Everything the scene needs for one moment in time. */
export function auditFrameAt(t: number) {
  const it = Math.min(t, INTRO);
  const inC = t >= INTRO;
  const u = inC ? (t - INTRO) % CYCLE : -1;
  const cardP = enter(it, 0, 0.8);

  const keep = 1 - enter(u, 11.4, 12.0);
  const idle = inC ? Math.max(enter(u, 12.0, 12.5), 1 - enter(u, 0.1, 0.4)) : cardP;

  // Crawl
  const crawl = draw(u, 0.3, 3.0);
  const crawling = live(u, 0.3, 3.0);
  const ticker = `Crawling ${PATHS[Math.floor(Math.max(u, 0) / 0.14) % PATHS.length]}`;
  const sumO = r(u, 0.3, 0.6) * keep;

  // Issues, then fixes
  const sortP = draw(u, 3.2, 3.9);
  const found = draw(u, 1.0, 3.0);
  let score = 62 * found;
  let errs = 19 * found;
  let warns = 32 * found;
  const notes = 72 * found;
  const rows = ISSUES.map((d, i) => {
    const ap = enter(u, 1.2 + d.shuf * 0.3, 1.6 + d.shuf * 0.3);
    const f = d.fix != null ? r(u, d.fix, d.fix + 0.25) : 0;
    if (d.fix != null) {
      const g = draw(u, d.fix + 0.1, d.fix + 0.7);
      score += d.gain * g;
      if (d.sev === "e") errs -= d.n * g;
      else warns -= d.n * g;
    }
    const active = i === 1 && live(u, 4.75, 6.3);
    const isFixed = f > 0.5;
    return {
      label: d.label,
      dot: d.dot,
      y: lerp(d.shuf * 42, i * 42, sortP),
      o: cl(ap) * keep,
      x: (1 - ap) * -14,
      dotO: 1 - f,
      fixed: f,
      tc: isFixed ? "#8a887f" : INK,
      strike: isFixed ? "line-through" : "none",
      count: isFixed ? "Fixed" : String(d.n),
      cc: isFixed ? "#1f9d55" : INK,
      chipO: 1 - f,
      chipBg: active ? GOLD : "#FBFAF6",
      bg: f > 0 && f < 1 ? "#e6f6ec" : f >= 1 ? "#f6fbf7" : "#fff",
    };
  });
  const sc = Math.round(score);
  const scoreColor = sc >= 85 ? "#1f9d55" : sc >= 70 ? "#c99a00" : "#f76b15";
  const fixBump = Math.max(...ISSUES.filter((d) => d.fix != null).map((d) => bell(u, (d.fix ?? 0) + 0.1, (d.fix ?? 0) + 0.5)));

  // "+N" flying from each fixed row to the gauge
  const fly: Array<{ x: number; y: number; o: number; s: number; text: string }> = [];
  ISSUES.forEach((d, i) => {
    if (d.fix == null) return;
    const s0 = d.fix + 0.1;
    const s1 = d.fix + 0.75;
    if (!live(u, s0, s1)) return;
    const p = draw(u, s0, s1);
    const x0 = 560;
    const y0 = 224 + i * 42 + 21;
    fly.push({
      x: lerp(x0, 142, p),
      y: lerp(y0, 158, p) - 50 * Math.sin(Math.PI * p),
      o: r(u, s0, s0 + 0.1) * (1 - r(u, s1 - 0.12, s1)),
      s: 0.8 + 0.3 * bell(u, s0, s1),
      text: `+${d.gain}`,
    });
  });
  const rp = r(u, 8.6, 9.6);
  const ring = { s: 0.85 + 0.3 * rp, o: live(u, 8.6, 9.6) ? (1 - rp) * 0.6 : 0 };
  const dP = pop(u, 8.8, 9.2);

  // "How to fix" popover
  const popIn = pop(u, 4.9, 5.25);
  const popOut = enter(u, 6.3, 6.55);
  const popover = {
    o: r(u, 4.9, 5.05) * (1 - popOut),
    s: (0.85 + 0.15 * popIn) * (1 - 0.08 * popOut),
    y: -6 * (1 - cl(popIn)) + 6 * popOut,
    btnS: 1 - 0.08 * bell(u, 6.05, 6.25),
  };

  // Cursor: rest -> "how to fix" chip -> "Mark fixed" -> rest
  const rest = { x: 610, y: 495 };
  const chip = { x: 300, y: 285 };
  const btn = { x: 528, y: 498 };
  const a1 = draw(u, 4.0, 4.75);
  const a2 = draw(u, 5.4, 6.05);
  const a3 = draw(u, 6.6, 7.6);
  let cx = lerp(rest.x, chip.x, a1);
  let cy = lerp(rest.y, chip.y, a1) - 30 * Math.sin(Math.PI * a1);
  cx = lerp(cx, btn.x, a2);
  cy = lerp(cy, btn.y, a2);
  cx = lerp(cx, rest.x, a3);
  cy = lerp(cy, rest.y, a3);
  const cur = { x: cx, y: cy, o: cardP, s: 1 - 0.16 * Math.max(bell(u, 4.7, 4.9), bell(u, 6.05, 6.25)) };
  const rp1 = r(u, 4.8, 5.3);
  const rp2 = r(u, 6.15, 6.65);
  const ripple = live(u, 6.15, 6.65)
    ? { x: btn.x, y: btn.y, s: 0.4 + 1.4 * rp2, o: (1 - rp2) * 0.8 }
    : { x: chip.x, y: chip.y, s: 0.4 + 1.4 * rp1, o: live(u, 4.8, 5.3) ? (1 - rp1) * 0.8 : 0 };

  return {
    card: { o: r(it, 0, 0.4), y: (1 - cardP) * 24 },
    pagesLabel: `${inC && u >= 0.3 && u < 11.4 ? fmt(1247 * crawl) : "0"} PAGES CRAWLED`,
    crawlPct: crawl * 100,
    crawlO: crawling ? 1 : 0,
    sumO,
    idle,
    idleS: 1 + 0.06 * Math.sin(t * 3),
    score: sc,
    scoreColor,
    arcOff: 1 - sc / 100,
    scoreS: 1 + 0.12 * fixBump,
    errLabel: `${Math.max(0, Math.round(errs))} errors`,
    warnLabel: `${Math.max(0, Math.round(warns))} warnings`,
    noteLabel: `${Math.round(notes)} notices`,
    errS: 1 + 0.1 * Math.max(bell(u, 6.3, 6.8), bell(u, 7.2, 7.7)),
    warnS: 1 + 0.1 * Math.max(bell(u, 7.6, 8.1), bell(u, 8.0, 8.5)),
    ticker,
    tickO: crawling ? sumO : 0,
    deltaO: cl(dP) * keep,
    deltaS: dP,
    rows,
    fly,
    ring,
    popover,
    cur,
    ripple,
  };
}

const abs = (s: CSSProperties): CSSProperties => ({ position: "absolute", ...s });

function SearchGlyph({ size, width }: { size: number; width: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={width} strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

const pill = (s: CSSProperties): CSSProperties => ({
  height: 30,
  padding: "0 12px",
  borderRadius: 15,
  fontSize: 12.5,
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  whiteSpace: "nowrap",
  ...s,
});

export function SiteAuditAnimation() {
  const { wrapRef, t, k } = useStageClock(STAGE_W, STILL_T);
  const a = auditFrameAt(t);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label="Animation: a site audit crawls 1,247 pages, finds issues and sorts them by severity - errors, then warnings, then notices. A broken internal link is opened to show how to fix it and marked fixed, other fixes follow, and the health score rises."
      style={{ position: "relative", width: "100%", aspectRatio: "640 / 540", overflow: "hidden" }}
    >
      <div
        aria-hidden
        style={abs({
          left: 0,
          top: 0,
          width: STAGE_W,
          height: STAGE_H,
          transformOrigin: "0 0",
          transform: `scale(${k})`,
          backgroundColor: "#F3F1E6",
          backgroundImage: "radial-gradient(#e0dbcc 1px,transparent 1.2px)",
          backgroundSize: "20px 20px",
          color: INK,
        })}
      >
        {/* Audit card */}
        <div
          style={abs({
            left: 40,
            top: 44,
            width: 560,
            height: 392,
            boxSizing: "border-box",
            border: `2px solid ${INK}`,
            borderRadius: 16,
            background: "#fff",
            boxShadow: `10px 10px 0 ${GOLD}`,
            overflow: "hidden",
            opacity: a.card.o,
            transform: `translateY(${a.card.y}px)`,
          })}
        >
          {/* Header */}
          <div
            style={{
              position: "relative",
              height: 48,
              boxSizing: "border-box",
              borderBottom: "1.5px solid #ebe8df",
              background: "#FBFAF6",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 14 }}>
              <SearchGlyph size={16} width={2.2} />
              <span>Site Audit</span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.12em", color: "#6b6a63" }}>{a.pagesLabel}</div>
            <div style={abs({ left: 0, bottom: -1.5, height: 3, background: INK, width: `${a.crawlPct}%`, opacity: a.crawlO })} />
          </div>

          {/* Summary */}
          <div style={{ position: "relative", height: 130, boxSizing: "border-box", borderBottom: "1.5px solid #ebe8df" }}>
            <div style={abs({ left: 20, top: 14, width: 160, height: 104, opacity: a.sumO })}>
              <svg width="160" height="92" viewBox="0 0 160 92" style={abs({ left: 0, top: 0 })}>
                <path d="M24 82 A56 56 0 0 1 136 82" fill="none" stroke="#efece4" strokeWidth="12" strokeLinecap="round" />
                <path
                  d="M24 82 A56 56 0 0 1 136 82"
                  fill="none"
                  stroke={a.scoreColor}
                  strokeWidth="12"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray="1 1"
                  strokeDashoffset={a.arcOff}
                />
              </svg>
              <div style={abs({ left: 0, top: 40, width: 160, textAlign: "center", fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1, transform: `scale(${a.scoreS})` })}>
                {a.score}
              </div>
              <div style={abs({ left: 0, top: 90, width: 160, textAlign: "center", fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.14em", color: a.scoreColor })}>HEALTH SCORE</div>
            </div>
            <div style={abs({ left: 200, top: 34, display: "flex", gap: 8, opacity: a.sumO })}>
              <span style={pill({ background: "#fdecea", border: "1.5px solid #f5c2bd", color: "#b3261e", transform: `scale(${a.errS})` })}>{a.errLabel}</span>
              <span style={pill({ background: "#fff3e6", border: "1.5px solid #f8d2ab", color: "#b44d0d", transform: `scale(${a.warnS})` })}>{a.warnLabel}</span>
              <span style={pill({ background: "#eceffe", border: "1.5px solid #c9d0fa", color: "#3a4fd6" })}>{a.noteLabel}</span>
            </div>
            <div style={abs({ left: 200, top: 78, fontFamily: MONO, fontSize: 10.5, color: "#8a887f", whiteSpace: "nowrap", opacity: a.tickO })}>{a.ticker}</div>
            <div
              style={abs({
                left: 200,
                top: 76,
                height: 24,
                padding: "0 10px",
                borderRadius: 12,
                background: "#e6f6ec",
                color: "#17703d",
                fontSize: 11.5,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
                opacity: a.deltaO,
                transform: `scale(${a.deltaS})`,
              })}
            >
              <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
                <path d="M6 10V2M2.5 5.5L6 2l3.5 3.5" fill="none" stroke="#17703d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>+32 since the first audit</span>
            </div>
            {/* Empty state between runs */}
            <div style={abs({ inset: 0, display: "flex", alignItems: "center", gap: 16, padding: "0 24px", opacity: a.idle })}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "#FFF1A6",
                  border: `2px solid ${INK}`,
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${a.idleS})`,
                }}
              >
                <SearchGlyph size={18} width={2.4} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>Ready to audit northwind.coffee</span>
                <span style={{ fontSize: 12, color: "#8a887f" }}>89 checks across 22 categories</span>
              </div>
            </div>
          </div>

          {/* Issue list */}
          <div style={{ position: "relative", height: 210 }}>
            {a.rows.map((w) => (
              <div key={w.label} style={abs({ left: 0, right: 0, top: w.y, height: 42, overflow: "hidden", opacity: w.o, transform: `translateX(${w.x}px)` })}>
                <div
                  style={abs({
                    left: 0,
                    right: 0,
                    top: 0,
                    height: 42,
                    boxSizing: "border-box",
                    borderBottom: "1px solid #efece4",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 20px",
                    fontSize: 13,
                    background: w.bg,
                  })}
                >
                  <span style={{ position: "relative", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: w.dot, opacity: w.dotO }} />
                    <svg width="14" height="14" viewBox="0 0 12 12" style={abs({ left: 0, top: 0, opacity: w.fixed })} aria-hidden>
                      <path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="#1f9d55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span style={{ marginLeft: 10, color: w.tc, textDecoration: w.strike }}>{w.label}</span>
                  <span
                    style={abs({
                      left: 222,
                      top: 11,
                      height: 20,
                      padding: "0 8px",
                      borderRadius: 10,
                      border: "1px solid #d9d3c2",
                      background: w.chipBg,
                      fontFamily: MONO,
                      fontSize: 9.5,
                      display: "flex",
                      alignItems: "center",
                      whiteSpace: "nowrap",
                      opacity: w.chipO,
                    })}
                  >
                    how to fix ?
                  </span>
                  <span style={{ marginLeft: "auto", fontWeight: 600, fontSize: 12.5, color: w.cc }}>{w.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Score ring and "+N" flyers */}
        <div style={abs({ left: 77, top: 115, width: 130, height: 130, borderRadius: "50%", border: "2px solid #1f9d55", boxSizing: "border-box", opacity: a.ring.o, transform: `scale(${a.ring.s})` })} />
        {a.fly.map((f) => (
          <div
            key={f.text}
            style={abs({
              left: f.x,
              top: f.y,
              height: 24,
              margin: "-12px 0 0 -22px",
              padding: "0 9px",
              borderRadius: 12,
              background: "#1f9d55",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              boxShadow: `2px 2px 0 ${INK}`,
              opacity: f.o,
              transform: `scale(${f.s})`,
            })}
          >
            {f.text}
          </div>
        ))}

        {/* How-to-fix popover */}
        <div
          style={abs({
            left: 250,
            top: 304,
            width: 340,
            height: 226,
            boxSizing: "border-box",
            border: `2px solid ${INK}`,
            borderRadius: 14,
            background: "#fff",
            boxShadow: `6px 6px 0 ${INK}`,
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            transformOrigin: "60px 0",
            opacity: a.popover.o,
            transform: `translateY(${a.popover.y}px) scale(${a.popover.s})`,
          })}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e5484d" }} />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Broken internal link</span>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10, color: "#6b6a63" }}>12 URLS</span>
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.45, color: "#5f5e58" }}>Links on your pages point to URLs that return 404, so visitors and crawlers hit a dead end.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.1em", color: "#8a887f" }}>HOW TO FIX</span>
            <span style={{ fontSize: 12, lineHeight: 1.4 }}>Point each link at the live page, or remove it.</span>
          </div>
          <div style={{ borderRadius: 8, background: "#F7F5EE", padding: "6px 10px", fontFamily: MONO, fontSize: 10.5, lineHeight: 1.6, color: "#3a3935", display: "flex", flexDirection: "column" }}>
            <span>
              /blog/spring-roast <span style={{ color: "#d93025" }}>→ 404</span>
            </span>
            <span>
              /shop?filter=decaf <span style={{ color: "#d93025" }}>→ 404</span>
            </span>
          </div>
          <div style={{ marginTop: "auto", paddingTop: 4, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <span style={{ height: 30, padding: "0 12px", borderRadius: 15, border: "1.5px solid #d9d3c2", fontSize: 11.5, fontWeight: 600, display: "flex", alignItems: "center" }}>Export CSV</span>
            <span
              style={{
                width: 92,
                height: 30,
                borderRadius: 15,
                background: INK,
                color: "#fff",
                fontSize: 11.5,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${a.popover.btnS})`,
              }}
            >
              Mark fixed
            </span>
          </div>
        </div>

        {/* Click ripple and cursor */}
        <div
          style={abs({
            left: a.ripple.x,
            top: a.ripple.y,
            width: 40,
            height: 40,
            margin: "-20px 0 0 -20px",
            borderRadius: "50%",
            border: `2px solid ${INK}`,
            boxSizing: "border-box",
            opacity: a.ripple.o,
            transform: `scale(${a.ripple.s})`,
          })}
        />
        <svg width="22" height="26" viewBox="0 0 22 26" style={abs({ left: a.cur.x, top: a.cur.y, opacity: a.cur.o, transformOrigin: "2px 2px", transform: `scale(${a.cur.s})` })}>
          <path d="M2 2 L2 20 L7 15.5 L10.5 23 L14 21.5 L10.6 14.2 L17 14 Z" fill={INK} stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
