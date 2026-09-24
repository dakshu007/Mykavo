"use client";

import type { CSSProperties, ReactNode } from "react";
import { useStageClock } from "./use-stage-clock";
import { WP_PLUGIN_VERSION } from "@/config/wordpress-plugin";

/**
 * The homepage WordPress animation: WordPress and MyKavo connect through the
 * plugin, an update runs, MyKavo checks four pages, and the verdict lands -
 * alternating between an update that broke the checkout (with a
 * before-and-after reveal) and one that changed nothing.
 *
 * Ported from the Claude Design file "WordPress Section.dc.html". The scene is
 * drawn on a fixed 600x500 stage and scaled to fit, and every frame is a pure
 * function of the clock `t`, so the motion is identical at any size. The
 * clock only runs while the stage is on screen and the tab is visible;
 * with prefers-reduced-motion it shows one still frame of the verdict.
 */

const GOLD = "#FFD400";
const INK = "#111";
const STAGE_W = 600;
const STAGE_H = 500;
const INTRO = 2.8;
const CYCLE = 11;
/** The frame shown when motion is reduced: the broken-update verdict. */
const STILL_T = INTRO + 8.6;

const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const r = (x: number, a: number, b: number) => cl((x - a) / (b - a));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
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

type Thumb = {
  o: number;
  y: number;
  bc: string;
  band: number;
  scanO: number;
  badge: number;
  badgeO: number;
};

