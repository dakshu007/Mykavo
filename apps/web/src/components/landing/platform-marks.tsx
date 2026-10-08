import { useId, type ReactNode } from "react";
import { BRAND_MARKS, type BrandSlug } from "@/components/brand/brand-marks";

/**
 * Third parties' real marks, in their owners' official colours, for the
 * /platforms page. Shown nominatively - to say what MyKavo works with - and
 * never recoloured, which is why they always sit on a white tile (the same
 * rule as integration-icons.tsx).
 *
 * Sources:
 *  - WordPress, Shopify, Android, Vercel, Netlify, GitHub Actions: the
 *    vendored Simple Icons set (brand-marks.ts, CC0).
 *  - Chrome: the official multicolour logo (devicon 2.17, chrome-original.svg).
 *  - Claude and Cursor: the official marks (@lobehub/icons-static-svg 1.95,
 *    claude-color.svg and cursor.svg).
 * The marks are trademarks of their owners; the page says so.
 */

/** A vendored single-colour mark, drawn in its brand colour. */
export function BrandGlyph({ slug, className = "size-5" }: { slug: BrandSlug; className?: string }) {
  const mark = BRAND_MARKS[slug];
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label={mark.title} focusable="false">
      <path fill={mark.hex} d={mark.path} />
    </svg>
  );
}

/** The official multicolour Chrome logo. Gradient ids are made unique so it can appear many times on a page. */
export function ChromeLogo({ className = "size-5" }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (k: string) => `chrome-${uid}-${k}`;
  return (
    <svg viewBox="0 0 128 128" className={className} role="img" aria-label="Google Chrome" focusable="false">
      <circle fill="#fff" cx="64.149" cy="64.236" r="60.999" />
      <path
        fillOpacity=".1"
        d="M102.966 75.327c0-21.439-17.379-38.819-38.817-38.819s-38.818 17.38-38.818 38.819h11.09c0-15.314 12.415-27.727 27.727-27.727 15.313 0 27.727 12.413 27.727 27.727"
      />
      <circle fillOpacity=".1" cx="66.922" cy="71.999" r="21.072" />
      <linearGradient id={id("a")} gradientUnits="userSpaceOnUse" x1="395.191" y1="484.168" x2="395.191" y2="484.723" gradientTransform="matrix(82 0 0 82 -32341.5 -39660.313)">
        <stop offset="0" stopColor="#81B4E0" />
        <stop offset="1" stopColor="#0C5A94" />
      </linearGradient>
      <circle fill={`url(#${id("a")})`} cx="64.149" cy="64.235" r="22.736" />
      <linearGradient id={id("b")} gradientUnits="userSpaceOnUse" x1="-608.91" y1="-597.648" x2="-608.91" y2="-547.185" gradientTransform="translate(675 599.775)">
        <stop offset="0" stopColor="#F06B59" />
        <stop offset="1" stopColor="#DF2227" />
      </linearGradient>
      <path
        fill={`url(#${id("b")})`}
        d="M119.602 36.508C104.336 5.792 67.06-6.732 36.343 8.534A62.105 62.105 0 0012.578 29.3l24.955 43.253c-4.597-14.606 3.521-30.174 18.127-34.77a27.676 27.676 0 017.935-1.274"
      />
      <linearGradient id={id("c")} gradientUnits="userSpaceOnUse" x1="-657.835" y1="-491.393" x2="-632.327" y2="-533.537" gradientTransform="translate(675 599.775)">
        <stop offset="0" stopColor="#388B41" />
        <stop offset="1" stopColor="#4CB749" />
      </linearGradient>
      <path
        fill={`url(#${id("c")})`}
        d="M12.578 29.3c-19.1 28.492-11.486 67.071 17.005 86.171a62.133 62.133 0 0029.575 10.319l26.063-44.363c-9.745 11.811-27.22 13.486-39.032 3.74a27.717 27.717 0 01-8.657-12.613"
      />
      <linearGradient id={id("d")} gradientUnits="userSpaceOnUse" x1="-572.385" y1="-486.91" x2="-599.557" y2="-552.345" gradientTransform="translate(675 599.775)">
        <stop offset="0" stopColor="#E4B022" />
        <stop offset=".3" stopColor="#FCD209" />
      </linearGradient>
      <path
        fill={`url(#${id("d")})`}
        d="M59.158 125.791c34.204 2.585 64.027-23.047 66.613-57.25a62.097 62.097 0 00-6.17-32.031H63.595c15.312.07 27.67 12.541 27.598 27.854a27.725 27.725 0 01-5.972 17.064"
      />
      <linearGradient id={id("e")} gradientUnits="userSpaceOnUse" x1="-649.391" y1="-528.885" x2="-649.391" y2="-573.247" gradientTransform="translate(675 599.775)">
        <stop offset="0" stopOpacity=".15" />
        <stop offset=".3" stopOpacity=".06" />
        <stop offset="1" stopOpacity=".03" />
      </linearGradient>
      <path fill={`url(#${id("e")})`} d="M12.578 29.3l24.955 43.253a27.725 27.725 0 011.107-18.854L13.686 27.636" />
      <linearGradient id={id("f")} gradientUnits="userSpaceOnUse" x1="-588.158" y1="-514.559" x2="-618.657" y2="-483.505" gradientTransform="translate(675 599.775)">
        <stop offset="0" stopOpacity=".15" />
        <stop offset=".3" stopOpacity=".06" />
        <stop offset="1" stopOpacity=".03" />
      </linearGradient>
      <path fill={`url(#${id("f")})`} d="M59.158 125.791l26.063-44.363a27.731 27.731 0 01-16.082 9.426l-11.091 34.937" />
      <linearGradient id={id("g")} gradientUnits="userSpaceOnUse" x1="-588.6" y1="-505.621" x2="-584.163" y2="-549.431" gradientTransform="translate(675 599.775)">
        <stop offset="0" stopOpacity=".15" />
        <stop offset=".3" stopOpacity=".06" />
        <stop offset="1" stopOpacity=".03" />
      </linearGradient>
      <path fill={`url(#${id("g")})`} d="M119.602 36.508H63.595a27.727 27.727 0 0121.626 10.537l35.491-8.873" />
    </svg>
  );
}

