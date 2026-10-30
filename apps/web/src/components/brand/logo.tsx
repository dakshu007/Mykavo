import type { SVGProps } from "react";
import { cn } from "@/lib/utils";
import { BRAND_GOLD, MARK_IN_TILE_PATH, MARK_PATH, TILE_PATH, TILE_VIEWBOX } from "./logo-paths";

/**
 * MyKavo logomark - the spark leaving the page: a gold page split by a
 * chevron on the left, and a five-ray spark bursting out to the right. It
 * reads as the instant a change is caught on a page.
 *
 * Traced from the original logo (logo-paths.ts). Single colour from
 * currentColor - defaults to the logo gold; set the colour via `className`
 * (e.g. "text-[#151515]" on gold surfaces). The gaps between page and spark
 * are transparent so the mark sits on any background. The viewBox keeps a
 * little air around the mark, so it lines up with text at the same size.
 */
export function LogoMark({
  size = 28,
  className,
  ...props
}: { size?: number } & Omit<SVGProps<SVGSVGElement>, "width" | "height">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-150 -150 1900 1900"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("shrink-0 text-[#FFCF00]", className)}
      {...props}
    >
      <path d={MARK_PATH} fill="currentColor" />
    </svg>
  );
}

/**
 * The full app icon: the gold mark on its rounded tile. "dark" is the
 * original black tile; "light" is a white tile for dark backgrounds.
 */
export function LogoTile({
  size = 40,
  tone = "dark",
  className,
  ...props
}: { size?: number; tone?: "dark" | "light" } & Omit<SVGProps<SVGSVGElement>, "width" | "height">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={TILE_VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("shrink-0", className)}
      {...props}
    >
      <path d={TILE_PATH} fill={tone === "dark" ? "#000000" : "#FFFFFF"} />
      <path d={MARK_IN_TILE_PATH} fill={BRAND_GOLD} />
    </svg>
  );
}

export type LogoVariant = "default" | "inverse";

/**
 * Full brand lockup: spark logomark + "MyKavo" wordmark.
 *
 * The wordmark is real HTML text (site font stack), never SVG text.
 * Not a link by itself - wrap it in `<Link>` where navigation is wanted.
 */
export function Logo({
  markSize = 26,
  variant = "default",
  className,
  wordmarkClassName,
}: {
  markSize?: number;
  variant?: LogoVariant;
  className?: string;
  wordmarkClassName?: string;
}) {
  const inverse = variant === "inverse";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={markSize} />
      <span
        className={cn(
          "text-[17px] font-semibold tracking-tight",
          inverse ? "text-white" : "text-ink",
          wordmarkClassName,
        )}
      >
        MyKavo
      </span>
    </span>
  );
}
