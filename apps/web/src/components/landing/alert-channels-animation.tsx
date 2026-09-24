"use client";

import type { CSSProperties, ReactNode } from "react";
import { Mail } from "lucide-react";
import { DiscordIcon, SlackIcon, WebhookIcon } from "@/components/brand/integration-icons";
import { useStageClock } from "./use-stage-clock";

/**
 * The homepage alert-channels animation: a scan runs, three changes are
 * found, the severity gate holds back the Medium one, the other two are
 * grouped into one alert, and the hub fires it down four curves to Email,
 * Slack, Discord and a signed webhook - each opening a preview of what
 * actually arrives there.
 *
 * Ported from the Claude Design file "Alert Channels Section.dc.html", with
 * two deliberate differences: the Email card uses a plain envelope rather
 * than the Gmail logo (MyKavo sends mail to any inbox; a Gmail mark would
 * imply an integration that does not exist), and the webhook preview shows
 * the real header and event name (x-mykavo-signature, mykavo.alert).
 */

const GOLD = "#FFD400";
const INK = "#111";
const STAGE_W = 1000;
const STAGE_H = 560;
const INTRO = 2.2;
const CYCLE = 12;
/** Still frame for reduced motion: all four channels open. */
const STILL_T = INTRO + 7;
const MONO = "var(--font-geist-mono), ui-monospace, monospace";
const ICON = "/wordpress/mykavo-tile.png";

type Pt = [number, number];
const CURVES: Array<[Pt, Pt, Pt, Pt]> = [
  [[292, 78], [390, 78], [400, 250], [448, 272]],
  [[708, 78], [610, 78], [600, 250], [552, 272]],
  [[292, 372], [390, 372], [400, 330], [448, 318]],
  [[708, 372], [610, 372], [600, 330], [552, 318]],
];
const curvePath = (c: [Pt, Pt, Pt, Pt]) => `M${c[0][0]} ${c[0][1]} C${c[1][0]} ${c[1][1]} ${c[2][0]} ${c[2][1]} ${c[3][0]} ${c[3][1]}`;

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

/** Point and heading on a cubic Bezier curve. */
function bez(c: [Pt, Pt, Pt, Pt], p: number) {
  const q = 1 - p;
  const x = q * q * q * c[0][0] + 3 * q * q * p * c[1][0] + 3 * q * p * p * c[2][0] + p * p * p * c[3][0];
  const y = q * q * q * c[0][1] + 3 * q * q * p * c[1][1] + 3 * q * p * p * c[2][1] + p * p * p * c[3][1];
  const dx = 3 * q * q * (c[1][0] - c[0][0]) + 6 * q * p * (c[2][0] - c[1][0]) + 3 * p * p * (c[3][0] - c[2][0]);
  const dy = 3 * q * q * (c[1][1] - c[0][1]) + 6 * q * p * (c[2][1] - c[1][1]) + 3 * p * p * (c[3][1] - c[2][1]);
  return { x, y, rot: (Math.atan2(dy, dx) * 180) / Math.PI };
}

const CHIPS = [
  { sev: "CRITICAL", text: "Checkout button missing", dot: "#e5484d" },
  { sev: "HIGH", text: "Canonical URL changed", dot: "#f76b15" },
  { sev: "MEDIUM", text: "Hero image changed", dot: "#E0B400" },
];

