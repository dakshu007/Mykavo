"use client";

import type { CSSProperties } from "react";
import { useStageClock } from "./use-stage-clock";

/**
 * The homepage AI Website Insights animation: a CRITICAL alert lands, the
 * cursor presses "Explain this change", and MyKavo AI writes its answer -
 * the headline types itself, why it matters fades in, the WordPress fix
 * steps tick in one by one and the urgency chip pops.
 *
 * The alert and the answer are illustrative (the section labels them so) but
 * shaped exactly like the real card on a change page. Same stage approach as
 * the other homepage animations - see use-stage-clock.ts.
 */

const GOLD = "#FFD400";
const INK = "#151515";
const STAGE_W = 600;
const STAGE_H = 560;
const INTRO = 0.8;
const CYCLE = 12.5;
/** Still frame for reduced motion: the whole answer written. */
const STILL_T = INTRO + 8;
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

export const AI_HEADLINE = "Google has been told to drop /pricing from search.";
export const AI_WHY =
  "A noindex tag appeared on your pricing page, likely from a plugin setting or a staging switch left on. Once Google recrawls it, the page stops showing in results.";
export const AI_STEPS = [
  "In WordPress, open Settings → Reading and untick “Discourage search engines”.",
  "In Yoast SEO, set “Allow search engines to show this page” to Yes.",
  "Run a manual scan in MyKavo to confirm the fix.",
];

/** Everything the scene needs for one moment in time. */
export function aiFrameAt(t: number) {
  const inC = t >= INTRO;
  // Before the loop starts, show the finished picture the intro fades into.
  const u = inC ? (t - INTRO) % CYCLE : 8;
  const intro = enter(Math.min(t, INTRO), 0, INTRO);
  const out = 1 - enter(u, 11.6, 12.2);

  const alert = { o: Math.min(enter(u, 0, 0.6), out) * intro, y: lerp(18, 0, enter(u, 0, 0.6)) };

  // Cursor glides to the button and presses it.
  const glide = enter(u, 0.8, 1.6);
  const cursor = {
    o: r(u, 0.7, 0.9) * (1 - r(u, 2.2, 2.5)),
    x: lerp(470, 132, glide),
    y: lerp(300, 196, glide),
  };
  const pressed = u > 1.6 && u < 1.85;
  const button = { scale: pressed ? 0.95 : 1, glow: 0.5 + 0.5 * Math.sin(u * 4) };

  const ai = { o: Math.min(enter(u, 1.8, 2.3), out) * intro, y: lerp(16, 0, enter(u, 1.8, 2.3)) };
  const thinking = u > 1.8 && u < 2.6;

  const typed = Math.floor(AI_HEADLINE.length * r(u, 2.6, 4.0));
  const headline = AI_HEADLINE.slice(0, typed);
  const caret = u > 2.6 && u < 4.3;
  const why = enter(u, 4.1, 4.7);
  const steps = AI_STEPS.map((_, i) => enter(u, 4.9 + i * 0.6, 5.4 + i * 0.6));
  const urgency = pop(u, 6.8, 7.3);

  return { alert, cursor, button, ai, thinking, headline, caret, why, steps, urgency };
}

const abs = (s: CSSProperties): CSSProperties => ({ position: "absolute", ...s });

