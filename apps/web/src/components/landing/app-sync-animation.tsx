"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * The homepage Android animation: the web dashboard and the phone app,
 * joined through a MyKavo hub. A scan started on the web shows up on the
 * phone; a push notification arrives; the change is swiped away as resolved
 * on the phone, and the web dashboard follows a moment later.
 *
 * Ported from the Claude Design file "Android Sync Section.dc.html". Same
 * approach as the WordPress animation: a fixed 960x480 stage scaled to fit,
 * every frame a pure function of the clock, the clock running only while
 * the stage is on screen, and one still frame for prefers-reduced-motion.
 */

const GOLD = "#FFD400";
const INK = "#111";
const STAGE_W = 960;
const STAGE_H = 480;
const INTRO = 2.4;
const CYCLE = 11;
/** Still frame for reduced motion: the change resolved on the phone. */
const STILL_T = INTRO + 6.6;
const MONO = "var(--font-geist-mono), ui-monospace, monospace";
const ICON = "/wordpress/mykavo-tile.png";

const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const r = (x: number, a: number, b: number) => cl((x - a) / (b - a));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const bell = (x: number, a: number, b: number) => Math.sin(Math.PI * r(x, a, b));
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
const between = (p: number) => p > 0 && p < 1;

/** Everything the scene needs for one moment in time. */
export function syncFrameAt(t: number) {
  const it = Math.min(t, INTRO);
  const inC = t >= INTRO;
  const u = inC ? (t - INTRO) % CYCLE : -1;

  // Intro
  const brP = enter(it, 0, 0.7);
  const phP = enter(it, 0.2, 0.9);
  const hubP = pop(it, 0.6, 1.1);
  const cab = draw(it, 1.0, 1.8);
  const ready = enter(it, 1.6, 2.3);
  const bob = (ph: number) => Math.sin(t * 1.3 + ph) * 2 * ready;
  const phBob = bob(2);

  // Cursor and click on the web
  const cp = draw(u, 0.4, 1.3) * (1 - draw(u, 9.4, 10.6));
  const cur = {
    x: lerp(250, 352, cp),
    y: lerp(300, 172, cp) - 24 * Math.sin(Math.PI * cp),
    o: ready,
    s: 1 - 0.16 * bell(u, 1.3, 1.55),
  };
  const rp = r(u, 1.4, 2.0);
  const ripple = { s: 0.4 + 1.4 * rp, o: between(rp) ? (1 - rp) * 0.8 : 0 };

  // Scan
  const scan = draw(u, 1.6, 4.0);
  const scanning = u >= 1.5 && u < 4.1;
  const pct = Math.round(scan * 100);
  const scanO = r(u, 1.5, 1.7) * (1 - r(u, 4.0, 4.3));

  // Packets across the cables
  const p1 = r(u, 1.45, 2.15);
  const p2 = r(u, 7.05, 7.75);
  const pk1 = { x: lerp(424, 620, draw(u, 1.45, 2.15)), o: between(p1) ? 1 : 0 };
  const pk2 = { x: lerp(620, 424, draw(u, 7.05, 7.75)), o: between(p2) ? 1 : 0 };
  const amb: Array<{ x: number; y: number; o: number }> = [];
  [0, 1].forEach((i) => {
    const ph = (t * 0.33 + i * 0.5) % 1;
    const o = 0.45 * Math.sin(Math.PI * ph) * ready;
    amb.push({ x: 424 + ph * 222, y: 232, o });
    amb.push({ x: 646 - ph * 222, y: 248, o });
  });
  const pulseA = r(u, 1.7, 2.3);
  const pulseB = r(u, 7.3, 7.9);
  const pulse = between(pulseA) || between(pulseB);
  const pp = Math.max(u < 2.3 ? pulseA : 0, u > 7.3 && u < 7.9 ? pulseB : 0);
  const hub = {
    o: r(it, 0.6, 0.9),
    s: (0.6 + 0.4 * hubP) * (1 + 0.08 * Math.max(bell(u, 1.7, 2.0), bell(u, 7.3, 7.6))),
    rot: (t * 30) % 360,
    pulseS: 1 + 0.5 * pp,
    pulseO: pulse ? 1 - pp : 0,
  };

  // The new change row, then its resolution
  const inP = enter(u, 4.0, 4.45);
  const webOut = draw(u, 7.85, 8.25);
  const phOut = draw(u, 7.0, 7.4);
  const webHero = { h: 40 * inP * (1 - webOut), o: inP, flash: r(u, 7.45, 7.65) };
  const swipe = draw(u, 6.15, 6.95);
  const phHero = { h: 38 * inP * (1 - phOut), o: inP, x: 120 * swipe, resO: r(u, 6.15, 6.35) };

  // Finger swipe on the phone
  const fIn = r(u, 5.7, 5.95);
  const fOut = r(u, 6.95, 7.25);
  const finger = {
    x: 722 + 118 * swipe,
    y: 236 + phBob,
    o: fIn * (1 - fOut),
    s: 1 - 0.15 * r(u, 5.95, 6.15) * (1 - r(u, 6.95, 7.1)),
  };

  const push = { y: -80 * (1 - enter(u, 4.2, 4.6)) - 80 * enter(u, 5.3, 5.7) };

  const webOpen = u >= 4.2 && u < 8.0 ? 3 : 2;
  const phOpen = u >= 4.2 && u < 7.2 ? 3 : 2;
  const webCountS = 1 + 0.25 * Math.max(bell(u, 4.2, 4.5), bell(u, 8.0, 8.3));
  const phCountS = 1 + 0.3 * Math.max(bell(u, 4.2, 4.5), bell(u, 7.2, 7.5));

  const tO = Math.max(r(u, 1.55, 1.85) * (1 - r(u, 3.2, 3.5)), r(u, 7.9, 8.2) * (1 - r(u, 9.6, 9.9)));
  const toast = {
    o: tO,
    y: (1 - tO) * 6,
    text: u < 5 ? "Scan started · mirrored on Android" : "Resolved from Android · just now",
  };

  return {
    ready,
    cab: 1 - cab,
    amb,
    pk1,
    pk2,
    hub,
    br: { o: r(it, 0, 0.4), x: (1 - brP) * -40, y: bob(0) },
    ph: { o: r(it, 0.2, 0.6), y: (1 - phP) * 40 + phBob },
    cur,
    ripple,
    btnS: 1 - 0.07 * bell(u, 1.3, 1.55),
    btnLabel: scanning ? `Scanning ${pct}%` : "Run scan",
    scanO,
    scanPct: scan * 100,
    phScanText: scanning ? `Scanning 2 sites... ${pct}%` : "Synced with web · live",
    phScanDot: scanning ? "#E0B400" : "#1f9d55",
    webHero,
    phHero,
    finger,
    push,
    webOpen,
    phOpen,
    webCountS,
    phCountS,
    toast,
  };
}

