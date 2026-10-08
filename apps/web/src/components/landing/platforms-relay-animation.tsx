"use client";

import type { CSSProperties, ReactNode } from "react";
import { Bell, Check, Mail, Sparkles } from "lucide-react";
import { DiscordIcon, SlackIcon, WebhookIcon } from "@/components/brand/integration-icons";
import { ChromeMark } from "./chrome-store-button";
import { BrandGlyph } from "./platform-marks";
import { stageClip, useStageClock } from "./use-stage-clock";

/**
 * "One change, everywhere" - the /platforms relay animation. A single
 * detected change (a missing Start Free Trial button, the example MyKavo's own
 * alerts use) leaves the card on the left and runs to every place the user
 * chose to be told: email, Slack, Discord, a signed webhook, an Android push,
 * the Chrome toolbar badge - and, on request, an AI assistant.
 *
 * The sample is CRITICAL on purpose: the Chrome badge only lights for a site
 * that is down or has a critical change, so showing it for a lesser change
 * would be wrong. Illustrative, and labelled so on the page.
 *
 * Every frame is a pure function of `t` (relayFrameAt). Same stage approach as
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

export const RELAY_W = 960;
export const RELAY_H = 480;
export const RELAY_CYCLE = 11;
const STILL_T = 6.5;

export const RELAY_ROWS = [
  { key: "email", label: "Email", sub: "Grouped, ranked by severity" },
  { key: "slack", label: "Slack", sub: "Into your alerts channel" },
  { key: "discord", label: "Discord", sub: "Where your team talks" },
  { key: "webhook", label: "Signed webhook", sub: "JSON to any endpoint" },
  { key: "push", label: "Android push", sub: "On your phone" },
  { key: "chrome", label: "Chrome badge", sub: "Only for down or critical" },
  { key: "ai", label: "AI assistant", sub: "Ask what changed" },
] as const;

const ROW_X = 556;
const ROW_W = 374;
const ROW_H = 52;
const ROW_GAP = 10;
const ROW_Y0 = 18;
const CARD_X = 34;
const CARD_Y = 92;
const CARD_W = 330;
const CARD_H = 296;
export const rowY = (i: number) => ROW_Y0 + i * (ROW_H + ROW_GAP);

const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const r = (x: number, a: number, b: number) => cl((x - a) / (b - a));
const ease = (x: number, a: number, b: number) => 1 - Math.pow(1 - r(x, a, b), 3);
const pop = (x: number, a: number, b: number) => {
  const p = r(x, a, b);
  if (p <= 0) return 0;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};
const abs = (s: CSSProperties): CSSProperties => ({ position: "absolute", ...s });

export function relayFrameAt(t: number) {
  const u = ((t % RELAY_CYCLE) + RELAY_CYCLE) % RELAY_CYCLE;
  const fade = Math.min(r(u, 0, 0.4), 1 - r(u, RELAY_CYCLE - 0.8, RELAY_CYCLE));
  return {
    u,
    fade,
    card: Math.min(pop(u, 0.3, 0.95), 1.08),
    chip: Math.min(pop(u, 1.05, 1.5), 1.1),
    rows: RELAY_ROWS.map((row, i) => {
      const a = 1.8 + i * 0.45;
      return {
        key: row.key,
        line: ease(u, a, a + 0.6),
        on: Math.min(pop(u, a + 0.5, a + 0.9), 1.08),
      };
    }),
  };
}

/** Slack, Discord, the webhook mark and Android keep their official colours, on white tiles. */
const BRANDED: ReadonlySet<(typeof RELAY_ROWS)[number]["key"]> = new Set(["slack", "discord", "webhook", "push"]);

const ICON: Record<(typeof RELAY_ROWS)[number]["key"], (c: string) => ReactNode> = {
  email: (c) => <Mail size={22} color={c} strokeWidth={2.2} />,
  slack: () => <SlackIcon className="size-[22px]" />,
  discord: () => <DiscordIcon className="size-[22px]" />,
  webhook: () => <WebhookIcon className="size-[22px]" />,
  push: () => <BrandGlyph slug="android" className="size-[24px]" />,
  chrome: () => <ChromeMark className="size-[22px]" />,
  ai: (c) => <Sparkles size={22} color={c} strokeWidth={2.2} />,
};

const curve = (i: number) => {
  const x1 = CARD_X + CARD_W;
  const y1 = CARD_Y + CARD_H / 2;
  const x2 = ROW_X;
  const y2 = rowY(i) + ROW_H / 2;
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
};

