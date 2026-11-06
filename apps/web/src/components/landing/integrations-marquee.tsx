import Link from "next/link";
import type { ReactNode } from "react";
import { Mail, MessagesSquare } from "lucide-react";
import { BRAND_MARKS, type BrandSlug } from "@/components/brand/brand-marks";
import { SlackIcon, WebhookIcon } from "@/components/brand/integration-icons";
import { eyebrow } from "./style";

/**
 * "Works with" - two static, centred lists of the tools MyKavo connects to
 * and the platforms it monitors. Every chip is visible at once (no marquee),
 * so the whole stack reads at a glance.
 *
 * Honesty rules, because a logo strip is the easiest place on a SaaS page to
 * imply customers you do not have:
 *  - every logo is labelled by what it is to MyKavo (an alert channel, a
 *    plugin, a deploy trigger, a platform it monitors) and links to the page
 *    or doc that proves it;
 *  - the two rows say what they are, so "monitors sites built on Wix" is never
 *    read as "Wix uses MyKavo";
 *  - marks keep their owners' colours (brand rules forbid recolouring), on
 *    neutral chips so fifteen brand colours do not fight the gold.
 */

type Item = {
  name: string;
  /** Short mono tag: what this is to MyKavo. */
  tag?: string;
  href?: string;
  icon: ReactNode;
};

function Mark({ slug }: { slug: BrandSlug }) {
  const m = BRAND_MARKS[slug];
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden focusable="false">
      <path d={m.path} fill={m.hex} />
    </svg>
  );
}

const CONNECTS: Item[] = [
  { name: "WordPress", tag: "Plugin", href: "/wordpress-plugin", icon: <Mark slug="wordpress" /> },
  { name: "Slack", tag: "Alerts", href: "/#alert-channels", icon: <SlackIcon className="size-5 shrink-0" /> },
  { name: "Google Search Console", tag: "Data", href: "/#search-console", icon: <Mark slug="googlesearchconsole" /> },
  { name: "Vercel", tag: "Deploys", href: "/docs/platform/deploy-checks", icon: <Mark slug="vercel" /> },
  { name: "Discord", tag: "Alerts", href: "/#alert-channels", icon: <Mark slug="discord" /> },
  { name: "Supabase", tag: "Hooks", href: "/docs/platform/supabase", icon: <Mark slug="supabase" /> },
  { name: "Netlify", tag: "Deploys", href: "/docs/platform/deploy-checks", icon: <Mark slug="netlify" /> },
  {
    name: "Microsoft Teams",
    tag: "Alerts",
    href: "/#alert-channels",
    icon: <MessagesSquare className="size-5 shrink-0 text-[#151515]" aria-hidden />,
  },
  { name: "GitHub Actions", tag: "Deploys", href: "/docs/platform/deploy-checks", icon: <Mark slug="githubactions" /> },
  { name: "Android", tag: "App", href: "/android-app", icon: <Mark slug="android" /> },
  { name: "Shopify", tag: "Soon", href: "/shopify-app", icon: <Mark slug="shopify" /> },
  { name: "Webhooks", tag: "Alerts", href: "/#alert-channels", icon: <WebhookIcon className="size-5 shrink-0" /> },
  {
    name: "Email",
    tag: "Alerts",
    href: "/#alert-channels",
    icon: <Mail className="size-5 shrink-0 text-[#151515]" aria-hidden />,
  },
];

const MONITORS: Item[] = [
  { name: "WordPress", href: "/website-monitoring-for-wordpress", icon: <Mark slug="wordpress" /> },
  { name: "Shopify", href: "/website-monitoring-for-shopify", icon: <Mark slug="shopify" /> },
  { name: "Webflow", href: "/website-monitoring-for-webflow", icon: <Mark slug="webflow" /> },
  { name: "WooCommerce", href: "/wordpress-plugin", icon: <Mark slug="woocommerce" /> },
  { name: "Wix", icon: <Mark slug="wix" /> },
  { name: "Squarespace", icon: <Mark slug="squarespace" /> },
  { name: "Framer", icon: <Mark slug="framer" /> },
];

const chip =
  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-black/10 bg-white px-3 text-[13px] font-medium text-[#151515] transition-all duration-200 sm:h-12 sm:gap-2.5 sm:px-4 sm:text-[14px]";

function Chip({ item }: { item: Item }) {
  const body = (
    <>
      {item.icon}
      <span className="whitespace-nowrap">{item.name}</span>
      {item.tag && (
        <span className="rounded-full bg-[#F3F1E6] px-1.5 py-0.5 font-mono text-[8.5px] sm:px-2 sm:text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#6B6B60]">
          {item.tag}
        </span>
      )}
    </>
  );
  if (!item.href) return <span className={chip}>{body}</span>;
  return (
    <Link
      href={item.href}
      className={`${chip} hover:-translate-y-0.5 hover:border-[#151515] hover:shadow-[3px_3px_0_#151515] focus-visible:border-[#151515] focus-visible:shadow-[3px_3px_0_#151515] focus-visible:outline-none`}
    >
      {body}
    </Link>
  );
}

/** One static, centred list that wraps onto as many lines as it needs. */
function Row({ items, label }: { items: Item[]; label: string }) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-2 px-4 sm:gap-3 sm:px-5" aria-label={label}>
      {items.map((item) => (
        <li key={item.name}>
          <Chip item={item} />
        </li>
      ))}
    </ul>
  );
}

export function IntegrationsMarquee() {
  return (
    <section aria-labelledby="works-with-title" className="border-y border-black/10 bg-[#FBFAF3] py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-5 text-center lg:px-8">
        <p id="works-with-title" className={eyebrow}>
          {"// works with your stack //"}
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-[1180px]">
        <Row items={CONNECTS} label="Integrations: alert channels, plugins, deploy triggers and data" />
        <p className="px-5 pb-4 pt-9 text-center font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[#6B6B60]">
          Monitors sites built on anything - including
        </p>
        <Row items={MONITORS} label="Platforms MyKavo monitors websites built on" />
      </div>
    </section>
  );
}