const abs = (s: CSSProperties): CSSProperties => ({ position: "absolute", ...s });

function Check({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden>
      <path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Dot({ color, size = 7 }: { color: string; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0 }} />;
}

function WebRow({ dot, label, meta, last = false }: { dot: string; label: string; meta: string; last?: boolean }) {
  return (
    <div
      style={{
        height: 40,
        boxSizing: "border-box",
        borderBottom: last ? undefined : "1px solid #efece4",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 12px",
        fontSize: 12.5,
      }}
    >
      <Dot color={dot} />
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 10.5, color: "#6b6a63" }}>{meta}</span>
    </div>
  );
}

function PhoneRow({ dot, label, meta, last = false }: { dot: string; label: string; meta: string; last?: boolean }) {
  return (
    <div
      style={{
        height: 38,
        boxSizing: "border-box",
        borderBottom: last ? undefined : "1px solid #efece4",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 10px",
        fontSize: 11.5,
      }}
    >
      <Dot color={dot} size={6} />
      <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 9.5, color: "#6b6a63" }}>{meta}</span>
    </div>
  );
}

function Icon({ size, radius }: { size: number; radius: number }) {
  // eslint-disable-next-line @next/next/no-img-element -- fixed-size stage art, already sized
  return <img src={ICON} alt="" width={size} height={size} style={{ display: "block", borderRadius: radius }} />;
}

function Stage({ children, k }: { children: ReactNode; k: number }) {
  return (
    <div
      aria-hidden
      style={abs({
        left: 0,
        top: 0,
        width: STAGE_W,
        height: STAGE_H,
        transformOrigin: "0 0",
        transform: `scale(${k})`,
        backgroundColor: "#1b1b1b",
        backgroundImage: "radial-gradient(#2c2c2a 1px,transparent 1.2px)",
        backgroundSize: "20px 20px",
        color: INK,
      })}
    >
      {children}
    </div>
  );
}

