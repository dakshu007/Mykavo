"use client";

import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, CalendarClock, Check, FileDown, Inbox, MousePointer2 } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { useStageClock } from "./use-stage-clock";

/**
 * The client reports animation, in three steps:
 *
 *   1 Build   - the monthly report assembles: stats count up, the uptime bars
 *               grow, the Lighthouse rings fill, SSL checks in
 *   2 Brand   - a cursor picks the agency's colour; the MyKavo report
 *               re-themes to "Northstar Studio" (white label)
 *   3 Deliver - it is scheduled monthly, shrinks into the client's inbox,
 *               and gets opened
 *
 * Invented agency and numbers, labelled as such by the section. Same stage
 * approach as the other homepage animations (use-stage-clock.ts); reduced
 * motion shows the branded, finished report.
 */

const GOLD = "#FFD400";
const INK = "#151515";
const DIM = "#6B6B60";
const BLUE = "#2F6FEB";
const GREEN = "#16A34A";
const MONO = "var(--font-geist-mono), ui-monospace, monospace";

const W = 520;
const H = 600;
export const REPORT_CYCLE = 14;
const STILL_T = 7;

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

export const STEPS = ["Build", "Brand", "Deliver"] as const;
const BOUNDS = [0, 4.2, 7.2, REPORT_CYCLE];

// Card and inbox geometry: the card shrinks onto the first email's thumbnail.
const CARD = { x: 10, y: 56, w: 500, h: 486 };
const INBOX = { x: 10, y: 130, w: 500, h: 300 };
const THUMB = { x: INBOX.x + 18, y: INBOX.y + 66, size: 62 };

export const SCORES = [
  { label: "Performance", score: 91 },
  { label: "Accessibility", score: 98 },
  { label: "Best practices", score: 100 },
  { label: "SEO", score: 96 },
];

export function reportFrameAt(t: number) {
  const u = ((t % REPORT_CYCLE) + REPORT_CYCLE) % REPORT_CYCLE;
  let step = 0;
  for (let i = 0; i < 3; i++) if (u >= BOUNDS[i]) step = i;
  const c = (i: number) => ease(u, 0.5 + i * 0.22, 1.9 + i * 0.22);
  const shrink = ease(u, 8.0, 8.9);
  return {
    u,
    step,
    stepP: r(u, BOUNDS[step], BOUNDS[step + 1]),
    fade: Math.min(r(u, 0, 0.4), 1 - r(u, REPORT_CYCLE - 0.5, REPORT_CYCLE)),
    // build
    uptime: lerp(95, 99.98, c(0)),
    response: Math.round(lerp(0, 412, c(1))),
    changes: Math.round(lerp(0, 7, c(2))),
    scans: Math.round(lerp(0, 30, c(3))),
    spark: ease(u, 0.6, 1.9),
    rings: SCORES.map((_, i) => ease(u, 1.6 + i * 0.2, 2.8 + i * 0.2)),
    ssl: pop(u, 2.9, 3.3),
    // brand
    palette: pop(u, 4.4, 4.8) * (1 - r(u, 6.5, 6.8)),
    cur: { o: span(u, 4.45, 5.9, 0.25), p: ease(u, 4.5, 5.2), click: bell(u, 5.2, 5.5) },
    accent: ease(u, 5.4, 6.1),
    flip: r(u, 5.5, 6.1),
    // deliver
    schedule: pop(u, 7.3, 7.7),
    shrink,
    cardO: 1 - r(u, 8.75, 8.95),
    inbox: ease(u, 7.9, 8.5),
    thumbO: r(u, 8.8, 9.0),
    rowNew: ease(u, 8.9, 9.3),
    /** The live-link chip on the email. */
    opened: pop(u, 10.6, 11.0),
  };
}

export type ReportFrame = ReturnType<typeof reportFrameAt>;

/* ------------------------------ pieces ------------------------------ */