export function PlatformsRelayAnimation() {
  const { wrapRef, t, k, fitted } = useStageClock(RELAY_W, STILL_T, STILL_T);
  const f = relayFrameAt(t);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label="Animation: one critical change, a Start Free Trial button missing from the pricing page, is detected and then delivered to email, Slack, Discord, a signed webhook, an Android push and the Chrome toolbar badge, and is ready to ask about from an AI assistant."
      style={{ position: "relative", width: "100%", aspectRatio: `${RELAY_W} / ${RELAY_H}`, overflow: stageClip(fitted) }}
    >
      <div
        aria-hidden
        style={abs({
          left: 0,
          top: 0,
          width: RELAY_W,
          height: RELAY_H,
          transformOrigin: "0 0",
          transform: `scale(${k})`,
          backgroundColor: BG,
          backgroundImage: "radial-gradient(#26261f 1px, transparent 1.3px)",
          backgroundSize: "24px 24px",
          borderRadius: 28,
          overflow: "hidden",
          color: TEXT,
          opacity: f.fade,
        })}
      >
        <svg width={RELAY_W} height={RELAY_H} viewBox={`0 0 ${RELAY_W} ${RELAY_H}`} style={abs({ left: 0, top: 0 })}>
          {RELAY_ROWS.map((row, i) => (
            <g key={row.key}>
              <path d={curve(i)} fill="none" stroke={LINE} strokeWidth="1.5" strokeDasharray="3 7" opacity={f.card} />
              <path
                d={curve(i)}
                fill="none"
                stroke={GOLD}
                strokeWidth="3"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={1 - f.rows[i].line}
                opacity={f.rows[i].line > 0 ? 1 : 0}
              />
            </g>
          ))}
        </svg>

        {/* The detected change */}
        <div
          style={abs({
            left: CARD_X,
            top: CARD_Y,
            width: CARD_W,
            height: CARD_H,
            boxSizing: "border-box",
            borderRadius: 22,
            background: CARD,
            border: `2px solid ${GOLD}`,
            boxShadow: `8px 8px 0 ${GOLD}`,
            padding: 24,
            transform: `scale(${f.card})`,
            opacity: Math.min(1, f.card),
          })}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: MONO, fontSize: 15, letterSpacing: 2, color: GOLD }}>
            <Bell size={18} color={GOLD} strokeWidth={2.4} />
            CHANGE DETECTED
          </div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 30, lineHeight: 1.18, marginTop: 20 }}>
            Start Free Trial button is missing
          </div>
          <div style={{ fontFamily: MONO, fontSize: 17, color: DIM, marginTop: 14 }}>/pricing  ·  Conversion</div>
          <div
            style={{
              marginTop: 26,
              display: "inline-block",
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 19,
              letterSpacing: 2,
              background: GOLD,
              color: "#151515",
              borderRadius: 999,
              padding: "7px 18px",
              transform: `scale(${f.chip})`,
              transformOrigin: "0 50%",
              opacity: Math.min(1, f.chip),
            }}
          >
            CRITICAL
          </div>
        </div>

        {/* Destinations */}
        {RELAY_ROWS.map((row, i) => {
          const on = f.rows[i].on;
          const lit = on > 0.05;
          return (
            <div
              key={row.key}
              style={abs({
                left: ROW_X,
                top: rowY(i),
                width: ROW_W,
                height: ROW_H,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "0 14px 0 10px",
                borderRadius: 26,
                background: lit ? "#25241c" : CARD,
                border: `2px solid ${lit ? GOLD : "#4a4a40"}`,
                boxShadow: lit ? `0 0 ${10 + 12 * Math.min(on, 1)}px rgba(255,212,0,0.22)` : undefined,
                transform: `scale(${0.96 + 0.04 * Math.min(on, 1)})`,
              })}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  flex: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: BRANDED.has(row.key) ? "#FFFFFF" : lit ? GOLD : "#2b2a22",
                }}
              >
                {ICON[row.key](lit ? "#151515" : GOLD)}
              </span>
              <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1, minWidth: 0 }}>
                <span style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 500, whiteSpace: "nowrap" }}>{row.label}</span>
                <span style={{ fontFamily: MONO, fontSize: 13, color: DIM, whiteSpace: "nowrap" }}>{row.sub}</span>
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  flex: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: lit ? GOLD : "transparent",
                  border: `2px solid ${lit ? GOLD : "#55554a"}`,
                  transform: `scale(${0.7 + 0.3 * Math.min(on, 1)})`,
                }}
              >
                {lit && <Check size={16} color="#151515" strokeWidth={3.2} />}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
