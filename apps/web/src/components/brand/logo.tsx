import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

/**
 * MyKavo logomark — the spark leaving the page: a gold document panel on the
 * left with a chevron notch cut into it, and a five-ray spark bursting out
 * to the right. It reads as the instant a change is caught on a page.
 *
 * Single-color mark built from currentColor — defaults to brand gold; set the
 * color via `className` (e.g. "text-[#151515]" on gold surfaces). The gaps
 * between page and spark are transparent so the mark sits on any background.
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
      {/* Page panel with the chevron notch cut from its right side */}
      <path
        d="M5.4 3.3 L13.9 3.3 Q15.6 3.3 14.6 4.45 L3.8 15.45 Q3.25 16 3.8 16.55 L14.6 27.55 Q15.6 28.7 13.9 28.7 L5.4 28.7 Q3.2 28.7 3.2 26.5 L3.2 5.5 Q3.2 3.3 5.4 3.3 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* Spark — chevron apex with five tapered rays fanning right */}
      <path
        d="M10.35 16 L19.45 3.4 L15.85 12 L23.7 8.2 L16.55 14.5 L29.1 16 L16.55 17.5 L23.7 23.8 L15.85 20 L19.45 28.6 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
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