function Rail({ f }: { f: ReportFrame }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
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
              height: 36,
              padding: "0 16px 0 6px",
              borderRadius: 99,
              border: `1.5px solid ${on ? INK : "rgba(21,21,21,0.14)"}`,
              background: on ? INK : "#fff",
              color: on ? "#F5F5F0" : INK,
              fontSize: 14,
              fontWeight: 600,
              transition: "background 250ms, color 250ms",
            }}
          >
            <span style={{ width: 24, height: 24, borderRadius: 99, background: on || done ? GOLD : "#F3F1E6", color: INK, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 11, fontWeight: 700 }}>
              {done ? <Check size={13} strokeWidth={3} /> : i + 1}
            </span>
            {label}
            {on && <span style={abs({ left: 0, bottom: 0, height: 3, width: `${f.stepP * 100}%`, background: GOLD })} />}
          </div>
        );
      })}
    </div>
  );
}

function Ring({ score, p }: { score: number; p: number }) {
  const R = 22;
  const C = 2 * Math.PI * R;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={R} fill="none" stroke="rgba(22,163,74,0.14)" strokeWidth="5" />
      <circle
        cx="28"
        cy="28"
        r={R}
        fill="none"
        stroke={GREEN}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - (score / 100) * p)}
        transform="rotate(-90 28 28)"
      />
      <text x="28" y="33" textAnchor="middle" fontSize="15" fontWeight="700" fill={INK}>
        {Math.round(score * p)}
      </text>
    </svg>
  );
}

function Stat({ label, value, sub, children }: { label: string; value: string; sub: string; children?: ReactNode }) {
  return (
    <div style={{ position: "relative", borderRadius: 14, border: "1px solid rgba(21,21,21,0.1)", background: "#FBFAF3", padding: "12px 14px", height: 104, overflow: "hidden" }}>
      <div style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", color: DIM }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 12.5, color: DIM }}>{sub}</div>
      {children}
    </div>
  );
}

