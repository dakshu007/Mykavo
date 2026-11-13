"use client";

import type { CSSProperties } from "react";
import { useStageClock } from "./use-stage-clock";

/**
 * The AI Keywords & Blog Writer animation: MyKavo reads a website and fills
 * in its profile, ranks the keywords worth writing, the cursor presses
 * "Write post" on the top one, and the draft writes itself: title, slug,
 * meta description, body, then the FAQ, schema and review-note chips, and
 * "Draft ready".
 *
 * The bakery, its keywords and the post are illustrative (the page labels
 * them so), shaped like the real screens in /dashboard/keywords. Same stage
 * approach as the other landing animations - see use-stage-clock.ts.
 */

const GOLD = "#FFD400";
const INK = "#151515";
const MUTED = "#6B6B60";
const STAGE_W = 600;
const STAGE_H = 600;
const INTRO = 0.8;
const CYCLE = 13;
/** Still frame for reduced motion, and the picture before the loop starts. */
const FINISHED_U = 10.4;
const STILL_T = INTRO + FINISHED_U;
const MONO = "var(--font-geist-mono), ui-monospace, monospace";

const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const r = (x: number, a: number, b: number) => cl((x - a) / (b - a));
const enter = (x: number, a: number, b: number) => 1 - Math.pow(1 - r(x, a, b), 3);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const pop = (x: number, a: number, b: number) => {
  const p = r(x, a, b);
  if (p <= 0) return 0;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};

export const BW_SITE = "yourbakery.com";
export const BW_PROFILE = ["Home bakery", "Home bakers", "US · en"];
export const BW_KEYWORDS: { keyword: string; tag: string; score: number }[] = [
  { keyword: "sourdough starter for beginners", tag: "Rank 11", score: 0.92 },
  { keyword: "how long to proof bread dough", tag: "Rank 14", score: 0.81 },
  { keyword: "best flour for sourdough", tag: "New", score: 0.7 },
  { keyword: "no knead bread recipe", tag: "New", score: 0.58 },
];
export const BW_TITLE = "Sourdough Starter for Beginners: A 7-Day Guide";
export const BW_SLUG = "/blog/sourdough-starter-for-beginners";
export const BW_META = "Make a starter at home in 7 days: what to feed it, how to tell it's ready and what to avoid.";
export const BW_CHIPS = ["FAQ · 5 questions", "JSON-LD schema", "3 review notes"];

/** Everything the scene needs for one moment in time. */
export function blogWriterFrameAt(t: number) {
  const inC = t >= INTRO;
  // Before the loop starts, show the finished picture the intro fades into.
  const u = inC ? (t - INTRO) % CYCLE : FINISHED_U;
  const intro = enter(Math.min(t, INTRO), 0, INTRO);
  const out = 1 - enter(u, 12.3, 12.9);
  const fade = (a: number, b: number) => Math.min(enter(u, a, b), out) * intro;

  const site = { o: fade(0, 0.6), y: lerp(16, 0, enter(u, 0, 0.6)), read: r(u, 0.3, 1.7) };
  const profile = BW_PROFILE.map((_, i) => pop(u, 1.4 + i * 0.25, 1.85 + i * 0.25));

  const list = { o: fade(2.2, 2.8), y: lerp(16, 0, enter(u, 2.2, 2.8)) };
  const rows = BW_KEYWORDS.map((_, i) => ({
    o: enter(u, 2.5 + i * 0.25, 2.95 + i * 0.25),
    bar: enter(u, 2.8 + i * 0.25, 3.6 + i * 0.25),
  }));
  const pick = r(u, 4.0, 4.4);

  // Cursor glides to "Write post" on the top row and presses it.
  const glide = enter(u, 4.1, 4.85);
  const cursor = {
    o: r(u, 4.0, 4.2) * (1 - r(u, 5.3, 5.6)),
    x: lerp(470, 516, glide),
    y: lerp(470, 240, glide),
  };
  const pressed = u > 4.85 && u < 5.1;

  const post = { o: fade(5.2, 5.8), y: lerp(26, 0, enter(u, 5.2, 5.8)) };
  const thinking = u > 5.2 && u < 5.7;
  const typed = Math.floor(BW_TITLE.length * r(u, 5.7, 7.0));
  const title = BW_TITLE.slice(0, typed);
  const caret = u > 5.7 && u < 7.2;
  const meta = enter(u, 7.0, 7.5);
  const body = [0, 1, 2, 3].map((i) => enter(u, 7.4 + i * 0.3, 8.0 + i * 0.3));
  const chips = BW_CHIPS.map((_, i) => pop(u, 8.8 + i * 0.3, 9.25 + i * 0.3));
  const ready = pop(u, 9.8, 10.3);

  return { site, profile, list, rows, pick, cursor, pressed, post, thinking, title, caret, meta, body, chips, ready };
}

