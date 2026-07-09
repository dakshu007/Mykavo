import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { site } from "@/config/site";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#use-cases", label: "Use cases" },
      { href: "/preview", label: "Dashboard preview" },
      { href: "/pricing", label: "Pricing" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    title: "Free tools",
    links: [{ href: "/tools/website-change-detector", label: "Website Change Detector" }],
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

export function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-300 px-5 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" aria-label="Fluxen home" className="inline-flex">
              <Logo />
            </Link>
            <p className="mt-4 max-w-70 text-sm leading-6 text-ink-secondary">
              {site.tagline} Website change and regression monitoring for agencies, developers,
              and website teams.
            </p>
          </div>
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="label-micro mb-4">{col.title}</h3>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-ink-secondary transition-colors hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 flex flex-col justify-between gap-3 border-t border-line pt-6 text-[13px] text-ink-faint sm:flex-row">
          <p>© {new Date().getFullYear()} Fluxen. All rights reserved.</p>
          <p>Built for people who keep websites working.</p>
        </div>
      </div>
    </footer>
  );
}