/** Everything the scene needs for one moment in time. */
export function frameAt(t: number) {
  const it = Math.min(t, INTRO);
  const inCycle = t >= INTRO;
  const u = inCycle ? (t - INTRO) % CYCLE : -1;
  const n = inCycle ? Math.floor((t - INTRO) / CYCLE) : 0;
  const brk = n % 2 === 0;
  const upd = brk
    ? { label: "WooCommerce", from: "9.8.1", to: "9.9.0", by: "By an admin" }
    : { label: "WordPress", from: "7.0", to: "7.1", by: "Automatic" };

  // Intro
  const wpP = pop(it, 0, 0.55);
  const mkP = pop(it, 0.2, 0.75);
  const chipP = pop(it, 0.7, 1.3);
  const cab = draw(it, 1.2, 2.1);
  const conn = enter(it, 2.0, 2.6);
  const bob = (ph: number) => conn * Math.sin(t * 1.5 + ph) * 2.5;
  const bump = inCycle ? Math.sin(Math.PI * r(u, 0.15, 0.55)) * 0.05 : 0;

  // Dots travelling along the cable while pages are checked
  const chk = enter(u, 2.6, 3.0) * (1 - enter(u, 6.1, 6.5));
  const dots = [0, 1, 2].map((i) => {
    const ph = (t * 0.55 + i / 3) % 1;
    return { x: 130 + ph * 340, o: conn * (0.3 + 0.7 * chk) * Math.sin(Math.PI * ph) };
  });

  // Status pill
  let status = conn > 0.5 ? "Connected" : "Connecting...";
  let tone: "ok" | "busy" | "bad" = "ok";
  if (inCycle) {
    if (u < 0.2 || u >= 9.8) status = "Watching 4 pages";
    else if (u < 2.6) {
      status = "Update detected";
      tone = "busy";
    } else if (u < 6.2) {
      status = "Checking pages...";
      tone = "busy";
    } else {
      status = brk ? "2 changes found" : "Nothing changed";
      tone = brk ? "bad" : "ok";
    }
  }
  const toneColor = { ok: "#1f9d55", busy: "#E0B400", bad: "#d93025" }[tone];
  const toneGlow = { ok: "rgba(31,157,85,.25)", busy: "rgba(255,212,0,.45)", bad: "rgba(217,48,37,.25)" }[tone];
  const ping = 2 + 3 * ((t * 1.2) % 1) * (tone === "ok" ? 0.4 : 1);

  const keep = 1 - enter(u, 9.8, 10.4);
  const idle = inCycle ? Math.max(enter(u, 10.3, 10.8), 1 - enter(u, 0, 0.4)) : conn;
  const ringPh = (t * 0.7) % 1;

  // Update card
  const cardP = enter(u, 0.3, 0.9);
  const prog = draw(u, 0.9, 2.3);
  const done = r(u, 2.3, 2.6);
  const card = {
    o: cardP * keep,
    y: (1 - cardP) * 18,
    prog: prog * 100,
    done,
    spinO: 1 - done,
    spin: (t * 400) % 360,
    note:
      u < 0.9
        ? "Starting..."
        : u < 2.3
          ? `Updating ${Math.round(prog * 100)}%`
          : u < 6.2
            ? "Updated · checking"
            : "Updated just now",
  };

  // Page thumbnails, scanned one after another
  const th: Thumb[] = [0, 1, 2, 3].map((i) => {
    const ap = enter(u, 2.6 + i * 0.08, 3.1 + i * 0.08);
    const s = 3.1 + i * 0.72;
    const e = s + 0.62;
    const scanning = u >= s && u < e;
    const bd = pop(u, e, e + 0.3);
    const lift = brk ? 0 : -7 * Math.sin(Math.PI * r(u, 6.4 + i * 0.14, 6.9 + i * 0.14));
    const fadeOut = brk && i < 3 ? enter(u, 6.3, 6.7) : 0;
    const badgeHide = brk && i === 3 ? r(u, 6.3, 6.5) : 0;
    return {
      o: ap * (1 - fadeOut) * keep,
      y: (1 - ap) * 16 + lift + fadeOut * 10,
      bc: scanning ? INK : "#e3e0d6",
      band: lerp(-22, 128, draw(u, s, e)),
      scanO: scanning ? 1 : 0,
      badge: bd,
      badgeO: cl(bd) * (1 - badgeHide),
    };
  });

  // Before / after comparison on the checkout page
  const ex = brk ? draw(u, 6.4, 7.1) : 0;
  const d = brk ? 66 * draw(u, 7.1, 8.1) - 24 * draw(u, 8.2, 9.2) : 0;
  const rb = brk ? pop(u, 7.5, 7.9) : 0;
  const cmp = {
    left: lerp(416, 20, ex),
    w: lerp(116, 512, ex),
    txt: ex,
    d,
    clip: 100 - d,
    hO: brk ? r(u, 7.0, 7.2) : 0,
    tags: brk ? r(u, 7.0, 7.35) : 0,
    rb,
    rbO: cl(rb),
  };

  const badP = brk ? enter(u, 7.7, 8.2) : 0;
  const okP = brk ? 0 : enter(u, 6.7, 7.2);
  const press = brk ? 1 - 0.06 * Math.sin(Math.PI * r(u, 9.0, 9.3)) : 1;

  return {
    brk,
    cabL: 1 - cl(cab * 2),
    cabR: 1 - cl(cab * 2 - 1),
    dots,
    wp: { o: r(it, 0, 0.3), x: (1 - cl(wpP)) * -24, y: bob(0), s: (0.7 + 0.3 * wpP) * (1 + bump) },
    mk: { o: r(it, 0.2, 0.5), x: (1 - cl(mkP)) * 24, y: bob(1.7), s: 0.7 + 0.3 * mkP },
    chip: { o: r(it, 0.7, 1.0), y: (1 - chipP) * -30 + bob(3.1) * 0.6, s: 0.85 + 0.15 * chipP },
    wpBadge: inCycle ? pop(u, 0.1, 0.4) * (1 - r(u, 2.3, 2.6)) : 0,
    conn,
    connY: (1 - conn) * 8,
    status,
    toneColor,
    toneGlow,
    ping,
    panel: { o: r(it, 1.6, 2.2), y: (1 - enter(it, 1.6, 2.4)) * 20 },
    idle,
    ringS: 1 + ringPh * 0.9,
    ringO: (1 - ringPh) * 0.6,
    upd,
    card,
    th,
    cmp,
    badRow: { o: badP * keep, y: (1 - badP) * 8, btn: press },
    okRow: { o: okP * keep, y: (1 - okP) * 8 },
  };
}

