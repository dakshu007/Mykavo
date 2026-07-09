import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Fluxen logomark — two offset page frames (baseline and current scan)
 * whose intersection is rendered solid: the diff is where you look.
 *
 * Single-hue mark built from currentColor with opacity layering, so it
 * works royal-blue-on-white, white-on-blue, or ink — set the color via
 * `className` (defaults to `text-primary`).
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
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("shrink-0 text-primary", className)}
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" opacity="0.5" />
      <rect x="11" y="11" width="18" height="18" rx="5" fill="currentColor" opacity="0.5" />
      <path d="M16 11h5v5a5 5 0 0 1-5 5h-5v-5a5 5 0 0 1 5-5Z" fill="currentColor" />
    </svg>
  );
}

export type LogoVariant = "default" | "inverse";

/**
 * Full brand lockup: logomark + "Fluxen" wordmark.
 *
 * The wordmark is real HTML text (site font stack), never SVG text.
 * Not a link by itself — wrap it in `<Link>` where navigation is wanted.
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
      <LogoMark size={markSize} className={inverse ? "text-white" : undefined} />
      <span
        className={cn(
          "text-[17px] font-semibold tracking-tight",
          inverse ? "text-white" : "text-ink",
          wordmarkClassName,
        )}
      >
        Fluxen
      </span>
    </span>
  );
}