function Report({ f }: { f: ReportFrame }) {
  const s = lerp(1, THUMB.size / CARD.w, f.shrink);
  const tx = lerp(0, THUMB.x - CARD.x, f.shrink);
  const ty = lerp(0, THUMB.y - CARD.y, f.shrink);
  const brand = f.flip >= 0.5;
  return (
    <div
      style={abs({
        left: CARD.x,
        top: CARD.y,
        width: CARD.w,
        height: CARD.h,
        transformOrigin: "0 0",
        transform: `translate(${tx}px, ${ty}px) scale(${s})`,
        opacity: f.cardO,
        borderRadius: 18,
        border: `2px solid ${INK}`,
        background: "#fff",
        overflow: "hidden",
        boxShadow: f.shrink > 0.5 ? "none" : `8px 8px 0 ${GOLD}, 8px 8px 0 2px ${INK}`,
      })}
    >
      {/* accent bar: gold, then swept to the agency colour */}
      <div style={{ position: "relative", height: 8, background: GOLD }}>
        <div style={abs({ left: 0, top: 0, bottom: 0, width: `${f.accent * 100}%`, background: BLUE })} />
      </div>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid rgba(21,21,21,0.1)" }}>
        <div style={{ width: 44, height: 44, perspective: 400 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              background: brand ? BLUE : INK,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 15,
              transform: `rotateY(${f.flip * 180 - (brand ? 180 : 0)}deg)`,
            }}
          >
            {brand ? "NS" : <LogoMark size={24} />}
          </div>
        </div>
        <div style={{ position: "relative", flex: 1, height: 42 }}>
          <div style={abs({ left: 0, top: 0, fontSize: 17, fontWeight: 700, opacity: 1 - f.accent, transform: `translateY(${-f.accent * 6}px)` })}>MyKavo report</div>
          <div style={abs({ left: 0, top: 0, fontSize: 17, fontWeight: 700, opacity: f.accent, transform: `translateY(${(1 - f.accent) * 6}px)` })}>Northstar Studio</div>
          <div style={abs({ left: 0, top: 23, fontSize: 13, color: DIM })}>aurora-outdoor.com · September</div>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 99, border: "1px solid rgba(21,21,21,0.15)", fontSize: 12.5, fontWeight: 600 }}>
          <FileDown size={14} /> Save as PDF
        </span>
      </div>
      {/* stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 16 }}>
        <Stat label="UPTIME" value={`${f.uptime.toFixed(2)}%`} sub="1 incident · 4 min">
          <div style={abs({ right: 14, top: 14, display: "flex", gap: 2, alignItems: "flex-end" })}>
            {Array.from({ length: 18 }, (_, i) => (
              <span key={i} style={{ width: 4, borderRadius: 2, height: i === 11 ? 7 : 14, background: i === 11 ? "#F59E0B" : GREEN, opacity: f.spark > i / 18 ? 1 : 0.12 }} />
            ))}
          </div>
        </Stat>
        <Stat label="AVG RESPONSE" value={`${f.response} ms`} sub="Last 30 days" />
        <Stat label="CHANGES CAUGHT" value={String(f.changes)} sub="2 important · all resolved" />
        <Stat label="SCANS RUN" value={String(f.scans)} sub="12 pages monitored" />
      </div>
      {/* SSL */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderTop: "1px solid rgba(21,21,21,0.1)", fontSize: 14 }}>
        <span style={{ color: DIM }}>SSL certificate</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#067647", transform: `scale(${f.ssl})`, opacity: Math.min(1, f.ssl * 1.3) }}>
          <Check size={15} strokeWidth={3} /> Valid · 71 days left
        </span>
      </div>
      {/* Lighthouse */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", padding: "12px 10px 16px", borderTop: "1px solid rgba(21,21,21,0.1)" }}>
        {SCORES.map((s, i) => (
          <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <Ring score={s.score} p={f.rings[i]} />
            <span style={{ fontSize: 12, color: DIM }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Palette({ f }: { f: ReportFrame }) {
  const swatches = [GOLD, BLUE, "#16A34A", "#9333EA"];
  return (
    <div
      style={abs({
        right: 18,
        top: 132,
        width: 230,
        transformOrigin: "top right",
        transform: `scale(${f.palette})`,
        opacity: Math.min(1, f.palette * 1.3),
        borderRadius: 16,
        background: "#fff",
        border: `1.5px solid ${INK}`,
        boxShadow: `4px 4px 0 ${INK}`,
        padding: 14,
      })}
    >
      <div style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", color: DIM }}>YOUR BRAND</div>
      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        {swatches.map((c) => {
          const picked = c === BLUE && f.accent > 0.05;
          return (
            <span key={c} style={{ width: 34, height: 34, borderRadius: 99, background: c, boxShadow: picked ? `0 0 0 3px #fff, 0 0 0 5px ${INK}` : "none", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              {picked && <Check size={15} strokeWidth={3} />}
            </span>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "8px 10px", borderRadius: 10, background: "#FBFAF3", fontSize: 12.5 }}>
        <span style={{ width: 22, height: 22, borderRadius: 6, background: BLUE, color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>NS</span>
        northstar-logo.svg
        <Check size={14} color={GREEN} strokeWidth={3} style={{ marginLeft: "auto" }} />
      </div>
    </div>
  );
}

function InboxPanel({ f }: { f: ReportFrame }) {
  const others = [
    { from: "Hosting provider", subject: "Your invoice for September" },
    { from: "Aurora team", subject: "Re: new product photos" },
  ];
  return (
    <div
      style={abs({
        left: INBOX.x,
        top: INBOX.y,
        width: INBOX.w,
        height: INBOX.h,
        opacity: f.inbox,
        transform: `translateY(${(1 - f.inbox) * 30}px)`,
        borderRadius: 18,
        border: `2px solid ${INK}`,
        background: "#fff",
        overflow: "hidden",
        boxShadow: `8px 8px 0 ${GOLD}, 8px 8px 0 2px ${INK}`,
      })}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, height: 52, padding: "0 18px", borderBottom: "1px solid rgba(21,21,21,0.1)", background: "#F7F6EE" }}>
        <Inbox size={18} />
        <span style={{ fontSize: 15, fontWeight: 700 }}>Inbox</span>
        <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 12, color: DIM }}>sarah@aurora-outdoor.com</span>
      </div>
      {/* the report email */}
      <div style={{ position: "relative", display: "flex", gap: 14, padding: "14px 18px", height: 96, borderBottom: "1px solid rgba(21,21,21,0.08)", background: `rgba(47,111,235,${0.07 * f.rowNew})` }}>
        <div style={{ width: THUMB.size, height: THUMB.size, flexShrink: 0, borderRadius: 8, border: "1.5px solid rgba(21,21,21,0.2)", overflow: "hidden", opacity: f.thumbO, background: "#fff" }}>
          <div style={{ height: 3, background: BLUE }} />
          <div style={{ padding: 5 }}>
            <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: BLUE }} />
              <span style={{ width: 26, height: 3, borderRadius: 2, background: INK }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, marginTop: 5 }}>
              {[0, 1, 2, 3].map((i) => <span key={i} style={{ height: 10, borderRadius: 2, background: "#F1EFE6" }} />)}
            </div>
            <div style={{ display: "flex", gap: 3, marginTop: 5, justifyContent: "center" }}>
              {[0, 1, 2, 3].map((i) => <span key={i} style={{ width: 8, height: 8, borderRadius: 8, border: `1.5px solid ${GREEN}` }} />)}
            </div>
          </div>
        </div>
        <div style={{ minWidth: 0, flex: 1, opacity: f.rowNew, transform: `translateX(${(1 - f.rowNew) * 10}px)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 8, background: BLUE, opacity: 1 - f.opened }} />
            <span style={{ fontSize: 14.5, fontWeight: 700 }}>aurora-outdoor.com website report</span>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 11.5, color: DIM }}>Oct 1</span>
          </div>
          <div style={{ fontSize: 13, color: DIM, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Prepared by Northstar Studio · uptime 99.98% · 7 changes caught
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                fontWeight: 700,
                padding: "5px 10px",
                borderRadius: 99,
                background: BLUE,
                color: "#fff",
              }}
            >
              View the full report <ArrowRight size={12} />
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11.5,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 7,
                background: "#E7F6EC",
                color: "#15803D",
                transform: `scale(${f.opened})`,
                opacity: Math.min(1, f.opened * 1.3),
              }}
            >
              <Check size={12} strokeWidth={3} /> Live link · always current
            </span>
          </div>
        </div>
      </div>
      {others.map((o) => (
        <div key={o.subject} style={{ display: "flex", gap: 14, padding: "14px 18px", borderBottom: "1px solid rgba(21,21,21,0.08)", color: DIM }}>
          <span style={{ width: THUMB.size, height: 40, borderRadius: 8, background: "#F3F1E6", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{o.from}</div>
            <div style={{ fontSize: 13 }}>{o.subject}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const LABEL =
  "Animation: a monthly client report. 1, Build: the report assembles - 99.98% uptime, 412 ms average response, 7 changes caught, 30 scans, SSL valid, Lighthouse scores 91, 98, 100 and 96. 2, Brand: the agency picks its colour and logo, and the MyKavo report becomes a Northstar Studio report. 3, Deliver: the report is scheduled monthly, lands in the client's inbox as a PDF and is opened.";

export function ClientReportAnimation() {
  const { wrapRef, t, k } = useStageClock(W, STILL_T);
  const f = reportFrameAt(t);
  return (
    <div ref={wrapRef} role="img" aria-label={LABEL} style={{ position: "relative", width: "100%", aspectRatio: `${W} / ${H}` }}>
      <div aria-hidden style={abs({ left: 0, top: 0, width: W, height: H, transform: `scale(${k})`, transformOrigin: "0 0", color: INK, opacity: f.fade })}>
        <Rail f={f} />
        <InboxPanel f={f} />
        <Report f={f} />
        <Palette f={f} />
        {/* cursor */}
        <div
          style={abs({
            left: lerp(430, 342, f.cur.p),
            top: lerp(420, 182, f.cur.p),
            opacity: f.cur.o,
            transform: `scale(${1 - f.cur.click * 0.15})`,
            filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.35))",
          })}
        >
          <MousePointer2 size={26} fill="#fff" color={INK} strokeWidth={1.6} />
        </div>
        {/* schedule chip */}
        <div
          style={abs({
            left: "50%",
            top: 548,
            transform: `translateX(-50%) scale(${f.schedule})`,
            opacity: Math.min(1, f.schedule * 1.3),
            display: "flex",
            alignItems: "center",
            gap: 8,
            whiteSpace: "nowrap",
            background: INK,
            color: "#E9EBDF",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 13.5,
            boxShadow: `4px 4px 0 ${GOLD}`,
          })}
        >
          <CalendarClock size={16} color={GOLD} /> Emailed on the 1st of every month · 3 recipients
        </div>
      </div>
    </div>
  );
}