const abs = (s: CSSProperties): CSSProperties => ({ position: "absolute", ...s });

const card = (extra: CSSProperties): CSSProperties =>
  abs({
    boxSizing: "border-box",
    border: `2px solid ${INK}`,
    borderRadius: 16,
    background: "#fff",
    boxShadow: `8px 8px 0 ${GOLD}`,
    ...extra,
  });

const LABEL =
  "Animation: MyKavo reads yourbakery.com and fills in its profile, home bakery, home bakers, US English. It ranks four keywords worth writing, led by sourdough starter for beginners, which already ranks 11th. Write post is pressed and a draft appears: Sourdough Starter for Beginners, A 7-Day Guide, with a URL slug, meta description, the article, an FAQ, JSON-LD schema and review notes, marked Draft ready.";

/** `lazy`: draw the stage only once it nears the screen (see useStageClock). */
export function BlogWriterAnimation({ lazy = false }: { lazy?: boolean } = {}) {
  const { wrapRef, t, k, near } = useStageClock(STAGE_W, STILL_T, STILL_T, lazy);
  const f = blogWriterFrameAt(t);
  const wrapStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    aspectRatio: `${STAGE_W} / ${STAGE_H}`,
    overflow: "hidden",
  };

  if (!near) return <div ref={wrapRef} role="img" aria-label={LABEL} style={wrapStyle} />;

  return (
    <div ref={wrapRef} role="img" aria-label={LABEL} style={wrapStyle}>
      <div
        aria-hidden
        style={abs({
          left: 0,
          top: 0,
          width: STAGE_W,
          height: STAGE_H,
          transformOrigin: "0 0",
          transform: `scale(${k})`,
          color: INK,
          fontSize: 14,
        })}
      >
        {/* 1. Reading the site */}
        <div style={card({ left: 20, top: 16, width: 552, padding: "14px 18px", opacity: f.site.o, transform: `translateY(${f.site.y}px)` })}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.14em", color: MUTED }}>01 / YOUR BUSINESS</span>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 12, fontWeight: 600 }}>{BW_SITE}</span>
          </div>
          <div style={{ marginTop: 10, height: 6, borderRadius: 99, background: "#15151514", overflow: "hidden" }}>
            <div style={{ width: `${f.site.read * 100}%`, height: "100%", background: INK }} />
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "nowrap" }}>
            {BW_PROFILE.map((p, i) => (
              <span
                key={p}
                style={{
                  border: `1.5px solid ${INK}`,
                  borderRadius: 99,
                  padding: "3px 11px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  background: i === 0 ? GOLD : "#fff",
                  opacity: Math.min(1, f.profile[i]!),
                  transform: `scale(${0.6 + 0.4 * f.profile[i]!})`,
                }}
              >
                {p}
              </span>
            ))}
            <span style={{ marginLeft: "auto", alignSelf: "center", fontSize: 12, color: MUTED, opacity: f.profile[2]! > 0.9 ? 1 : 0 }}>
              Confirmed
            </span>
          </div>
        </div>

        {/* 2. Keywords worth writing */}
        <div style={card({ left: 20, top: 148, width: 552, padding: "12px 16px 10px", opacity: f.list.o, transform: `translateY(${f.list.y}px)` })}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.14em", color: MUTED }}>02 / WHAT TO WRITE NEXT</span>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.1em", color: MUTED }}>SCORE</span>
          </div>
          {BW_KEYWORDS.map((row, i) => {
            const top = i === 0;
            return (
              <div
                key={row.keyword}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 8,
                  padding: "7px 8px",
                  borderRadius: 10,
                  background: top ? `rgba(255, 212, 0, ${0.28 * f.pick})` : "transparent",
                  outline: top && f.pick > 0 ? `1.5px solid rgba(21, 21, 21, ${f.pick})` : "none",
                  opacity: f.rows[i]!.o,
                  transform: `translateX(${lerp(-14, 0, f.rows[i]!.o)}px)`,
                }}
              >
                <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED, width: 16 }}>{i + 1}</span>
                <span style={{ fontSize: 14, fontWeight: top ? 700 : 500, flex: 1, whiteSpace: "nowrap" }}>{row.keyword}</span>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 99,
                    background: row.tag === "New" ? "#E8F5EC" : "#FFF6CC",
                    color: row.tag === "New" ? "#1F7A3E" : "#7A5C00",
                  }}
                >
                  {row.tag}
                </span>
                <span style={{ width: 70, height: 6, borderRadius: 99, background: "#15151514", overflow: "hidden" }}>
                  <span style={{ display: "block", width: `${row.score * f.rows[i]!.bar * 100}%`, height: "100%", background: INK }} />
                </span>
                {top ? (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: 99,
                      background: INK,
                      color: "#fff",
                      opacity: f.pick,
                      transform: `scale(${f.pressed ? 0.93 : 1})`,
                    }}
                  >
                    Write post
                  </span>
                ) : (
                  <span style={{ width: 76 }} />
                )}
              </div>
            );
          })}
        </div>

        {/* 3. The draft */}
        <div style={card({ left: 56, top: 318, width: 516, padding: "14px 18px", opacity: f.post.o, transform: `translateY(${f.post.y}px)` })}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.14em", color: MUTED }}>03 / YOUR POST</span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.06em",
                padding: "3px 10px",
                borderRadius: 99,
                background: f.ready > 0 ? "#E8F5EC" : "#15151510",
                color: f.ready > 0 ? "#1F7A3E" : MUTED,
                transform: `scale(${f.ready > 0 ? 0.7 + 0.3 * f.ready : 1})`,
              }}
            >
              {f.ready > 0 ? "DRAFT READY" : f.thinking ? "READING RESULTS" : "WRITING"}
            </span>
          </div>
          <div style={{ marginTop: 8, minHeight: 50, fontSize: 19, fontWeight: 800, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
            {f.title}
            {f.caret ? <span style={{ display: "inline-block", width: 2, height: 20, marginLeft: 2, verticalAlign: "-3px", background: INK }} /> : null}
          </div>
          <div style={{ opacity: f.meta }}>
            <div style={{ fontFamily: MONO, fontSize: 11.5, color: "#1F7A3E" }}>{BW_SLUG}</div>
            <div style={{ marginTop: 3, fontSize: 12.5, lineHeight: 1.4, color: MUTED }}>{BW_META}</div>
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            {[0.96, 0.88, 0.93, 0.6].map((w, i) => (
              <div key={i} style={{ height: 7, borderRadius: 99, background: "#15151512", width: `${w * 100}%`, overflow: "hidden" }}>
                <div style={{ width: `${f.body[i]! * 100}%`, height: "100%", background: i === 0 ? "#15151566" : "#15151538" }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 7 }}>
            {BW_CHIPS.map((c, i) => (
              <span
                key={c}
                style={{
                  border: `1.5px solid ${INK}`,
                  borderRadius: 8,
                  padding: "3px 9px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  background: i === 1 ? GOLD : "#fff",
                  opacity: Math.min(1, f.chips[i]!),
                  transform: `translateY(${lerp(8, 0, Math.min(1, f.chips[i]!))}px) scale(${0.7 + 0.3 * f.chips[i]!})`,
                }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Cursor */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          style={abs({ left: f.cursor.x, top: f.cursor.y, opacity: f.cursor.o, filter: "drop-shadow(1px 2px 0 rgba(0,0,0,0.25))" })}
        >
          <path d="M4 2l15 9-6.5 1.6L9.8 19z" fill="#fff" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
