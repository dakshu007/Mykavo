"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { BRAND_MARKS } from "@/components/brand/brand-marks";
import { WpPluginInstall } from "@/components/landing/wp-plugin-download";
import { fontDisplay } from "@/components/landing/style";
import { track } from "@/lib/analytics";
import { WP_PLUGIN_PAGE_PATH, WP_PLUGIN_REQUIRES } from "@/config/wordpress-plugin";

/**
 * The WordPress plugin pitch for readers who are on WordPress: WordPress
 * posts and pages, and tool results for a site that runs WordPress.
 *
 * WHY THE PLUGIN AND NOT "SIGN UP"
 * A WordPress owner's real fear is the update that breaks the site. The
 * plugin answers it where they already work (wp-admin), is free on
 * WordPress.org, and installing it is a familiar step rather than a new
 * account. Every point below is true on the Free plan except where marked:
 * updates are recorded and manual one-click rollback is free; the check
 * after each update (Safe Updates) comes with every paid plan.
 */
const POINTS = [
  "Records every plugin, theme and WordPress update",
  "Checks your key pages right after each update and names the one that broke something",
  "One-click rollback when an update goes wrong, free",
  "Changes, alerts and before-and-after proof inside wp-admin",
];

export function WordpressPluginCta({
  placement,
  heading = "Know which plugin update broke your site.",
  body = "The free MyKavo plugin watches your site through every plugin, theme and core update, and tells you which one caused a change, before your visitors find it.",
  className = "",
}: {
  /** Where it is shown, for click counts (e.g. "blog:overview"). */
  placement: string;
  heading?: string;
  body?: string;
  className?: string;
}) {
  return (
    <section aria-label="MyKavo WordPress plugin" className={className}>
      <div className="relative overflow-hidden rounded-2xl border-2 border-[#151515] bg-[#FFF7CC] p-6 text-[#151515] shadow-[6px_6px_0_#151515] sm:p-8">
        <div className="flex items-start gap-4">
          <span className="hidden size-12 shrink-0 place-items-center rounded-xl border-2 border-[#151515] bg-white sm:grid">
            <svg viewBox="0 0 24 24" className="size-7" aria-hidden focusable="false">
              <path d={BRAND_MARKS.wordpress.path} fill="#21759B" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#6B6B60]">
              Free WordPress plugin
            </p>
            {/* "!" so page prose rules cannot restyle the heading or list. */}
            <h2 className={`${fontDisplay} mt-1.5! text-[22px]! leading-tight! font-medium! text-[#151515]! sm:text-[26px]!`}>
              {heading}
            </h2>
            <p className="mt-2 max-w-2xl text-[14.5px] leading-6 text-[#3D3D38]">{body}</p>
          </div>
        </div>
        <ul className="mt-5 grid list-none! gap-2.5 pl-0! sm:grid-cols-2 *:my-0!">
          {POINTS.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-[14px] leading-5">
              <Check className="mt-0.5 size-4 shrink-0 rounded-full bg-[#FFD400] p-0.5 ring-1 ring-[#151515]" aria-hidden />
              {point}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <WpPluginInstall placement={placement} />
          <Link
            href={WP_PLUGIN_PAGE_PATH}
            onClick={() => track("cta_clicked", { cta: "wp_plugin_page", placement })}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#151515]/25 bg-white px-6 py-3.5 text-sm font-semibold text-[#151515] no-underline! transition-colors hover:border-[#151515]"
          >
            See how it works
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <p className="mt-4 text-[12px] text-[#6B6B60]">
          Free on WordPress.org · WordPress {WP_PLUGIN_REQUIRES.wordpress}+ · PHP {WP_PLUGIN_REQUIRES.php}+ · The check
          after each update comes with every paid plan
        </p>
      </div>
    </section>
  );
}
