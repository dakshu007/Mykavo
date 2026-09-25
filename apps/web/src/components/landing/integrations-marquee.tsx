import Link from "next/link";
import type { ReactNode } from "react";
import { Mail, MessagesSquare } from "lucide-react";
import { BRAND_MARKS, type BrandSlug } from "@/components/brand/brand-marks";
import { SlackIcon, WebhookIcon } from "@/components/brand/integration-icons";
import { eyebrow } from "./style";

/**
 * "Works with" - two slow, opposite-scrolling rows of the tools MyKavo
 * connects to and the platforms it monitors.
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
 *
 * CSS-only. Hover or keyboard focus pauses a row; with reduced motion the
 * rows stop and wrap instead of scrolling.
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
  "inline-flex h-12 shrink-0 items-center gap-2.5 rounded-full border border-black/10 bg-white px-4 text-[14px] font-medium text-[#151515] transition-all duration-200";

function Chip({ item, hidden }: { item: Item; hidden: boolean }) {
  const body = (
    <>
      {item.icon}
      <span className="whitespace-nowrap">{item.name}</span>
      {item.tag && (
        <span className="rounded-full bg-[#F3F1E6] px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#6B6B60]">
          {item.tag}
        </span>
      )}
    </>
  );
  if (!item.href) return <span className={chip}>{body}</span>;
  return (
    <Link
      href={item.href}
      tabIndex={hidden ? -1 : undefined}
      className={`${chip} hover:-translate-y-0.5 hover:border-[#151515] hover:shadow-[3px_3px_0_#151515] focus-visible:border-[#151515] focus-visible:shadow-[3px_3px_0_#151515] focus-visible:outline-none`}
    >
      {body}
    </Link>
  );
}

/** One scrolling row: the list twice (or more, for short lists), then an identical copy for the seamless loop. */
function Row({ items, reverse = false, label }: { items: Item[]; reverse?: boolean; label: string }) {
  // Short lists repeat so a single copy is always wider than the screen.
  const run = items.length < 10 ? [...items, ...items] : items;
  return (
    <div className="im-row relative" role="group" aria-label={label}>
      <div
        className="im-mask overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
      >
        <div className={`im-track flex w-max ${reverse ? "im-reverse" : ""}`}>
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              className={`flex shrink-0 items-center gap-3 pr-3 ${copy === 1 ? "im-dup" : ""}`}
              aria-hidden={copy === 1 ? true : undefined}
            >
              {run.map((item, i) => (
                <li key={`${item.name}-${i}`} className={i >= items.length ? "im-repeat" : undefined}>
                  <Chip item={item} hidden={copy === 1 || i >= items.length} />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}

export function IntegrationsMarquee() {
  return (
    <section aria-labelledby="works-with-title" className="border-y border-black/10 bg-[#FBFAF3] py-14 sm:py-16">
      <style>{`
        @keyframes im-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .im-track { animation: im-scroll 70s linear infinite; }
        .im-track.im-reverse { animation-direction: reverse; animation-duration: 55s; }
        .im-row:hover .im-track, .im-row:focus-within .im-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .im-track { animation: none; width: 100%; justify-content: center; }
          .im-track ul { flex-wrap: wrap; flex-shrink: 1; width: 100%; justify-content: center; padding: 0 1.25rem; row-gap: 0.75rem; }
          .im-mask { mask-image: none; }
          .im-dup, .im-repeat { display: none; }
        }
      `}</style>
      <div className="mx-auto max-w-6xl px-5 text-center lg:px-8">
        <p id="works-with-title" className={eyebrow}>
          {"// works with your stack //"}
        </p>
      </div>

      <div className="mx-auto mt-7 max-w-[1400px] space-y-3">
        <Row items={CONNECTS} label="Integrations: alert channels, plugins, deploy triggers and data" />
        <p className="px-5 pt-4 text-center font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[#6B6B60]">
          Monitors sites built on anything - including
        </p>
        <Row items={MONITORS} reverse label="Platforms MyKavo monitors websites built on" />
      </div>
    </section>
  );
}
