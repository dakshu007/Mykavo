"use client";

import { useEffect, useRef } from "react";

/**
 * Soft, realistic snowfall over the home hero.
 *
 * Three depth layers: far flakes are tiny, slow and faint; near flakes are
 * larger, faster and blurred, as if out of focus in front of the lens. Each
 * flake sways on its own sine and the whole field leans with a slow breeze.
 * Drawn on one canvas with pre-rendered soft sprites (no per-frame blur),
 * capped at a modest flake count, paused while the hero is off screen or the
 * tab is hidden, and not started at all for reduced motion.
 */

type Flake = { x: number; y: number; r: number; vy: number; sway: number; phase: number; alpha: number; layer: 0 | 1 | 2 };

function sprite(radius: number, blur: number): HTMLCanvasElement {
  const size = Math.ceil((radius + blur) * 2 + 2);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, radius + blur);
  // A white core with a faint cool rim: against a bright hazy sky, real
  // snow reads as grey-white, and pure white flakes would vanish.
  const edge = radius / (radius + blur);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(edge * 0.7, "rgba(255,255,255,0.95)");
  grad.addColorStop(Math.min(0.98, edge + (1 - edge) * 0.35), "rgba(150,170,200,0.28)");
  grad.addColorStop(1, "rgba(150,170,200,0)");
  g.fillStyle = grad;
  g.beginPath();
  g.arc(size / 2, size / 2, radius + blur, 0, Math.PI * 2);
  g.fill();
  return c;
}

export function Snowfall({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Sprites per layer: far (crisp, tiny), mid, near (big and out of focus).
    const sprites = [sprite(1.4 * dpr, 1 * dpr), sprite(2.4 * dpr, 1.8 * dpr), sprite(4 * dpr, 5 * dpr)];
    let w = 0;
    let h = 0;
    let flakes: Flake[] = [];

    const make = (anywhere: boolean): Flake => {
      const roll = Math.random();
      const layer: 0 | 1 | 2 = roll < 0.55 ? 0 : roll < 0.88 ? 1 : 2;
      const speed = [0.35, 0.7, 1.35][layer];
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : -20 * dpr,
        r: [1, 1, 1][layer],
        vy: (speed + Math.random() * speed * 0.6) * dpr,
        sway: (0.3 + Math.random() * [0.5, 0.8, 1.2][layer]) * dpr,
        phase: Math.random() * Math.PI * 2,
        alpha: [0.7, 0.85, 0.75][layer] * (0.75 + Math.random() * 0.25),
        layer,
      };
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width * dpr));
      h = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = w;
      canvas.height = h;
      const target = Math.round(Math.min(150, Math.max(45, (rect.width * rect.height) / 9000)));
      flakes = Array.from({ length: target }, () => make(true));
    };
    resize();

    let raf = 0;
    let visible = true;
    let last = performance.now();
    let t = 0;

    const frame = (now: number) => {
      const dt = Math.min(3, (now - last) / 16.67);
      last = now;
      t += 0.004 * dt;
      const breeze = Math.sin(t) * 0.35 * dpr;
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.phase += 0.012 * dt;
        f.y += f.vy * dt;
        f.x += (Math.sin(f.phase) * f.sway * 0.35 + breeze * (f.layer + 1) * 0.5) * dt;
        if (f.y > h + 20 * dpr) Object.assign(f, make(false));
        if (f.x < -20 * dpr) f.x = w + 10 * dpr;
        else if (f.x > w + 20 * dpr) f.x = -10 * dpr;
        const s = sprites[f.layer];
        ctx.globalAlpha = f.alpha;
        ctx.drawImage(s, f.x - s.width / 2, f.y - s.height / 2);
      }
      ctx.globalAlpha = 1;
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible) start();
      else cancelAnimationFrame(raf);
    });
    io.observe(canvas);
    const onVis = () => {
      if (!document.hidden && visible) start();
    };
    document.addEventListener("visibilitychange", onVis);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    start();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
