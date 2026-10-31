import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Plan emblems: a hexagonal medal in the plan's metal, with the MyKavo
 * spark inside. The spark grows with the plan - Starter (bronze) has one
 * ray, Pro (silver) three, Agency (gold) all five - so the tiers read as one
 * family that gets brighter. Free is a plain steel outline with the page
 * alone. Pure SVG, so it is sharp at any size and needs no image request.
 */

export type BadgePlan = "free" | "starter" | "pro" | "agency";

const METALS: Record<BadgePlan, { rim: [string, string, string]; glow: string; name: string }> = {
  free: { rim: ["#D9DCE1", "#9AA1AB", "#5F6670"], glow: "rgba(154,161,171,0.25)", name: "Steel" },
  starter: { rim: ["#FAD3AE", "#C9844A", "#7C4318"], glow: "rgba(201,132,74,0.45)", name: "Bronze" },
  pro: { rim: ["#FFFFFF", "#C6CCD6", "#7A8391"], glow: "rgba(198,204,214,0.5)", name: "Silver" },
  agency: { rim: ["#FFF3B0", "#FFCF00", "#B07F00"], glow: "rgba(255,207,0,0.55)", name: "Gold" },
};

/** Ray angles (degrees from horizontal) per plan. */
const RAYS: Record<BadgePlan, number[]> = {
  free: [],
  starter: [0],
  pro: [-34, 0, 34],
  agency: [-62, -31, 0, 31, 62],
};

/** A tapered ray from the spark's apex, as a closed path. */
function rayPath(angle: number, length: number): string {
  const ax = 27.5;
  const ay = 32;
  const rad = (angle * Math.PI) / 180;
  const half = 3;
  const nx = -Math.sin(rad) * half;
  const ny = Math.cos(rad) * half;
  const tx = ax + Math.cos(rad) * length;
  const ty = ay + Math.sin(rad) * length;
  const f = (n: number) => n.toFixed(2);
  return `M${f(ax + nx)} ${f(ay + ny)}L${f(tx)} ${f(ty)}L${f(ax - nx)} ${f(ay - ny)}Z`;
}

/** The page panel with the chevron notch, as in the MyKavo mark. */
const PAGE = "M18.5 19.5h8.2l-7.4 12.5 7.4 12.5h-8.2a1.6 1.6 0 0 1-1.6-1.6v-21.8a1.6 1.6 0 0 1 1.6-1.6Z";

/** Rounded hexagon, pointy top, centred in a 64 x 64 box. */
const HEX = "M32 4.5c1.2 0 2.3.3 3.3.9l19.4 11.2a6.6 6.6 0 0 1 3.3 5.7v22.4a6.6 6.6 0 0 1-3.3 5.7L35.3 61.6a6.6 6.6 0 0 1-6.6 0L9.3 50.4A6.6 6.6 0 0 1 6 44.7V22.3a6.6 6.6 0 0 1 3.3-5.7L28.7 5.4c1-.6 2.1-.9 3.3-.9Z";

export function PlanBadge({
  plan,
  size = 40,
  className,
  title,
}: {
  plan: BadgePlan;
  size?: number;
  className?: string;
  /** Accessible name; decorative (aria-hidden) when omitted. */
  title?: string;
}) {
  const id = `${plan}${useId().replace(/:/g, "")}`;
  const m = METALS[plan];
  const rays = RAYS[plan];
  const lengths = rays.map((a) => 21 - Math.abs(a) / 9);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      style={{ filter: `drop-shadow(0 2px 6px ${m.glow})` }}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={`rim-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={m.rim[0]} />
          <stop offset="0.5" stopColor={m.rim[1]} />
          <stop offset="1" stopColor={m.rim[2]} />
        </linearGradient>
        <linearGradient id={`metal-${id}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={m.rim[0]} />
          <stop offset="0.55" stopColor={m.rim[1]} />
          <stop offset="1" stopColor={m.rim[2]} />
        </linearGradient>
        <radialGradient id={`core-${id}`} cx="0.35" cy="0.25" r="0.85">
          <stop offset="0" stopColor="#2A2A2A" />
          <stop offset="1" stopColor="#0B0B0B" />
        </radialGradient>
      </defs>
      {/* Medal: metal rim, dark core, a thin inner bevel. */}
      <path d={HEX} fill={`url(#rim-${id})`} />
      <path d={HEX} transform="translate(32 32) scale(0.84) translate(-32 -32)" fill={`url(#core-${id})`} />
      <path
        d={HEX}
        transform="translate(32 32) scale(0.84) translate(-32 -32)"
        fill="none"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="0.8"
      />
      {/* The spark: page plus the plan's rays. */}
      <path d={PAGE} fill={`url(#metal-${id})`} />
      {rays.map((a, i) => (
        <path key={a} d={rayPath(a, lengths[i])} fill={`url(#metal-${id})`} strokeLinejoin="round" />
      ))}
      {/* A soft highlight across the top of the rim. */}
      <path d="M12 18.5 32 7l20 11.5" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

/** "Bronze", "Silver", "Gold" or "Steel", for labels next to the emblem. */
export function planMetal(plan: BadgePlan): string {
  return METALS[plan].name;
}