/** Everything the scene needs for one moment in time. */
export function alertFrameAt(t: number) {
  const it = Math.min(t, INTRO);
  const inC = t >= INTRO;
  const u = inC ? (t - INTRO) % CYCLE : -1;

  // Intro
  const hubP = pop(it, 0, 0.55);
  const drawIn = draw(it, 0.8, 1.6);
  const ready = enter(it, 1.4, 2.1);
  const bob = (ph: number) => Math.sin(t * 1.2 + ph) * 2 * ready;

  // Scan
  const scanP = draw(u, 0.2, 1.6);
  const scanO = r(u, 0.1, 0.3) * (1 - r(u, 1.6, 1.9));
  let label = "Watching · 4 channels";
  if (inC) {
    if (u >= 0.2 && u < 1.6) label = "Scanning northwind.coffee";
    else if (u >= 1.6 && u < 2.9) label = "3 changes found";
    else if (u >= 2.9 && u < 3.9) label = "";
    else if (u >= 3.9 && u < 9.6) label = "Delivered to 4 channels";
  }

  // Findings: two pass the gate and merge, Medium is held
  const merge = draw(u, 3.0, 3.45);
  const held = r(u, 2.45, 2.7);
  const chips = CHIPS.map((c, i) => {
    const ap = enter(u, 1.7 + i * 0.15, 2.1 + i * 0.15);
    let o = r(u, 1.7 + i * 0.15, 1.9 + i * 0.15);
    let y = 392 + i * 32 + (1 - ap) * 10;
    let x = 0;
    let s = 1;
    if (i < 2) {
      y = lerp(y, 400, merge);
      o *= 1 - r(u, 3.2, 3.45);
      s = 1 - 0.06 * merge;
    } else {
      o *= 1 - 0.45 * held;
      o *= 1 - r(u, 3.1, 3.5);
      x = Math.sin(t * 40) * 3 * bell(u, 2.45, 2.75);
    }
    const isHeld = i === 2 && held > 0.5;
    return {
      ...c,
      y,
      o,
      x,
      s,
      bc: i === 2 && held > 0 ? "#d9d3c2" : "#e0dccf",
      strike: isHeld ? "line-through" : "none",
      tc: isHeld ? "#8a887f" : INK,
      heldO: i === 2 ? held : 0,
    };
  });
  const gateShake = Math.sin(t * 40) * 2.5 * bell(u, 2.45, 2.75);

  // The grouped alert rises into the hub
  const gIn = pop(u, 3.3, 3.65);
  const gUp = draw(u, 3.6, 3.95);
  const group = {
    y: lerp(396, 278, gUp),
    o: r(u, 3.3, 3.45) * (1 - r(u, 3.8, 3.95)),
    s: (0.7 + 0.3 * gIn) * (1 - 0.6 * gUp),
  };

  // Hub
  const fire = bell(u, 3.9, 4.25);
  const pp = r(u, 3.9, 4.6);
  const hub = {
    o: r(it, 0, 0.3),
    s: (0.6 + 0.4 * hubP) * (1 + 0.1 * fire),
    rot: (t * 20) % 360,
    scanOff: 1 - scanP,
    scanO,
    pulseS: 1 + 0.6 * pp,
    pulseO: live(u, 3.9, 4.6) ? 1 - pp : 0,
  };

  // Packets out to the channels, and each channel's card
  const pk: Array<{ x: number; y: number; rot: number }> = [];
  const amb: Array<{ x: number; y: number; o: number }> = [];
  const cards = CURVES.map((c, i) => {
    const s0 = 3.95 + i * 0.12;
    const s1 = s0 + 0.8;
    const e = draw(u, s0, s1);
    if (live(u, s0, s1)) {
      const b = bez(c, 1 - e);
      pk.push({ x: b.x, y: b.y, rot: b.rot + 180 });
    }
    const ph = (t * 0.22 + i * 0.25) % 1;
    const ab = bez(c, 1 - ph);
    amb.push({ x: ab.x, y: ab.y, o: 0.5 * Math.sin(Math.PI * ph) * ready });
    const ep = enter(it, 0.3 + i * 0.1, 0.9 + i * 0.1);
    const dx = i % 2 === 0 ? -30 : 30;
    const dy = i < 2 ? -20 : 20;
    const arrive = bell(u, s1, s1 + 0.35);
    const open = enter(u, s1 + 0.1, s1 + 0.6) * (1 - draw(u, 9.3, 9.8));
    const tag = pop(u, s1, s1 + 0.35);
    return {
      o: r(it, 0.3 + i * 0.1, 0.6 + i * 0.1),
      x: (1 - ep) * dx,
      y: (1 - ep) * dy + bob(i * 1.3),
      s: 1 + 0.03 * arrive,
      iconS: 1 + 0.18 * arrive,
      ph: 80 * open,
      tag: tag * (1 - r(u, 9.3, 9.6)),
      tagO: cl(tag) * (1 - r(u, 9.3, 9.6)),
    };
  });
  const trace = (i: number) => 1 - cl(drawIn * 1.25 - i * 0.08);

  return {
    curveO: ready,
    traces: [0, 1, 2, 3].map(trace),
    amb,
    pk,
    hub,
    label,
    // The label steps aside while the grouped alert rises through it.
    labelO: 1 - r(u, 2.7, 2.9) * (1 - r(u, 3.95, 4.15)),
    chips,
    group,
    gateShake,
    gateO: ready,
    cards,
  };
}

