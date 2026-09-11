import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { site, socials } from "@/config/site";

/**
 * Brand glyphs are inlined because lucide-react ships none - it dropped every
 * social/brand icon for trademark reasons. Single-path, currentColor, so each
 * mark inherits the footer's ink and flips to ink-on-gold on hover exactly
 * like the rest of the v4 furniture.
 */
type SocialGlyph = (props: { className?: string }) => React.ReactElement;

const LinkedInGlyph: SocialGlyph = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden focusable="false">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
  </svg>
);

/** Glyph per social label. An unmapped label degrades to its initial. */
const SOCIAL_GLYPHS: Record<string, SocialGlyph> = {
  LinkedIn: LinkedInGlyph,
};

const columns = [
  {
    title: "Product",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#categories", label: "What it watches" },
      { href: "/preview", label: "Dashboard preview" },
      { href: "/#android-app", label: "Android app (soon)" },
      { href: "/pricing", label: "Pricing" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    title: "Free tools",
    links: [
      { href: "/tools/competitor-analysis-tool", label: "Competitor Analysis" },
      { href: "/tools/website-change-detector", label: "Website Change Detector" },
      { href: "/tools/meta-tag-checker", label: "Meta Tag Checker" },
      { href: "/tools/eeat-analyzer", label: "E-E-A-T Analyzer" },
      { href: "/tools/redirect-chain-checker", label: "Redirect Chain Checker" },
      { href: "/tools/bulk-url-status-checker", label: "Bulk URL Status Checker" },
      { href: "/tools/script-detector", label: "Script Detector" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { href: "/visual-regression-testing", label: "Visual regression testing" },
      { href: "/seo-monitoring", label: "SEO monitoring" },
      { href: "/website-content-monitoring", label: "Content monitoring" },
      { href: "/website-monitoring-for-wordpress", label: "For WordPress" },
      { href: "/website-monitoring-for-shopify", label: "For Shopify" },
      { href: "/website-monitoring-for-webflow", label: "For Webflow" },
      { href: "/compare", label: "Compare tools" },
    ],
  },
  {
    title: "Guides",
    links: [
      { href: "/guides/how-to-monitor-website-changes", label: "Monitor website changes" },
      { href: "/guides/website-monitoring-checklist", label: "Monitoring checklist" },
      { href: "/guides/website-maintenance-checklist", label: "Maintenance checklist" },
      { href: "/guides/website-deployment-checklist", label: "Deployment checklist" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/support", label: "Support" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/cookies", label: "Cookie Policy" },
    ],
  },
];

/**
 * Light footer with link columns, closing on a giant half-clipped gold
 * wordmark (ballpark/branch-style) - the brand as the final beat of the page.
 */
export function LandingFooter() {
  return (
    <footer className="overflow-hidden border-t border-black/10 bg-[#F3F1E6]">
      <div className="mx-auto max-w-7xl px-5 pt-16 lg:px-8">
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[0.95fr_0.95fr_1.25fr_1.05fr_1.1fr_0.9fr]">
          <div>
            <Link href="/" aria-label="MyKavo home" className="inline-flex items-center gap-2.5">
              <LogoMark size={28} />
              <span className="text-lg font-semibold tracking-tight text-[#151515]">MyKavo</span>
            </Link>
            <p className="mt-4 max-w-60 text-sm leading-6 text-[#6B6B60]">{site.tagline}</p>

            {/* Socials in the v4 language: ink border + offset shadow, gold on
                hover, shadow collapsing as the tile presses into the page. */}
            {socials.length > 0 && (
              <ul className="mt-6 flex items-center gap-2.5">
                {socials.map((social) => {
                  const Glyph = SOCIAL_GLYPHS[social.label];
                  return (
                    <li key={social.label}>
                      <a
                        href={social.href}
                        target="_blank"
                        rel="me noopener noreferrer"
                        aria-label={`MyKavo on ${social.label}`}
                        title={`MyKavo on ${social.label}`}
                        className="inline-flex size-10 items-center justify-center rounded-xl border border-[#151515] bg-[#FBFAF3] text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-y-0.5 hover:bg-[#FFD400] hover:shadow-[5px_5px_0_#151515] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#151515] active:translate-y-0 active:shadow-[1px_1px_0_#151515]"
                      >
                        {Glyph ? (
                          <Glyph className="size-4.5" />
                        ) : (
                          <span aria-hidden className="text-[13px] font-semibold">
                            {social.label.charAt(0)}
                          </span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B6B60]">
                {col.title}
              </h3>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="block text-sm leading-snug text-pretty text-[#151515]/75 transition-colors hover:text-[#151515]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-black/10 pt-6 text-[13px] text-[#6B6B60] sm:flex-row">
          <p>© {new Date().getFullYear()} MyKavo. All rights reserved.</p>
          <p>Built for people who keep websites working.</p>
        </div>

        {/* Giant clipped wordmark - the final beat */}
        <div aria-hidden className="pointer-events-none mt-10 h-[13vw] min-h-20 select-none overflow-hidden">
          <p
            className="text-center font-semibold leading-none tracking-[-0.04em] text-[#FFD400]"
            style={{
              fontSize: "clamp(96px, 19vw, 300px)",
              WebkitTextStroke: "2px #151515",
              textShadow: "6px 6px 0 rgba(21,21,21,0.12)",
            }}
          >
            MyKavo
          </p>
        </div>
      </div>
    </footer>
  );
}