const abs = (s: CSSProperties): CSSProperties => ({ position: "absolute", ...s });
const MONO = "var(--font-geist-mono), ui-monospace, monospace";

function Check({ color, size = 10, width = 2 }: { color: string; size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden>
      <path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScanBand({ top, opacity }: { top: number; opacity: number }) {
  return (
    <div
      style={abs({
        left: 0,
        right: 0,
        top,
        height: 22,
        background: "linear-gradient(180deg,rgba(255,212,0,0) 0%,rgba(255,212,0,.45) 100%)",
        borderBottom: `2px solid ${GOLD}`,
        opacity,
      })}
    />
  );
}

function OkBadge({ th }: { th: Thumb }) {
  return (
    <div
      style={abs({
        right: 6,
        top: 6,
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "#1f9d55",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: th.badgeO,
        transform: `scale(${th.badge})`,
      })}
    >
      <Check color="#fff" />
    </div>
  );
}

function PathLabel({ children }: { children: string }) {
  return (
    <div
      style={abs({
        left: 0,
        right: 0,
        bottom: 0,
        height: 22,
        borderTop: "1px solid #efede6",
        display: "flex",
        alignItems: "center",
        padding: "0 8px",
        fontFamily: MONO,
        fontSize: 10,
        color: "#5f5e58",
        background: "#fff",
      })}
    >
      {children}
    </div>
  );
}

const bar = (s: CSSProperties): CSSProperties => abs({ borderRadius: 3, ...s });

function thumbStyle(th: Thumb, left: number, width = 116): CSSProperties {
  return abs({
    left,
    top: 82,
    width,
    height: 148,
    boxSizing: "border-box",
    border: `1.5px solid ${th.bc}`,
    borderRadius: 10,
    background: "#fff",
    overflow: "hidden",
    opacity: th.o,
    transform: `translateY(${th.y}px)`,
  });
}

function Tile({ src, label, alt, children }: { src: string; label: string; alt: string; children?: ReactNode }) {
  return (
    <>
      <div
        style={{
          position: "relative",
          width: 88,
          height: 88,
          boxSizing: "border-box",
          border: `2px solid ${INK}`,
          borderRadius: 20,
          background: "#fff",
          boxShadow: `4px 4px 0 ${INK}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size stage art, already sized */}
        <img src={src} alt={alt} width={58} height={58} style={{ display: "block", borderRadius: 13 }} />
        {children}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
    </>
  );
}

export function WpUpdateAnimation() {
  const { wrapRef, t, k } = useStageClock(STAGE_W, STILL_T);

  const a = frameAt(t);
  const [th0, th1, th2, th3] = a.th;

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label="Animation: the MyKavo plugin connects WordPress to MyKavo. When WooCommerce updates, MyKavo checks four pages and finds 2 changes on the checkout page, shown before and after. When WordPress updates, it reports Verified - nothing changed."
      style={{ position: "relative", width: "100%", aspectRatio: "6 / 5", overflow: "hidden" }}
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
          backgroundColor: "#FBFAF6",
          backgroundImage: "radial-gradient(#dcd8cc 1px,transparent 1.2px)",
          backgroundSize: "18px 18px",
          color: INK,
        })}
      >
        {/* Cable */}
        <svg width="600" height="160" viewBox="0 0 600 160" style={abs({ left: 0, top: 0, overflow: "visible" })}>
          <line x1="130" y1="78" x2="470" y2="78" stroke="#e3dfd3" strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" />
          <path d="M130 78 H198" pathLength={1} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={a.cabL} />
          <path d="M402 78 H470" pathLength={1} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={a.cabR} />
          {a.dots.map((d, i) => (
            <circle key={i} cx={d.x} cy="78" r="5" fill={GOLD} stroke={INK} strokeWidth="2" opacity={d.o} />
          ))}
        </svg>

        {/* WordPress tile */}
        <div
          style={abs({
            left: 40,
            top: 34,
            width: 88,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            opacity: a.wp.o,
            transform: `translate(${a.wp.x}px,${a.wp.y}px) scale(${a.wp.s})`,
          })}
        >
          <Tile src="/wordpress/wordpress-logo.png" alt="WordPress" label="WordPress">
            <div
              style={abs({
                right: -9,
                top: -9,
                minWidth: 24,
                height: 24,
                borderRadius: 12,
                background: "#d63638",
                color: "#fff",
                border: "2px solid #fff",
                boxSizing: "border-box",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: a.wpBadge,
                transform: `scale(${a.wpBadge})`,
              })}
            >
              1
            </div>
          </Tile>
        </div>

        {/* MyKavo tile */}
        <div
          style={abs({
            left: 472,
            top: 34,
            width: 88,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            opacity: a.mk.o,
            transform: `translate(${a.mk.x}px,${a.mk.y}px) scale(${a.mk.s})`,
          })}
        >
          <Tile src="/wordpress/mykavo-tile.png" alt="MyKavo" label="MyKavo">
            <div
              style={abs({
                right: -7,
                top: -7,
                width: 18,
                height: 18,
                borderRadius: "50%",
                border: "2px solid #fff",
                boxSizing: "border-box",
                background: a.toneColor,
                opacity: a.conn,
              })}
            />
          </Tile>
        </div>

        {/* Plugin chip + status */}
        <div
          style={abs({
            left: 198,
            top: 44,
            width: 204,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            opacity: a.chip.o,
            transform: `translateY(${a.chip.y}px) scale(${a.chip.s})`,
          })}
        >
          <div
            style={{
              width: 204,
              height: 68,
              boxSizing: "border-box",
              border: `2px solid ${INK}`,
              borderRadius: 16,
              background: INK,
              boxShadow: `4px 4px 0 ${GOLD}`,
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "0 14px",
            }}
          >
            <div style={{ flex: "0 0 38px", height: 38, borderRadius: 10, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0V7zM12 17v5" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
              <div style={{ color: "#fff", fontWeight: 600, fontSize: 15, lineHeight: 1 }}>MyKavo plugin</div>
              <div style={{ color: "#bdbab0", fontFamily: MONO, fontSize: 10, lineHeight: 1, whiteSpace: "nowrap", letterSpacing: "-0.02em" }}>for WordPress · v{WP_PLUGIN_VERSION}</div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 28,
              padding: "0 12px",
              borderRadius: 14,
              background: "#fff",
              border: `1.5px solid ${INK}`,
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: "nowrap",
              opacity: a.conn,
              transform: `translateY(${a.connY}px)`,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: a.toneColor, boxShadow: `0 0 0 ${a.ping}px ${a.toneGlow}` }} />
            <span>{a.status}</span>
          </div>
        </div>

        {/* Panel */}
        <div
          style={abs({
            left: 24,
            top: 168,
            width: 552,
            height: 308,
            boxSizing: "border-box",
            border: `2px solid ${INK}`,
            borderRadius: 16,
            background: "#fff",
            overflow: "hidden",
            opacity: a.panel.o,
            transform: `translateY(${a.panel.y}px)`,
          })}
        >
          <div
            style={{
              height: 38,
              boxSizing: "border-box",
              borderBottom: "1.5px solid #ebe8df",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px",
              background: "#FBFAF6",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size stage art */}
              <img src="/wordpress/mykavo-tile.png" alt="" width={18} height={18} style={{ display: "block", borderRadius: 4 }} />
              <span style={{ fontWeight: 700 }}>MyKavo</span>
              <span style={{ color: "#b3b0a6" }}>/</span>
              <span style={{ color: "#5f5e58" }}>Safe updates</span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: "#8a887f" }}>northwind-coffee.test</div>
          </div>

          <div style={{ position: "relative", height: 266 }}>
            {/* Idle */}
            <div style={abs({ inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, opacity: a.idle })}>
              <div style={{ position: "relative", width: 44, height: 44 }}>
                <div style={abs({ inset: 0, borderRadius: "50%", border: "2px solid #1f9d55", opacity: a.ringO, transform: `scale(${a.ringS})` })} />
                <div
                  style={abs({
                    inset: 0,
                    borderRadius: "50%",
                    background: "#e6f6ec",
                    border: "2px solid #1f9d55",
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  })}
                >
                  <Check color="#1f9d55" size={18} width={1.8} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Watching for updates</div>
                <div style={{ fontSize: 12, color: "#8a887f" }}>Plugins, themes and WordPress core</div>
              </div>
            </div>

            {/* Update card */}
            <div
              style={abs({
                left: 20,
                top: 14,
                width: 512,
                height: 58,
                boxSizing: "border-box",
                border: "1.5px solid #e3e0d6",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "0 14px",
                opacity: a.card.o,
                transform: `translateY(${a.card.y}px)`,
              })}
            >
              <div
                style={{
                  position: "relative",
                  flex: "0 0 32px",
                  height: 32,
                  borderRadius: 9,
                  background: "#FFF1A6",
                  border: `1.5px solid ${INK}`,
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: a.card.spinO, transform: `rotate(${a.card.spin}deg)` }} aria-hidden>
                  <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" />
                </svg>
                <span style={abs({ opacity: a.card.done, display: "flex" })}>
                  <Check color={INK} size={16} width={1.9} />
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{a.upd.label}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: "#5f5e58" }}>
                    {a.upd.from} → {a.upd.to}
                  </span>
                  <span style={{ fontSize: 11, color: "#8a887f", background: "#f3f1ea", borderRadius: 4, padding: "1px 6px" }}>{a.upd.by}</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: "#efede6", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: INK, width: `${a.card.prog}%` }} />
                </div>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: "#5f5e58", whiteSpace: "nowrap", minWidth: 92, textAlign: "right" }}>{a.card.note}</div>
            </div>

            {/* Thumb: Home */}
            <div style={thumbStyle(th0, 20)}>
              <div style={bar({ left: 8, top: 8, width: 22, height: 6, background: INK })} />
              <div style={bar({ right: 8, top: 9, width: 36, height: 4, background: "#dedbd1" })} />
              <div style={bar({ left: 8, right: 8, top: 22, height: 46, borderRadius: 6, background: "#FFF1A6" })} />
              <div style={bar({ left: 14, top: 32, width: 54, height: 6, background: INK })} />
              <div style={bar({ left: 14, top: 43, width: 38, height: 4, background: "#8a887f" })} />
              <div style={bar({ left: 14, top: 53, width: 26, height: 8, borderRadius: 4, background: INK })} />
              {[8, 43, 78].map((left) => (
                <div key={left} style={bar({ left, top: 76, width: 29, height: 36, borderRadius: 5, background: "#efede6" })} />
              ))}
              <PathLabel>/</PathLabel>
              <ScanBand top={th0.band} opacity={th0.scanO} />
              <OkBadge th={th0} />
            </div>

            {/* Thumb: Shop */}
            <div style={thumbStyle(th1, 152)}>
              <div style={bar({ left: 8, top: 8, width: 22, height: 6, background: INK })} />
              <div style={bar({ right: 8, top: 9, width: 36, height: 4, background: "#dedbd1" })} />
              <div style={bar({ left: 8, top: 24, width: 40, height: 6, background: INK })} />
              <div style={bar({ left: 8, top: 38, width: 46, height: 34, borderRadius: 5, background: "#efede6" })} />
              <div style={bar({ left: 62, top: 38, width: 46, height: 34, borderRadius: 5, background: "#FFF1A6" })} />
              <div style={bar({ left: 8, top: 78, width: 46, height: 34, borderRadius: 5, background: "#FFF1A6" })} />
              <div style={bar({ left: 62, top: 78, width: 46, height: 34, borderRadius: 5, background: "#efede6" })} />
              <PathLabel>/shop</PathLabel>
              <ScanBand top={th1.band} opacity={th1.scanO} />
              <OkBadge th={th1} />
            </div>

            {/* Thumb: Product */}
            <div style={thumbStyle(th2, 284)}>
              <div style={bar({ left: 8, top: 8, width: 22, height: 6, background: INK })} />
              <div style={bar({ right: 8, top: 9, width: 36, height: 4, background: "#dedbd1" })} />
              <div style={bar({ left: 8, top: 24, width: 50, height: 60, borderRadius: 6, background: "#efede6" })} />
              <div style={bar({ left: 64, top: 26, width: 42, height: 6, background: INK })} />
              <div style={bar({ left: 64, top: 38, width: 30, height: 4, background: "#8a887f" })} />
              <div style={bar({ left: 64, top: 48, width: 40, height: 4, background: "#dedbd1" })} />
              <div style={bar({ left: 64, top: 56, width: 34, height: 4, background: "#dedbd1" })} />
              <div style={bar({ left: 64, top: 70, width: 42, height: 12, borderRadius: 6, background: GOLD, border: `1px solid ${INK}`, boxSizing: "border-box" })} />
              <div style={bar({ left: 8, top: 94, width: 98, height: 4, background: "#efede6" })} />
              <div style={bar({ left: 8, top: 104, width: 80, height: 4, background: "#efede6" })} />
              <PathLabel>/product/beans</PathLabel>
              <ScanBand top={th2.band} opacity={th2.scanO} />
              <OkBadge th={th2} />
            </div>

            {/* Thumb: Checkout, which widens into the before/after view */}
            <div style={thumbStyle(th3, a.cmp.left, a.cmp.w)}>
              <div style={abs({ left: 0, right: 0, top: 0, height: 126 })}>
                {/* After (current) */}
                <div style={abs({ inset: 0, background: "#fff" })}>
                  <CheckoutSkeleton />
                  <div style={bar({ left: "65%", top: 102, width: "24%", height: 16, borderRadius: 8, background: "#dedbd1", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" })}>
                    <span style={{ fontSize: 9, fontWeight: 600, color: "#8a887f", whiteSpace: "nowrap", opacity: a.cmp.txt }}>Place order</span>
                  </div>
                  {[
                    { top: 44, height: 14, radius: 4 },
                    { top: 98, height: 24, radius: 6 },
                  ].map((m) => (
                    <div
                      key={m.top}
                      style={abs({
                        left: "63%",
                        top: m.top,
                        width: "28%",
                        height: m.height,
                        boxSizing: "border-box",
                        border: "1.5px dashed #d93025",
                        borderRadius: m.radius,
                        background: "rgba(217,48,37,.08)",
                        opacity: a.cmp.rbO,
                        transform: `scale(${a.cmp.rb})`,
                      })}
                    />
                  ))}
                </div>
                {/* Before (baseline) */}
                <div style={abs({ inset: 0, background: "#FBFAF6", clipPath: `inset(0 ${a.cmp.clip}% 0 0)` })}>
                  <CheckoutSkeleton />
                  <div style={bar({ left: "65%", top: 48, width: "24%", height: 6, background: INK })} />
                  <div style={bar({ left: "65%", top: 60, width: "16%", height: 4, background: "#dedbd1" })} />
                  <div style={bar({ left: "65%", top: 86, width: "24%", height: 16, borderRadius: 8, background: GOLD, border: `1px solid ${INK}`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" })}>
                    <span style={{ fontSize: 9, fontWeight: 600, whiteSpace: "nowrap", opacity: a.cmp.txt }}>Place order</span>
                  </div>
                </div>
                <div style={abs({ left: 8, bottom: 6, height: 18, padding: "0 8px", borderRadius: 9, background: INK, color: "#fff", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", opacity: a.cmp.tags })}>Before</div>
                <div style={abs({ right: 8, bottom: 6, height: 18, padding: "0 8px", borderRadius: 9, background: "#d93025", color: "#fff", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", opacity: a.cmp.tags })}>After</div>
                <div style={abs({ top: 0, bottom: 0, left: `${a.cmp.d}%`, width: 2, marginLeft: -1, background: INK, opacity: a.cmp.hO })}>
                  <div style={abs({ left: -10, top: 52, width: 22, height: 22, borderRadius: "50%", background: GOLD, border: `2px solid ${INK}`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 })}>‹›</div>
                </div>
              </div>
              <PathLabel>/checkout</PathLabel>
              <ScanBand top={th3.band} opacity={th3.scanO} />
              <div
                style={abs({
                  right: 6,
                  top: 6,
                  height: 20,
                  minWidth: 20,
                  boxSizing: "border-box",
                  padding: "0 6px",
                  borderRadius: 10,
                  background: a.brk ? "#d93025" : "#1f9d55",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  opacity: th3.badgeO,
                  transform: `scale(${th3.badge})`,
                })}
              >
                {a.brk ? "2" : <Check color="#fff" />}
              </div>
            </div>

            {/* Verdict: something broke */}
            <div style={abs({ left: 20, top: 232, width: 512, height: 26, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: a.badRow.o, transform: `translateY(${a.badRow.y}px)` })}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <span style={{ height: 20, padding: "0 8px", borderRadius: 10, background: "#fdecea", color: "#b3261e", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#d93025" }} />2 changes on /checkout
                </span>
                <span style={{ color: "#5f5e58" }}>
                  after <b style={{ color: INK, fontWeight: 600 }}>WooCommerce 9.9.0</b>
                </span>
              </div>
              <div style={{ height: 26, padding: "0 12px", borderRadius: 13, background: INK, color: "#fff", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, transform: `scale(${a.badRow.btn})` }}>
                Review changes <span>›</span>
              </div>
            </div>

            {/* Verdict: nothing changed */}
            <div style={abs({ left: 20, top: 232, width: 512, height: 26, display: "flex", alignItems: "center", gap: 8, fontSize: 12, opacity: a.okRow.o, transform: `translateY(${a.okRow.y}px)` })}>
              <span style={{ height: 20, padding: "0 8px", borderRadius: 10, background: "#e6f6ec", color: "#17703d", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Check color="#17703d" />
                Verified - nothing changed
              </span>
              <span style={{ color: "#5f5e58" }}>
                after <b style={{ color: INK, fontWeight: 600 }}>WordPress 7.1</b> · 4 pages checked
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The parts of the checkout page that are the same before and after. */
function CheckoutSkeleton() {
  return (
    <>
      <div style={bar({ left: "7%", top: 8, width: "20%", maxWidth: 40, height: 6, background: INK })} />
      <div style={bar({ right: "7%", top: 9, width: "30%", maxWidth: 60, height: 4, background: "#dedbd1" })} />
      <div style={bar({ left: "7%", top: 24, width: "34%", height: 6, background: INK })} />
      {[40, 56, 72].map((top) => (
        <div key={top} style={bar({ left: "7%", top, width: "48%", height: 10, borderRadius: 4, background: "#efede6" })} />
      ))}
      <div style={abs({ left: "61%", top: 38, width: "32%", height: 72, boxSizing: "border-box", border: "1.5px solid #e3e0d6", borderRadius: 6 })} />
    </>
  );
}
