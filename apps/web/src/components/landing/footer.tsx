import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { site } from "@/config/site";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#categories", label: "What it watches" },
      { href: "/preview", label: "Dashboard preview" },
      { href: "/#android-app", label: "Download for Android" },
      { href: "/pricing", label: "Pricing" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    title: "Free tools",
    links: [
      { href: "/tools/website-change-detector", label: "Website Change Detector" },
      { href: "/tools/meta-tag-checker", label: "Meta Tag Checker" },
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
      <div className="mx-auto max-w-6xl px-5 pt-16 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" aria-label="MyKavo home" className="inline-flex items-center gap-2.5">
              <LogoMark size={28} />
              <span className="text-lg font-semibold tracking-tight text-[#151515]">MyKavo</span>
            </Link>
            <p className="mt-4 max-w-60 text-sm leading-6 text-[#6B6B60]">{site.tagline}</p>
          </div>
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B6B60]">
                {col.title}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-[#151515]/75 transition-colors hover:text-[#151515]"
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
