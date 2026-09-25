import Image from "next/image";
import { LogoMark } from "@/components/brand/logo";

/**
 * "MyKavo × WordPress" / "MyKavo × Shopify": the MyKavo mark beside the
 * platform's own logo, used unmodified (colours, proportions) as both
 * brands' guidelines ask, to show what the plugin or app plugs into.
 */

const PARTNERS = {
  wordpress: {
    src: "/wordpress/wordpress-logo-stacked.png",
    alt: "WordPress",
    width: 853,
    height: 360,
    // The stacked logo carries its own wordmark, so it gets more height.
    className: "h-12 w-auto sm:h-14",
  },
  shopify: {
    src: "/shopify/shopify-logo.png",
    alt: "Shopify",
    width: 834,
    height: 240,
    className: "h-8 w-auto sm:h-9",
  },
} as const;

export type Partner = keyof typeof PARTNERS;

export function PartnerLogo({ partner, className }: { partner: Partner; className?: string }) {
  const p = PARTNERS[partner];
  return (
    <Image
      src={p.src}
      alt={p.alt}
      width={p.width}
      height={p.height}
      sizes="200px"
      className={className ?? p.className}
    />
  );
}

export function PartnerLockup({ partner, className = "" }: { partner: Partner; className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-4 rounded-2xl border border-black/10 bg-white px-5 py-3 shadow-[0_1px_0_rgba(21,21,21,0.06),0_14px_30px_-18px_rgba(21,21,21,0.35)] sm:gap-5 sm:px-6 ${className}`}
    >
      <span className="flex items-center gap-2">
        <LogoMark size={28} />
        <span className="text-[17px] font-semibold tracking-tight text-[#151515]">MyKavo</span>
      </span>
      <span aria-hidden className="text-[18px] font-light text-[#6B6B60]">
        ×
      </span>
      <PartnerLogo partner={partner} />
    </div>
  );
}