/** The Claude mark, in its official coral. */
export function ClaudeLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Claude" focusable="false">
      <path
        fill="#D97757"
        fillRule="nonzero"
        d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z"
      />
    </svg>
  );
}

/** The Cursor mark, in its official black. */
export function CursorLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Cursor" focusable="false">
      <path
        fill="#000"
        fillRule="evenodd"
        d="M22.106 5.68L12.5.135a.998.998 0 00-.998 0L1.893 5.68a.84.84 0 00-.419.726v11.186c0 .3.16.577.42.727l9.607 5.547a.999.999 0 00.998 0l9.608-5.547a.84.84 0 00.42-.727V6.407a.84.84 0 00-.42-.726zm-.603 1.176L12.228 22.92c-.063.108-.228.064-.228-.061V12.34a.59.59 0 00-.295-.51l-9.11-5.26c-.107-.062-.063-.228.062-.228h18.55c.264 0 .428.286.296.514z"
      />
    </svg>
  );
}

/** Logos a platform's own tile can carry. Anything not listed keeps MyKavo's gold tile. */
const PLATFORM_LOGO: Record<string, (className: string) => ReactNode> = {
  wordpress: (c) => <BrandGlyph slug="wordpress" className={c} />,
  chrome: (c) => <ChromeLogo className={c} />,
  android: (c) => <BrandGlyph slug="android" className={c} />,
  ai: (c) => <ClaudeLogo className={c} />,
  shopify: (c) => <BrandGlyph slug="shopify" className={c} />,
};

export function isBrandedPlatform(id: string): boolean {
  return id in PLATFORM_LOGO;
}

/** The platform's real logo, or null if it has none (it then uses a MyKavo icon). */
export function PlatformLogo({ id, className = "size-5" }: { id: string; className?: string }) {
  const render = PLATFORM_LOGO[id];
  return render ? <>{render(className)}</> : null;
}

/** A third-party tool a platform works with, shown as a white chip with its real logo. */
export const WORKS_WITH_LOGO = {
  claude: (c: string) => <ClaudeLogo className={c} />,
  cursor: (c: string) => <CursorLogo className={c} />,
  githubactions: (c: string) => <BrandGlyph slug="githubactions" className={c} />,
  vercel: (c: string) => <BrandGlyph slug="vercel" className={c} />,
  netlify: (c: string) => <BrandGlyph slug="netlify" className={c} />,
} as const;

export type WorksWithKey = keyof typeof WORKS_WITH_LOGO;