export function AppSyncAnimation() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0);
  const [k, setK] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setK(el.clientWidth / STAGE_W);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      const still = requestAnimationFrame(() => setT(STILL_T));
      return () => {
        cancelAnimationFrame(still);
        ro.disconnect();
      };
    }

    let visible = false;
    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? false;
    });
    io.observe(el);

    let raf = 0;
    let last: number | null = null;
    const step = (ts: number) => {
      const dt = last == null ? 0 : Math.min(0.1, (ts - last) / 1000);
      last = ts;
      if (visible && !document.hidden) setT((v) => v + dt);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const a = syncFrameAt(t);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label="Animation: a scan started on the MyKavo web dashboard appears on the Android app at the same time. A push notification arrives on the phone, the change is swiped away as resolved, and the web dashboard updates a moment later."
      style={{ position: "relative", width: "100%", aspectRatio: "2 / 1", overflow: "hidden", borderRadius: 16 }}
    >
      <Stage k={k}>
        {/* Cables, packets and ambient dots */}
        <svg width="960" height="480" viewBox="0 0 960 480" style={abs({ left: 0, top: 0, opacity: a.hub.o })}>
          <line x1="424" y1="232" x2="646" y2="232" stroke="#3a3935" strokeWidth="2" strokeDasharray="3 6" />
          <line x1="424" y1="248" x2="646" y2="248" stroke="#3a3935" strokeWidth="2" strokeDasharray="3 6" />
          {[
            ["M424 232 H503", a.cab],
            ["M424 248 H503", a.cab],
            ["M567 232 H646", a.cab],
            ["M567 248 H646", a.cab],
          ].map(([d, off]) => (
            <path key={String(d)} d={String(d)} pathLength={1} stroke="#8a887f" strokeWidth="2" fill="none" strokeDasharray="1 1" strokeDashoffset={Number(off)} />
          ))}
          {[
            [424, 229],
            [424, 245],
            [628, 229],
            [628, 245],
          ].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="18" height="6" rx="3" fill={GOLD} opacity={a.ready} />
          ))}
          {a.amb.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r="2.5" fill={GOLD} opacity={d.o} />
          ))}
          <rect x={a.pk1.x} y="227" width="26" height="10" rx="5" fill={GOLD} opacity={a.pk1.o} />
          <rect x={a.pk2.x} y="243" width="26" height="10" rx="5" fill={GOLD} opacity={a.pk2.o} />
        </svg>

        {/* Hub */}
        <div style={abs({ left: 487, top: 192, width: 96, height: 96, opacity: a.hub.o, transform: `scale(${a.hub.s})` })}>
          <div style={abs({ inset: 0, borderRadius: "50%", border: `2px solid ${GOLD}`, opacity: a.hub.pulseO, transform: `scale(${a.hub.pulseS})` })} />
          <svg width="96" height="96" viewBox="0 0 96 96" style={abs({ inset: 0, transform: `rotate(${a.hub.rot}deg)` })}>
            <circle cx="48" cy="48" r="44" fill="none" stroke="#8a7a1e" strokeWidth="2" strokeDasharray="10 8" />
          </svg>
          <div
            style={abs({
              left: 16,
              top: 16,
              width: 64,
              height: 64,
              boxSizing: "border-box",
              borderRadius: "50%",
              background: "#fff",
              border: `2px solid ${INK}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Icon size={34} radius={8} />
          </div>
        </div>

        {/* Web toast */}
        <div
          style={abs({
            left: 40,
            top: 62,
            height: 32,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 14px",
            borderRadius: 16,
            background: "#262624",
            border: "1.5px solid #3d3c38",
            color: "#f1efe8",
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: "nowrap",
            opacity: a.toast.o,
            transform: `translateY(${a.toast.y}px)`,
          })}
        >
          <span style={{ width: 18, height: 18, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check color={INK} size={10} />
          </span>
          <span>{a.toast.text}</span>
        </div>

        {/* Browser */}
        <div
          style={abs({
            left: 40,
            top: 110,
            width: 380,
            boxSizing: "border-box",
            border: `2px solid ${INK}`,
            borderRadius: 14,
            background: "#fff",
            boxShadow: `8px 8px 0 ${GOLD}`,
            overflow: "hidden",
            opacity: a.br.o,
            transform: `translate(${a.br.x}px,${a.br.y}px)`,
          })}
        >
          <div
            style={{
              height: 36,
              background: "#F3EFE3",
              borderBottom: "1.5px solid #e2dccb",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "0 12px",
              boxSizing: "border-box",
            }}
          >
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#cfc9b8" }} />
            ))}
            <div
              style={{
                flex: 1,
                marginLeft: 8,
                height: 22,
                borderRadius: 11,
                background: "#fff",
                display: "flex",
                alignItems: "center",
                padding: "0 10px",
                fontFamily: MONO,
                fontSize: 10,
                color: "#6b6a63",
              }}
            >
              mykavo.app/dashboard
            </div>
          </div>
          <div style={{ position: "relative", height: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Overview</span>
              <span
                style={{
                  height: 18,
                  padding: "0 7px",
                  borderRadius: 9,
                  background: "#FFF1A6",
                  fontFamily: MONO,
                  fontSize: 10,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  transform: `scale(${a.webCountS})`,
                }}
              >
                {a.webOpen} open
              </span>
            </div>
            <div
              style={{
                width: 104,
                height: 28,
                boxSizing: "border-box",
                borderRadius: 14,
                background: GOLD,
                border: `1.5px solid ${INK}`,
                fontSize: 11,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                whiteSpace: "nowrap",
                transform: `scale(${a.btnS})`,
              }}
            >
              {a.btnLabel}
            </div>
            <div style={abs({ left: 16, right: 16, bottom: 0, height: 3, borderRadius: 2, background: "#f0ede4", overflow: "hidden", opacity: a.scanO })}>
              <div style={{ height: "100%", background: INK, width: `${a.scanPct}%` }} />
            </div>
          </div>
          <div style={{ margin: "6px 16px 16px", border: "1.5px solid #e6e2d7", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ position: "relative", height: a.webHero.h, overflow: "hidden" }}>
              <div
                style={abs({
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 40,
                  boxSizing: "border-box",
                  borderBottom: "1px solid #efece4",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "0 12px",
                  fontSize: 12.5,
                  opacity: a.webHero.o,
                })}
              >
                <Dot color="#e5484d" />
                <span style={{ flex: 1 }}>Hero image changed</span>
                <span style={{ height: 16, padding: "0 6px", borderRadius: 8, background: GOLD, fontFamily: MONO, fontSize: 9, fontWeight: 500, display: "flex", alignItems: "center" }}>NEW</span>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: "#6b6a63" }}>/home</span>
                <div
                  style={abs({
                    inset: 0,
                    background: "#e6f6ec",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0 12px",
                    color: "#17703d",
                    fontWeight: 600,
                    opacity: a.webHero.flash,
                  })}
                >
                  <Check color="#17703d" />
                  <span>Resolved on Android</span>
                </div>
              </div>
            </div>
            <WebRow dot="#e5484d" label="Canonical URL changed" meta="/pricing" />
            <WebRow dot="#f76b15" label="CTA button missing" meta="/signup" />
            <WebRow dot="#1f9d55" label="Uptime 100% · 2 sites" meta="24h" last />
          </div>
        </div>

        {/* Phone */}
        <div
          style={abs({
            left: 650,
            top: 26,
            width: 230,
            height: 428,
            boxSizing: "border-box",
            border: `2px solid ${INK}`,
            borderRadius: 32,
            background: "#fff",
            boxShadow: `8px 8px 0 ${GOLD}`,
            overflow: "hidden",
            opacity: a.ph.o,
            transform: `translateY(${a.ph.y}px)`,
          })}
        >
          <div
            style={abs({
              left: 20,
              right: 20,
              top: 12,
              height: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontFamily: MONO,
              fontSize: 10.5,
              fontWeight: 500,
            })}
          >
            <span>9:41</span>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: INK }} />
            <span style={{ fontSize: 9.5, color: "#6b6a63" }}>5G</span>
          </div>
          <div style={abs({ left: 16, top: 42, fontWeight: 600, fontSize: 16 })}>Overview</div>
          <div style={abs({ left: 16, right: 16, top: 74, display: "flex", gap: 10 })}>
            <div
              style={{
                flex: 1,
                height: 56,
                boxSizing: "border-box",
                border: "1.5px solid #E6C200",
                borderRadius: 10,
                background: "#FFF1A6",
                padding: "9px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 5,
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.06em", color: "#6b5b00" }}>OPEN</span>
              <span style={{ fontSize: 18, fontWeight: 600, lineHeight: 1, transformOrigin: "0 50%", transform: `scale(${a.phCountS})` }}>{a.phOpen}</span>
            </div>
            <div
              style={{
                flex: 1,
                height: 56,
                boxSizing: "border-box",
                border: "1.5px solid #e6e2d7",
                borderRadius: 10,
                padding: "9px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 5,
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.06em", color: "#6b6a63" }}>SITES</span>
              <span style={{ fontSize: 18, fontWeight: 600, lineHeight: 1 }}>2</span>
            </div>
          </div>
          <div
            style={abs({
              left: 16,
              right: 16,
              top: 142,
              height: 34,
              boxSizing: "border-box",
              border: "1.5px solid #e6e2d7",
              borderRadius: 10,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 10px",
            })}
          >
            <Dot color={a.phScanDot} />
            <span style={{ fontSize: 11, color: "#3a3935", whiteSpace: "nowrap" }}>{a.phScanText}</span>
            <div style={abs({ left: 0, bottom: 0, height: 3, background: INK, width: `${a.scanPct}%`, opacity: a.scanO })} />
          </div>
          <div style={abs({ left: 16, right: 16, top: 188, border: "1.5px solid #e6e2d7", borderRadius: 10, overflow: "hidden" })}>
            <div style={{ position: "relative", height: a.phHero.h, overflow: "hidden" }}>
              <div
                style={abs({
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 38,
                  background: "#1f9d55",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0 12px",
                  color: "#fff",
                  fontSize: 11.5,
                  fontWeight: 600,
                  opacity: a.phHero.resO,
                })}
              >
                <Check color="#fff" />
                <span>Resolved</span>
              </div>
              <div
                style={abs({
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 38,
                  boxSizing: "border-box",
                  borderBottom: "1px solid #efece4",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "0 10px",
                  fontSize: 11.5,
                  opacity: a.phHero.o,
                  transform: `translateX(${a.phHero.x}px)`,
                })}
              >
                <Dot color="#e5484d" size={6} />
                <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Hero image changed</span>
                <span style={{ fontFamily: MONO, fontSize: 9.5, color: "#6b6a63" }}>High</span>
              </div>
            </div>
            <PhoneRow dot="#e5484d" label="Canonical URL changed" meta="High" />
            <PhoneRow dot="#f76b15" label="CTA button missing" meta="Med" last />
          </div>
          {/* The app's floating tab bar */}
          <div
            style={abs({
              left: "50%",
              bottom: 16,
              marginLeft: -44,
              width: 88,
              height: 32,
              borderRadius: 16,
              background: INK,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
            })}
          >
            <span style={{ width: 20, height: 20, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: INK }} />
            </span>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#8a887f" }} />
            ))}
          </div>
          {/* Push notification */}
          <div
            style={abs({
              left: 8,
              right: 8,
              top: 8,
              height: 58,
              boxSizing: "border-box",
              borderRadius: 16,
              background: INK,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 12px",
              transform: `translateY(${a.push.y}px)`,
            })}
          >
            <Icon size={28} radius={7} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#bdbab0" }}>
                <span>MyKavo</span>
                <span>now</span>
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Hero image changed on /home</div>
            </div>
          </div>
        </div>

        {/* Finger on the phone */}
        <div
          style={abs({
            left: a.finger.x,
            top: a.finger.y,
            width: 34,
            height: 34,
            margin: "-17px 0 0 -17px",
            borderRadius: "50%",
            background: "rgba(17,17,17,.16)",
            border: "2px solid rgba(17,17,17,.55)",
            boxSizing: "border-box",
            opacity: a.finger.o,
            transform: `scale(${a.finger.s})`,
          })}
        />

        {/* Click ripple and cursor on the web */}
        <div
          style={abs({
            left: 354,
            top: 174,
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
        <svg
          width="22"
          height="26"
          viewBox="0 0 22 26"
          style={abs({ left: a.cur.x, top: a.cur.y, opacity: a.cur.o, transformOrigin: "2px 2px", transform: `scale(${a.cur.s})` })}
        >
          <path d="M2 2 L2 20 L7 15.5 L10.5 23 L14 21.5 L10.6 14.2 L17 14 Z" fill={INK} stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </Stage>
    </div>
  );
}
