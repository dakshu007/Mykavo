"use client";

import type { CSSProperties, ReactNode } from "react";
import { Globe, Rocket, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { ChromeMark } from "./chrome-store-button";
import { BrandGlyph, isBrandedPlatform } from "./platform-marks";
import { stageClip, useStageClock } from "./use-stage-clock";
import { ALERT_CHANNELS } from "@/config/platforms";

/**
 * "The orbit" - the /platforms hero animation. MyKavo sits at the core; the
 * platforms it works through ring it, turning slowly. Every three seconds one
 * platform pings: a packet travels to the core, the core flashes, and the
 * alert channels on the outer ring light up one by one. Shopify, which is not
 * listed yet, only gets a ghost ring - nothing is ever shown doing what it
 * cannot do yet.
 *
 * Every frame is a pure function of `t` (orbitFrameAt), so it is testable and
 * the reduced-motion visitor gets one finished still. Same stage approach as
 * the other landing animations (use-stage-clock.ts).
 */

const GOLD = "#FFD400";
const BG = "#0C0C0B";
const CARD = "#1A1A17";
const LINE = "#3A3A33";
const TEXT = "#F2F2EA";
const DIM = "#9C9E93";
const MONO = "var(--font-geist-mono), ui-monospace, monospace";
const DISPLAY = "var(--font-poppins), var(--font-app-sans), sans-serif";

export const STAGE_W = 960;
export const STAGE_H = 680;
export const CX = 480;
export const CY = 335;
/** The platform ring and the alert-channel ring are ellipses: the wide pills need the room. */
export const RX_IN = 235;
export const RY_IN = 165;
export const RX_OUT = 415;
export const RY_OUT = 285;
export const ORBIT_CYCLE = 18;
export const PING = 3;
const STILL_T = 2.6;

export type OrbitNode = {
  id: "wordpress" | "chrome" | "android" | "shopify" | "ai" | "deploy";
  label: string;
  /** Can it send an alert today? Shopify cannot yet, so it only ghost-pings. */
  live: boolean;
  caption: string;
};

export const ORBIT_NODES: OrbitNode[] = [
  {
    id: "wordpress",
    label: "WordPress",
    live: true,
    caption: "A plugin update finishes. MyKavo checks the site and names the update that broke it.",
  },
  {
    id: "chrome",
    label: "Chrome",
    live: true,
    caption: "One click on any page and the site is protected, watched around the clock.",
  },
  {
    id: "android",
    label: "Android",
    live: true,
    caption: "The alert reaches your phone, ranked by severity, wherever you are.",
  },
  {
    id: "shopify",
    label: "Shopify",
    live: false,
    caption: "Coming soon: theme-change checks inside your Shopify admin.",
  },
  {
    id: "ai",
    label: "AI assistants",
    live: true,
    caption: "Ask your assistant what changed. It reads MyKavo, read-only.",
  },
  {
    id: "deploy",
    label: "Deploys",
    live: true,
    caption: "A release goes out. A scan runs straight away and a verdict follows.",
  },
];

const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const r = (x: number, a: number, b: number) => cl((x - a) / (b - a));
const ease = (x: number, a: number, b: number) => 1 - Math.pow(1 - r(x, a, b), 3);
const bump = (x: number, a: number, b: number) => Math.sin(Math.PI * r(x, a, b));
const pop = (x: number, a: number, b: number) => {
  const p = r(x, a, b);
  if (p <= 0) return 0;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};
const abs = (s: CSSProperties): CSSProperties => ({ position: "absolute", ...s });
const rad = (deg: number) => (deg * Math.PI) / 180;

export function orbitFrameAt(t: number) {
  const u = ((t % ORBIT_CYCLE) + ORBIT_CYCLE) % ORBIT_CYCLE;
  const active = Math.floor(u / PING);
  const lt = u - active * PING;
  const node = ORBIT_NODES[active];
  const rot = t * 7; // degrees: the platform ring turns about once a minute

  const nodes = ORBIT_NODES.map((n, i) => {
    const a = rad(rot + i * 60 - 90);
    return { id: n.id, x: CX + RX_IN * Math.cos(a), y: CY + RY_IN * Math.sin(a), active: i === active };
  });

  const from = nodes[active];
  const travel = node.live ? ease(lt, 0.25, 1.25) : 0;
  const fadeOut = 1 - r(lt, 2.55, 2.95);

  return {
    u,
    active,
    node,
    glow: r(lt, 0, 0.3) * fadeOut,
    packet: {
      x: from.x + (CX - from.x) * travel,
      y: from.y + (CY - from.y) * travel,
      o: node.live && lt > 0.25 && lt < 1.3 ? 1 : 0,
    },
    ghost: node.live ? 0 : bump(lt, 0.3, 2.2),
    flash: node.live ? bump(lt, 1.15, 1.95) : 0,
    nodes,
    channels: ALERT_CHANNELS.map((label, i) => {
      const a = rad(-rot * 0.5 + i * 72 - 90);
      return {
        label,
        x: CX + RX_OUT * Math.cos(a),
        y: CY + RY_OUT * Math.sin(a),
        on: node.live ? Math.min(pop(lt, 1.5 + i * 0.16, 1.85 + i * 0.16), 1) * fadeOut : 0,
      };
    }),
  };
}

/** Real marks (WordPress, Android, Shopify) keep their own colours; the rest use MyKavo's gold. */
const NODE_ICON: Record<OrbitNode["id"], (c: string) => ReactNode> = {
  wordpress: () => <BrandGlyph slug="wordpress" className="size-[24px]" />,
  chrome: () => <ChromeMark className="size-[22px]" />,
  android: () => <BrandGlyph slug="android" className="size-[24px]" />,
  shopify: () => <BrandGlyph slug="shopify" className="size-[22px]" />,
  ai: (c) => <Sparkles size={22} color={c} strokeWidth={2.2} />,
  deploy: (c) => <Rocket size={22} color={c} strokeWidth={2.2} />,
};

export function PlatformsOrbitAnimation() {
  const { wrapRef, t, k, fitted } = useStageClock(STAGE_W, STILL_T, STILL_T);
  const f = orbitFrameAt(t);

  return (
    <div>
      <div
        ref={wrapRef}
        role="img"
        aria-label="Animation: MyKavo at the centre with WordPress, Chrome, Android, AI assistants and deploy pipelines orbiting it, plus Shopify marked coming soon. Each platform in turn sends a signal to MyKavo, which fans an alert out to email, Slack, Discord, a webhook and push."
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: `${STAGE_W} / ${STAGE_H}`,
          overflow: stageClip(fitted),
        }}
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
            backgroundColor: BG,
            backgroundImage: "radial-gradient(#26261f 1px, transparent 1.3px)",
            backgroundSize: "24px 24px",
            borderRadius: 28,
            overflow: "hidden",
            color: TEXT,
          })}
        >
          <svg width={STAGE_W} height={STAGE_H} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} style={abs({ left: 0, top: 0 })}>
            <ellipse cx={CX} cy={CY} rx={RX_OUT} ry={RY_OUT} fill="none" stroke={LINE} strokeWidth="1.5" strokeDasharray="2 9" strokeLinecap="round" />
            <ellipse cx={CX} cy={CY} rx={RX_IN} ry={RY_IN} fill="none" stroke={LINE} strokeWidth="1.5" strokeDasharray="6 10" />
            {f.nodes.map((n) => (
              <line
                key={`spoke-${n.id}`}
                x1={n.x}
                y1={n.y}
                x2={CX}
                y2={CY}
                stroke={n.active ? GOLD : LINE}
                strokeWidth={n.active ? 2 : 1}
                opacity={n.active ? 0.25 + 0.6 * f.glow : 0.45}
                strokeDasharray="3 7"
              />
            ))}
            {/* The ping: a gold packet running to the core, or a ghost ring for Shopify. */}
            <circle cx={f.packet.x} cy={f.packet.y} r="9" fill={GOLD} opacity={f.packet.o} />
            <circle cx={f.packet.x} cy={f.packet.y} r="18" fill="none" stroke={GOLD} strokeWidth="2" opacity={f.packet.o * 0.4} />
            <circle
              cx={f.nodes[f.active].x}
              cy={f.nodes[f.active].y}
              r={46 + 26 * f.ghost}
              fill="none"
              stroke={GOLD}
              strokeWidth="2"
              strokeDasharray="5 7"
              opacity={f.node.live ? 0 : 0.6 * f.ghost}
            />
            <circle cx={CX} cy={CY} r={86 + 70 * f.flash} fill="none" stroke={GOLD} strokeWidth="2.5" opacity={0.65 * (1 - f.flash)} />
            <circle cx={CX} cy={CY} r={86} fill="none" stroke={GOLD} strokeWidth="2" opacity={0.25 + 0.5 * f.flash} />
            {f.channels.map((c) => (
              <line key={`ray-${c.label}`} x1={CX} y1={CY} x2={c.x} y2={c.y} stroke={GOLD} strokeWidth="1.5" opacity={0.35 * c.on} strokeDasharray="2 8" />
            ))}
          </svg>

          {/* Core */}
          <div
            style={abs({
              left: CX - 66,
              top: CY - 66,
              width: 132,
              height: 132,
              borderRadius: "50%",
              background: GOLD,
              boxShadow: `0 0 ${24 + 50 * f.flash}px ${6 + 14 * f.flash}px rgba(255,212,0,${0.18 + 0.32 * f.flash})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${1 + 0.06 * f.flash})`,
            })}
          >
            <LogoMark size={74} className="text-[#151515]" />
          </div>
          <div
            style={abs({
              left: CX - 100,
              top: CY + 76,
              width: 200,
              textAlign: "center",
              fontFamily: MONO,
              fontSize: 16,
              letterSpacing: 2,
              color: GOLD,
            })}
          >
            MYKAVO.APP
          </div>

          {/* Platform nodes */}
          {f.nodes.map((n, i) => {
            const meta = ORBIT_NODES[i];
            const on = n.active;
            const soon = !meta.live;
            return (
              <div
                key={n.id}
                style={abs({
                  left: n.x - 98,
                  top: n.y - 30,
                  width: 196,
                  height: 60,
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "0 14px 0 10px",
                  borderRadius: 30,
                  background: on ? "#25241c" : CARD,
                  border: `2px ${soon ? "dashed" : "solid"} ${on ? GOLD : "#4a4a40"}`,
                  boxShadow: on ? `0 0 ${10 + 22 * f.glow}px rgba(255,212,0,${0.12 + 0.3 * f.glow})` : undefined,
                  opacity: soon && !on ? 0.72 : 1,
                  transform: `scale(${on ? 1 + 0.05 * f.glow : 1})`,
                })}
              >
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isBrandedPlatform(meta.id) ? "#FFFFFF" : on ? GOLD : "#2b2a22",
                  }}
                >
                  {NODE_ICON[meta.id](on ? "#151515" : GOLD)}
                </span>
                <span style={{ fontFamily: DISPLAY, fontSize: 21, fontWeight: 500, whiteSpace: "nowrap", color: TEXT }}>
                  {meta.label}
                </span>
                {soon && (
                  <span
                    style={{
                      position: "absolute",
                      right: 10,
                      top: -12,
                      fontFamily: MONO,
                      fontSize: 13,
                      letterSpacing: 1,
                      background: BG,
                      border: `1px solid ${GOLD}`,
                      color: GOLD,
                      borderRadius: 10,
                      padding: "1px 7px",
                    }}
                  >
                    SOON
                  </span>
                )}
              </div>
            );
          })}

          {/* Alert channels on the outer ring */}
          {f.channels.map((c) => (
            <div key={c.label} style={abs({ left: c.x - 11, top: c.y - 11, width: 22, height: 22 })}>
              <div
                style={abs({
                  inset: 0,
                  borderRadius: "50%",
                  background: c.on > 0.05 ? GOLD : "#2b2a22",
                  border: `2px solid ${c.on > 0.05 ? GOLD : "#55554a"}`,
                  transform: `scale(${0.85 + 0.35 * c.on})`,
                })}
              />
              <div
                style={abs({
                  left: -34,
                  top: 28,
                  width: 90,
                  textAlign: "center",
                  fontFamily: MONO,
                  fontSize: 15,
                  letterSpacing: 1,
                  color: c.on > 0.05 ? GOLD : DIM,
                  opacity: 0.55 + 0.45 * Math.min(1, c.on),
                })}
              >
                {c.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The caption lives outside the stage so it stays readable on a phone. */}
      <div className="mt-5 flex min-h-[4.5rem] flex-col items-center gap-2 text-center sm:min-h-[3.5rem]">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#FFD400]/60 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FFD400]">
          <Globe className="size-3.5" aria-hidden />
          {f.node.label}
        </span>
        <p className="max-w-xl text-[15px] leading-6 text-[#E9EBDF]">{f.node.caption}</p>
      </div>
    </div>
  );
}