const abs = (s: CSSProperties): CSSProperties => ({ position: "absolute", ...s });

type Card = ReturnType<typeof alertFrameAt>["cards"][number];

function ChannelCard({
  card,
  left,
  top,
  icon,
  name,
  desc,
  tag,
  children,
}: {
  card: Card;
  left: number;
  top: number;
  icon: ReactNode;
  name: string;
  desc: string;
  tag: string;
  children: ReactNode;
}) {
  return (
    <div
      style={abs({
        left,
        top,
        width: 262,
        boxSizing: "border-box",
        border: `2px solid ${INK}`,
        borderRadius: 14,
        background: "#fff",
        boxShadow: `5px 5px 0 ${INK}`,
        overflow: "hidden",
        opacity: card.o,
        transform: `translate(${card.x}px,${card.y}px) scale(${card.s})`,
      })}
    >
      <div style={{ height: 84, display: "flex", alignItems: "center", gap: 12, padding: "0 16px", boxSizing: "border-box" }}>
        <div
          style={{
            flex: "0 0 42px",
            height: 42,
            boxSizing: "border-box",
            border: "1.5px solid #e6e2d7",
            borderRadius: 11,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${card.iconS})`,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{name}</span>
            <span
              style={{
                height: 18,
                padding: "0 7px",
                borderRadius: 9,
                background: "#e6f6ec",
                color: "#17703d",
                fontSize: 10,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 4,
                whiteSpace: "nowrap",
                opacity: card.tagO,
                transform: `scale(${card.tag})`,
              }}
            >
              ✓ {tag}
            </span>
          </div>
          <span style={{ fontSize: 12.5, lineHeight: 1.4, color: "#5f5e58", maxWidth: 150 }}>{desc}</span>
        </div>
      </div>
      <div style={{ height: card.ph, overflow: "hidden" }}>{children}</div>
    </div>
  );
}

function Icon({ size, radius }: { size: number; radius: number | string }) {
  // eslint-disable-next-line @next/next/no-img-element -- fixed-size stage art, already sized
  return <img src={ICON} alt="" width={size} height={size} style={{ display: "block", width: size, height: size, borderRadius: radius, flex: `0 0 ${size}px` }} />;
}

export function AlertChannelsAnimation() {
  const { wrapRef, t, k } = useStageClock(STAGE_W, STILL_T);
  const a = alertFrameAt(t);
  const [email, slack, discord, webhook] = a.cards;

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label="Animation: a scan finds three changes. The severity gate lets Critical and High through and holds Medium back, the two are grouped into one alert, and MyKavo delivers it to email, Slack, Discord and a signed webhook."
      style={{ position: "relative", width: "100%", aspectRatio: "1000 / 560", overflow: "hidden" }}
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
        {/* Curves, packets and hub rings */}
        <svg width="1000" height="560" viewBox="0 0 1000 560" style={abs({ left: 0, top: 0 })}>
          {CURVES.map((c, i) => (
            <path key={`rail-${i}`} d={curvePath(c)} stroke="#c9c3b2" strokeWidth="2" fill="none" strokeDasharray="3 6" strokeLinecap="round" opacity={a.curveO} />
          ))}
          {CURVES.map((c, i) => (
            <path
              key={`trace-${i}`}
              d={curvePath(c)}
              pathLength={1}
              stroke="#b5ae9b"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="1 1"
              strokeDashoffset={a.traces[i]}
            />
          ))}
          {a.amb.map((d, i) => (
            <circle key={`amb-${i}`} cx={d.x} cy={d.y} r="2.5" fill="#E0B400" opacity={d.o} />
          ))}
          {a.pk.map((p, i) => (
            <g key={`pk-${i}`} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
              <rect x="-15" y="-6" width="30" height="12" rx="6" fill={GOLD} stroke={INK} strokeWidth="2" />
            </g>
          ))}
          <circle cx="500" cy="295" r="74" fill="none" stroke="#cfc9b8" strokeWidth="1.5" strokeDasharray="4 8" transform={`rotate(${a.hub.rot} 500 295)`} opacity={a.hub.o} />
          <circle
            cx="500"
            cy="295"
            r="66"
            fill="none"
            stroke={INK}
            strokeWidth="3"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={a.hub.scanOff}
            transform="rotate(-90 500 295)"
            opacity={a.hub.scanO}
          />
        </svg>

        {/* Hub */}
        <div style={abs({ left: 444, top: 239, width: 112, height: 112, opacity: a.hub.o, transform: `scale(${a.hub.s})` })}>
          <div style={abs({ inset: 0, borderRadius: "50%", border: `2px solid ${GOLD}`, opacity: a.hub.pulseO, transform: `scale(${a.hub.pulseS})` })} />
          <div
            style={abs({
              inset: 0,
              boxSizing: "border-box",
              borderRadius: "50%",
              background: "#fff",
              border: `2px solid ${INK}`,
              boxShadow: `5px 6px 0 ${GOLD}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Icon size={52} radius={12} />
          </div>
        </div>

        {/* Hub label */}
        <div style={abs({ left: 350, top: 366, width: 300, display: "flex", justifyContent: "center", opacity: a.hub.o })}>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.08em", color: "#5f5e58", whiteSpace: "nowrap", textTransform: "uppercase", opacity: a.labelO }}>{a.label}</div>
        </div>

        {/* Findings */}
        {a.chips.map((c) => (
          <div
            key={c.sev}
            style={abs({
              left: 350,
              top: c.y,
              width: 300,
              height: 26,
              boxSizing: "border-box",
              border: `1.5px solid ${c.bc}`,
              borderRadius: 13,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 10px",
              fontSize: 11.5,
              opacity: c.o,
              transform: `translateX(${c.x}px) scale(${c.s})`,
            })}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
            <span style={{ fontFamily: MONO, fontSize: 10, color: "#5f5e58", width: 56 }}>{c.sev}</span>
            <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: c.strike, color: c.tc }}>{c.text}</span>
            <span style={{ fontFamily: MONO, fontSize: 9.5, color: "#8a887f", opacity: c.heldO }}>HELD</span>
          </div>
        ))}

        {/* Grouped alert */}
        <div
          style={abs({
            left: 390,
            top: a.group.y,
            width: 220,
            height: 34,
            boxSizing: "border-box",
            border: `2px solid ${INK}`,
            borderRadius: 17,
            background: GOLD,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: 12.5,
            fontWeight: 600,
            opacity: a.group.o,
            transform: `scale(${a.group.s})`,
          })}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />
          </svg>
          <span>1 alert · 2 changes</span>
        </div>

        {/* Severity gate */}
        <div style={abs({ left: 330, top: 506, width: 340, display: "flex", justifyContent: "center", opacity: a.gateO })}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 4px 0 12px", borderRadius: 15, background: "#fff", border: "1.5px solid #d9d3c2" }}>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", color: "#5f5e58", marginRight: 4 }}>GATE</span>
            {[
              { name: "Critical", dot: "#e5484d" },
              { name: "High", dot: "#f76b15" },
            ].map((g) => (
              <span key={g.name} style={{ height: 22, padding: "0 9px", borderRadius: 11, background: INK, color: "#fff", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: g.dot }} />
                {g.name}
              </span>
            ))}
            <span
              style={{
                height: 22,
                padding: "0 9px",
                borderRadius: 11,
                background: "#fff",
                border: "1.5px dashed #b8b2a1",
                boxSizing: "border-box",
                color: "#8a887f",
                fontSize: 11,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 5,
                transform: `translateX(${a.gateShake}px)`,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#E0B400" }} />
              Medium
            </span>
          </div>
        </div>

        {/* Email */}
        <ChannelCard card={email} left={30} top={36} icon={<Mail size={20} strokeWidth={1.8} color={INK} />} name="Email" desc="Grouped digests, gated by severity" tag="Delivered">
          <div style={{ margin: "0 12px 12px", padding: "10px 12px", borderRadius: 10, background: "#F7F5EE", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "#6b6a63" }}>
              <span style={{ fontWeight: 600, color: INK }}>MyKavo Alerts</span>
              <span>now</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>2 changes on northwind.coffee</div>
            <div style={{ fontSize: 11, color: "#6b6a63", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Critical: Checkout button missing · High: Canonical URL changed</div>
          </div>
        </ChannelCard>

        {/* Slack */}
        <ChannelCard card={slack} left={708} top={36} icon={<SlackIcon className="size-[22px]" />} name="Slack" desc="Straight into your #alerts channel" tag="Posted">
          <div style={{ margin: "0 12px 12px", padding: "10px 12px", borderRadius: 10, background: "#F7F5EE", display: "flex", gap: 10 }}>
            <Icon size={28} radius={6} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                <span style={{ fontWeight: 700 }}>MyKavo</span>
                <span style={{ fontSize: 8.5, fontWeight: 700, color: "#6b6a63", background: "#e6e2d7", borderRadius: 3, padding: "1px 4px" }}>APP</span>
                <span style={{ color: "#8a887f" }}>9:41</span>
                <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10, color: "#8a887f" }}>#alerts</span>
              </div>
              <div style={{ fontSize: 11.5, lineHeight: 1.4 }}>2 changes after the latest scan, 1 critical</div>
            </div>
          </div>
        </ChannelCard>

        {/* Discord */}
        <ChannelCard card={discord} left={30} top={330} icon={<DiscordIcon className="size-[22px]" />} name="Discord" desc="Pings where your team hangs out" tag="Pinged">
          <div style={{ margin: "0 12px 12px", padding: "10px 12px", borderRadius: 10, background: "#2b2d31", color: "#f2f3f5", display: "flex", gap: 10 }}>
            <Icon size={28} radius="50%" />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                <span style={{ fontWeight: 700 }}>MyKavo</span>
                <span style={{ fontSize: 8.5, fontWeight: 700, background: "#5865F2", color: "#fff", borderRadius: 3, padding: "1px 4px" }}>BOT</span>
                <span style={{ color: "#949ba4" }}>Today at 9:41</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
                <span style={{ height: 16, padding: "0 6px", borderRadius: 8, background: "#e5484d", color: "#fff", fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center" }}>CRITICAL</span>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Checkout button missing</span>
              </div>
            </div>
          </div>
        </ChannelCard>

        {/* Webhook */}
        <ChannelCard card={webhook} left={708} top={330} icon={<WebhookIcon className="size-[24px]" />} name="Webhook" desc="Signed JSON to any endpoint" tag="200 OK">
          <div
            style={{
              margin: "0 12px 12px",
              padding: "9px 12px",
              borderRadius: 10,
              background: INK,
              color: "#e8e6df",
              fontFamily: MONO,
              fontSize: 10,
              lineHeight: 1.55,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>
              <span style={{ color: GOLD }}>POST</span> /hooks/mykavo <span style={{ color: "#6fd49a" }}>200 · 142ms</span>
            </span>
            <span style={{ color: "#8a887f", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>x-mykavo-signature: sha256=9f2c…e41a</span>
            <span style={{ whiteSpace: "nowrap" }}>{'{"event":"mykavo.alert",...}'}</span>
          </div>
        </ChannelCard>
      </div>
    </div>
  );
}
