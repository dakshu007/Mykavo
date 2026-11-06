import Link from "next/link";
import type { ReactNode } from "react";
import { Mail, MessagesSquare } from "lucide-react";
import { BRAND_MARKS, type BrandSlug } from "@/components/brand/brand-marks";
import { SlackIcon } from "@/components/brand/integration-icons";
import { eyebrowOnDark } from "./style";

/**
 * "Works with" - the tools MyKavo connects to and the platforms it monitors,
 * as two clean, static logo rows on an ink band (the same look as the
 * "Supported by" band right below it).
 *
 * Honesty rules, because a logo strip is the easiest place on a SaaS page to
 * imply customers you do not have:
 *  - the rows say what they are ("works with your stack", "monitors sites
 *    built on"), so "monitors sites built on Wix" is never read as "Wix uses
 *    MyKavo"; nothing here says "trusted by";
 *  - every logo that has a page links to the page or doc that proves it;
 *  - only things that work today are listed (the Shopify app is not live yet,
 *    so Shopify appears only as a platform MyKavo monitors).
 *
 * Marks are each brand's official mark (simple-icons paths, the official
 * Slack mark) shown in white, the standard single-colour treatment for a
 * logo wall on a dark background.
 */

type Item = {
  name: string;
  href?: string;
  icon: ReactNode;
  /** The icon is the full wordmark: hide the visible name. */
  wordmark?: boolean;
};

const ICON = "size-[22px] shrink-0";

function Mark({ slug }: { slug: BrandSlug }) {
  return (
    <svg viewBox="0 0 24 24" className={ICON} aria-hidden focusable="false">
      <path d={BRAND_MARKS[slug].path} fill="#FFFFFF" />
    </svg>
  );
}

/**
 * A mark that already spells the brand name (Wix, WooCommerce): shown as the
 * wordmark alone, cropped to its own bounds, with the name kept for screen
 * readers only.
 */
function WordMark({ slug, box, className }: { slug: BrandSlug; box: string; className: string }) {
  return (
    <svg viewBox={box} className={`${className} shrink-0`} aria-hidden focusable="false">
      <path d={BRAND_MARKS[slug].path} fill="#FFFFFF" />
    </svg>
  );
}

/** The webhook mark (three linked nodes), single-colour white. */
function WebhookMark() {
  return (
    <svg viewBox="0 0 24 24" className={ICON} aria-hidden focusable="false">
      <g fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round">
        <path d="M12.00 4.90Q10.93 10.85 7.55 12.60" />
        <path d="M18.84 16.75Q14.22 12.85 14.39 9.05" />
        <path d="M5.16 16.75Q10.85 14.70 14.05 16.75" />
      </g>
      <circle cx="12.00" cy="4.90" r="3.1" fill="#FFFFFF" />
      <circle cx="18.84" cy="16.75" r="3.1" fill="#FFFFFF" />
      <circle cx="5.16" cy="16.75" r="3.1" fill="#FFFFFF" />
    </svg>
  );
}

const CONNECTS: Item[] = [
  { name: "WordPress", href: "/wordpress-plugin", icon: <Mark slug="wordpress" /> },
  { name: "Slack", href: "/#alert-channels", icon: <SlackIcon className={`${ICON} [&_path]:fill-white`} /> },
  { name: "Google Search Console", href: "/#search-console", icon: <Mark slug="googlesearchconsole" /> },
  { name: "Vercel", href: "/docs/platform/deploy-checks", icon: <Mark slug="vercel" /> },
  { name: "Discord", href: "/#alert-channels", icon: <Mark slug="discord" /> },
  { name: "Supabase", href: "/docs/platform/supabase", icon: <Mark slug="supabase" /> },
  { name: "Netlify", href: "/docs/platform/deploy-checks", icon: <Mark slug="netlify" /> },
  { name: "GitHub Actions", href: "/docs/platform/deploy-checks", icon: <Mark slug="githubactions" /> },
  { name: "Microsoft Teams", href: "/#alert-channels", icon: <MessagesSquare className={`${ICON} text-white`} aria-hidden /> },
  { name: "Android", href: "/android-app", icon: <Mark slug="android" /> },
  { name: "Webhooks", href: "/#alert-channels", icon: <WebhookMark /> },
  { name: "Email", href: "/#alert-channels", icon: <Mail className={`${ICON} text-white`} aria-hidden /> },
];

const MONITORS: Item[] = [
  { name: "WordPress", href: "/website-monitoring-for-wordpress", icon: <Mark slug="wordpress" /> },
  { name: "Shopify", href: "/website-monitoring-for-shopify", icon: <Mark slug="shopify" /> },
  { name: "Webflow", href: "/website-monitoring-for-webflow", icon: <Mark slug="webflow" /> },
  {
    name: "WooCommerce",
    href: "/wordpress-plugin",
    wordmark: true,
    icon: <WordMark slug="woocommerce" box="0 9.58 24 4.84" className="h-[21px] w-[104px]" />,
  },
  { name: "Wix", wordmark: true, icon: <WordMark slug="wix" box="0 7.353 24 9.293" className="h-[19px] w-[49px]" /> },
  { name: "Squarespace", icon: <Mark slug="squarespace" /> },
  { name: "Framer", icon: <Mark slug="framer" /> },
];

const logo =
  "flex h-10 items-center gap-2.5 whitespace-nowrap text-[17px] font-semibold tracking-[-0.01em] text-white opacity-80 transition-opacity duration-200";

function Logo({ item }: { item: Item }) {
  const body = (
    <>
      {item.icon}
      <span className={item.wordmark ? "sr-only" : undefined}>{item.name}</span>
    </>
  );
  if (!item.href) return <span className={logo}>{body}</span>;
  return (
    <Link
      href={item.href}
      className={`${logo} hover:opacity-100 focus-visible:rounded-md focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFD400]`}
    >
      {body}
    </Link>
  );
}

function Row({ items, label, wide = false }: { items: Item[]; label: string; wide?: boolean }) {
  return (
    <ul
      className={`mx-auto flex ${wide ? "max-w-[1200px]" : "max-w-5xl"} flex-wrap items-center justify-center gap-x-11 gap-y-6 px-5 sm:gap-x-14`}
      aria-label={label}
    >
      {items.map((item) => (
        <li key={item.name}>
          <Logo item={item} />
        </li>
      ))}
    </ul>
  );
}

export function IntegrationsMarquee() {
  return (
    <section aria-labelledby="works-with-title" className="bg-[#151515] pb-14 pt-16 sm:pb-16 sm:pt-20">
      <p id="works-with-title" className={`${eyebrowOnDark} px-5 text-center`}>
        {"// works with your stack //"}
      </p>
      <div className="mt-10">
        <Row items={CONNECTS} label="Integrations: alert channels, plugins, deploy triggers and data" />
      </div>
      <p className={`${eyebrowOnDark} mt-14 px-5 text-center`}>{"// monitors sites built on anything //"}</p>
      <div className="mt-10">
        <Row items={MONITORS} wide label="Platforms MyKavo monitors websites built on" />
      </div>
    </section>
  );
}
