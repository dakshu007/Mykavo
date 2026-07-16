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
    title: "Monitoring",
    links: [
      { href: "/#categories", label: "Visual monitoring" },
      { href: "/#categories", label: "SEO change monitoring" },
      { href: "/#categories", label: "Broken link monitoring" },
      { href: "/#categories", label: "Script monitoring" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-[#0d0c0e]/10">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <div className="flex flex-col items-center gap-4 pb-12 text-center">
          <Link href="/" aria-label="MyKavo home" className="inline-flex items-center gap-2.5">
            <LogoMark size={30} className="text-[#3556f4]" />
            <span className="text-xl font-semibold tracking-tight text-[#0d0c0e]">MyKavo</span>
          </Link>
          <p className="max-w-sm text-sm leading-6 text-[#0d0c0e]/60">{site.tagline}</p>
        </div>
        <div className="grid gap-10 text-center sm:grid-cols-3 sm:text-left">
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="mb-4 text-[12px] font-medium uppercase tracking-[0.22em] text-[#0d0c0e]/50">
                {col.title}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-[#0d0c0e]/70 transition-colors hover:text-[#0d0c0e]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-[#0d0c0e]/10 pt-6 text-[13px] text-[#0d0c0e]/50 sm:flex-row">
          <p>© {new Date().getFullYear()} MyKavo. All rights reserved.</p>
          <p>Built for people who keep websites working.</p>
        </div>
      </div>
    </footer>
  );
}
