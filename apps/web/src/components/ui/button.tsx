import { forwardRef, type ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "dark";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  // Gold with INK text. White on MyKavo gold measures 1.43:1 and is
  // unreadable; ink on gold is 12.76:1. The shadow is ink-tinted rather than
  // gold-tinted - a yellow glow reads as a warning state, not a button.
  primary:
    "bg-primary text-primary-contrast hover:bg-primary-hover shadow-[0_1px_2px_rgb(21_21_21/16%),0_2px_8px_rgb(21_21_21/10%)] hover:shadow-[0_2px_4px_rgb(21_21_21/18%),0_6px_16px_rgb(21_21_21/14%)]",
  secondary:
    "bg-card text-ink border border-line hover:border-ink-faint shadow-[0_1px_2px_rgb(21_21_21/6%)]",
  ghost: "text-ink-secondary hover:text-ink hover:bg-ink/5",
  dark: "bg-ink text-ink-inverse hover:bg-ink-hover shadow-[0_1px_2px_rgb(21_21_21/20%),0_2px_8px_rgb(21_21_21/12%)]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-[15px]",
};

/**
 * `active:` gives the press its weight: the button dips slightly and its
 * shadow collapses, so a click feels like pressing something rather than
 * changing a colour. Kept to 150ms and 1.5% - any more reads as a toy.
 *
 * `motion-reduce` drops the movement entirely (spec §53): for a viewer who
 * asked the OS for less motion, a button that jumps is not a nicety.
 */
const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap " +
  "transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out " +
  "active:scale-[0.985] active:shadow-none motion-reduce:transition-none motion-reduce:active:scale-100 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
    >
      {children}
    </Link>
  );
}
