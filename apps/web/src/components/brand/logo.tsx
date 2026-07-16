import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

/**
 * MyKavo logomark — the gold spark: a burst of tapered rays radiating from a
 * left-of-center core. It reads as the instant a change is caught.
 *
 * Single-color mark built from currentColor — defaults to brand gold; set the
 * color via `className` (e.g. "text-[#151515]" on gold surfaces).
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
      className={cn("shrink-0 text-[#FFD400]", className)}
      {...props}
    >
      {/* Core */}
      <circle cx="10" cy="16" r="3.6" fill="currentColor" />
      {/* Left comet wedge */}
      <path
        d="M10 12.6 L2.6 15.1 a1 1 0 0 0 0 1.8 L10 19.4 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Rays — thick at the core, needle tips outward */}
      <path d="M11 14.9 L29.2 15.5 a0.9 0.9 0 0 1 0 1.8 L11 17.1 Z" fill="currentColor" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M11.2 13.6 L24.6 5.2 a0.9 0.9 0 0 1 1.2 1.3 L12.8 15 Z" fill="currentColor" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M9.6 12.2 L13.6 2.9 a0.85 0.85 0 0 1 1.6 0.55 L12 13.2 Z" fill="currentColor" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M11.2 18.4 L24.6 26.8 a0.9 0.9 0 0 0 1.2 -1.3 L12.8 17 Z" fill="currentColor" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M9.6 19.8 L13.6 29.1 a0.85 0.85 0 0 0 1.6 -0.55 L12 18.8 Z" fill="currentColor" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
    </svg>
  );
}

export type LogoVariant = "default" | "inverse";

/**
 * Full brand lockup: spark logomark + "MyKavo" wordmark.
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