export function AiInsightsAnimation() {
  const { wrapRef, t, k } = useStageClock(STAGE_W, STILL_T, INTRO + 8);
  const f = aiFrameAt(t);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label={`Animation: a critical alert says the pricing page is now set to noindex. The Explain this change button is pressed and MyKavo AI answers: "${AI_HEADLINE}" It explains why it matters and lists three fix steps for WordPress, marked Act now.`}
      style={{ position: "relative", width: "100%", aspectRatio: `${STAGE_W} / ${STAGE_H}`, overflow: "hidden" }}
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
          color: INK,
          fontSize: 14,
        })}
      >
        {/* The alert */}
        <div
          style={abs({
            left: 24,
            top: 20,
            width: 540,
            boxSizing: "border-box",
            border: `2px solid ${INK}`,
            borderRadius: 16,
            background: "#fff",
            boxShadow: `8px 8px 0 ${GOLD}`,
            padding: "16px 18px",
            opacity: f.alert.o,
            transform: `translateY(${f.alert.y}px)`,
          })}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ background: "#FDE5E5", color: "#b42318", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>
              CRITICAL
            </span>
            <span style={{ border: "1px solid #15151522", borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 600, color: "#6B6B60" }}>
              SEO
            </span>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 11, color: "#6B6B60" }}>shop.example/pricing</span>
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 18, fontWeight: 600 }}>Page set to noindex</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            <div style={{ background: "#E5F6EC", color: "#166534", borderRadius: 10, padding: "8px 10px", fontFamily: MONO, fontSize: 12 }}>
              <span style={{ display: "block", fontSize: 9.5, letterSpacing: "0.12em", opacity: 0.75 }}>BASELINE</span>
              index, follow
            </div>
            <div style={{ background: "#FDEAEB", color: "#b42318", borderRadius: 10, padding: "8px 10px", fontFamily: MONO, fontSize: 12 }}>
              <span style={{ display: "block", fontSize: 9.5, letterSpacing: "0.12em", opacity: 0.75 }}>CURRENT</span>
              noindex, nofollow
            </div>
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              marginTop: 14,
              background: INK,
              color: GOLD,
              borderRadius: 999,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              transform: `scale(${f.button.scale})`,
              boxShadow: `0 0 0 ${3 + 3 * f.button.glow}px rgb(255 212 0 / ${0.25 + 0.2 * f.button.glow})`,
            }}
          >
            <Spark size={14} /> Explain this change
          </div>
        </div>

        {/* MyKavo AI's answer */}
        <div
          style={abs({
            left: 24,
            top: 252,
            width: 540,
            boxSizing: "border-box",
            border: `2px solid ${INK}`,
            borderRadius: 16,
            background: "#fff",
            padding: "16px 18px 18px",
            opacity: f.ai.o,
            transform: `translateY(${f.ai.y}px)`,
          })}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 8, background: GOLD, color: INK }}>
              <Spark size={15} />
            </span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>MyKavo AI</span>
            <span
              style={{
                marginLeft: "auto",
                background: "#FDE5E5",
                color: "#b42318",
                borderRadius: 999,
                padding: "3px 11px",
                fontSize: 12,
                fontWeight: 700,
                opacity: Math.min(1, f.urgency),
                transform: `scale(${f.urgency})`,
              }}
            >
              Act now
            </span>
          </div>

          {f.thinking ? (
            <div style={{ display: "flex", gap: 6, marginTop: 18, alignItems: "center", color: "#6B6B60", fontSize: 13 }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{ width: 7, height: 7, borderRadius: 999, background: INK, opacity: 0.25 + 0.6 * Math.abs(Math.sin(t * 5 + i)) }}
                />
              ))}
              <span style={{ marginLeft: 4 }}>Reading the change</span>
            </div>
          ) : (
            <>
              <p style={{ margin: "12px 0 0", minHeight: 24, fontSize: 17, fontWeight: 600, lineHeight: 1.35 }}>
                {f.headline}
                {f.caret && <span style={{ display: "inline-block", width: 2, height: 18, marginLeft: 2, verticalAlign: -3, background: INK }} />}
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.55, color: "#4a4a42", opacity: f.why }}>
                <b style={{ color: INK }}>Why it matters. </b>
                {AI_WHY}
              </p>
              <ol style={{ margin: "12px 0 0", padding: 0, listStyle: "none" }}>
                {AI_STEPS.map((step, i) => (
                  <li
                    key={step}
                    style={{
                      display: "flex",
                      gap: 9,
                      alignItems: "flex-start",
                      marginTop: i ? 7 : 0,
                      fontSize: 13,
                      lineHeight: 1.45,
                      opacity: f.steps[i],
                      transform: `translateX(${lerp(-10, 0, f.steps[i] ?? 0)}px)`,
                    }}
                  >
                    <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 999, background: GOLD, border: `1.5px solid ${INK}`, fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>

        {/* Cursor */}
        <svg
          width="22"
          height="24"
          viewBox="0 0 22 24"
          style={abs({ left: f.cursor.x, top: f.cursor.y, opacity: f.cursor.o, filter: "drop-shadow(0 2px 3px rgb(0 0 0 / 0.25))" })}
        >
          <path d="M2 2l16 9.5-7 1.6-3.4 6.6z" fill="#fff" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

/** The four-point spark used for AI across the site. */
function Spark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 1.5c.6 4.9 2.6 8 9.5 10.5-6.9 2.5-8.9 5.6-9.5 10.5-.6-4.9-2.6-8-9.5-10.5C9.4 9.5 11.4 6.4 12 1.5z" />
    </svg>
  );
}
