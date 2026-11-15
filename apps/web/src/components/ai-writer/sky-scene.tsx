import Image from "next/image";

/**
 * A mostly clear blue sky (about 85% sky, 15% cloud) with a few real clouds
 * drifting across at different heights and speeds. The sky itself is a CSS
 * gradient, so it costs nothing to load; each cloud is a small cut-out
 * (public/ai-writer/cloud-*.webp) moved with a compositor-only transform.
 * Negative delays spread the clouds out from the first frame, and reduced
 * motion stops them where they are.
 */

type Cloud = { src: string; w: number; h: number; top: string; width: string; duration: number; delay: number; opacity: number; flip?: boolean };

const CLOUDS: Cloud[] = [
  { src: "/ai-writer/cloud-wisp.webp", w: 900, h: 400, top: "6%", width: "min(62vw,760px)", duration: 190, delay: -60, opacity: 0.55 },
  { src: "/ai-writer/cloud-c.webp", w: 350, h: 185, top: "18%", width: "min(30vw,330px)", duration: 120, delay: -20, opacity: 0.95 },
  { src: "/ai-writer/cloud-a.webp", w: 480, h: 180, top: "58%", width: "min(36vw,420px)", duration: 150, delay: -95, opacity: 0.9 },
  { src: "/ai-writer/cloud-b.webp", w: 250, h: 130, top: "34%", width: "min(20vw,220px)", duration: 105, delay: -70, opacity: 0.85, flip: true },
  { src: "/ai-writer/cloud-c.webp", w: 350, h: 185, top: "74%", width: "min(26vw,280px)", duration: 135, delay: -40, opacity: 0.8, flip: true },
];

/**
 * Deep azure at the top, lighter toward the horizon. Put this on the section
 * that holds a SkyScene, so the text over it has a real background colour.
 */
export const SKY_BG = "bg-[#1a63c4] bg-[linear-gradient(180deg,#0b47a3_0%,#1a63c4_38%,#3f8be0_72%,#8fc4f1_100%)]";

export function SkyScene({ eager = false, dense = false }: { eager?: boolean; dense?: boolean }) {
  const clouds = dense ? CLOUDS : CLOUDS.slice(0, 4);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* The azure gradient itself sits on the parent section (SKY_BG) so
          contrast checkers see the real background; this adds the sun glow. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_35%_at_82%_8%,rgba(255,244,214,0.35),transparent_70%)]" />
      {clouds.map((c, i) => (
        <div
          key={i}
          className="sky-drift absolute left-0"
          style={{ top: c.top, width: c.width, animationDuration: `${c.duration}s`, animationDelay: `${c.delay}s`, opacity: c.opacity }}
        >
          <Image
            src={c.src}
            alt=""
            width={c.w}
            height={c.h}
            loading={eager && i < 3 ? "eager" : "lazy"}
            sizes="(max-width: 768px) 40vw, 760px"
            className={`h-auto w-full select-none ${c.flip ? "-scale-x-100" : ""}`}
          />
        </div>
      ))}
    </div>
  );
}
