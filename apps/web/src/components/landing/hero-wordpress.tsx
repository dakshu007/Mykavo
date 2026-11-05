import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, BellRing, Check, RefreshCw } from "lucide-react";
import { WordPressGlyph } from "@/components/brand/integration-icons";
import { WP_PLUGIN_PAGE_PATH } from "@/config/wordpress-plugin";
import { WpPluginInstall } from "./wp-plugin-download";
import { HeroWpReviews } from "./wp-reviews";

/**
 * The hero's main action, for WordPress sites.
 *
 * WHY WORDPRESS FIRST: the plugin is the stickiest thing MyKavo has. Both
 * sites that connected it (Sept 28 and Oct 11) were still using it daily a
 * month later, while the emailed audit that held this spot was never used
 * by a visitor. WordPress breaks in one predictable way, an update, and the
 * plugin answers exactly that: a check after every plugin, theme and core
 * update, naming the update when something broke.
 *
 * The update timeline is a labelled illustration, not customer data.
 */
const STEPS = [
  { icon: RefreshCw, time: "02:14", text: "WooCommerce updated to 9.4", tone: "muted" },
  { icon: Check, time: "02:16", text: "MyKavo re-checked 12 pages", tone: "muted" },
  { icon: BellRing, time: "02:16", text: "“Add to cart” missing on /shop, caused by the WooCommerce update", tone: "alert" },
] as const;

export function HeroWordPress() {
  return (
    <>
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-[#151515] bg-white p-5 text-left shadow-[5px_5px_0_#151515] sm:p-6">
        <div className="flex items-start gap-3.5">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#21759B] text-white">
            <WordPressGlyph className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-[17px] font-semibold leading-snug text-[#151515]">Running WordPress? Install the free plugin.</p>
            <p className="mt-1 text-[14px] leading-6 text-[#6B6B60]">
              MyKavo checks your site after every plugin, theme and WordPress update, and tells you which update broke
              it. Nothing is added to the pages your visitors load.
            </p>
          </div>
        </div>

        <ol className="mt-4 space-y-1.5 rounded-xl bg-[#F6F5EE] p-3.5" aria-label="Example: what happens after an update">
          {STEPS.map((s) => (
            <li key={s.text} className="flex items-start gap-2.5 text-[13px] leading-5">
              <span className="w-11 shrink-0 font-mono text-[11.5px] leading-5 text-[#6B6B60]">{s.time}</span>
              <s.icon
                className={`mt-0.5 size-3.5 shrink-0 ${s.tone === "alert" ? "text-[#B42318]" : "text-[#6B6B60]"}`}
                aria-hidden
              />
              <span className={s.tone === "alert" ? "font-semibold text-[#151515]" : "text-[#3d3d38]"}>{s.text}</span>
            </li>
          ))}
          <li className="pl-[3.4rem] font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#6B6B60]">Example alert</li>
        </ol>

        <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <WpPluginInstall placement="home_hero" />
          <Link
            href={`${WP_PLUGIN_PAGE_PATH}?from=home_hero`}
            className="group inline-flex items-center justify-center gap-1.5 px-2 text-[14px] font-semibold text-[#151515]"
          >
            How the plugin works
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
        <p className="mt-3 text-[12.5px] text-[#6B6B60]">
          Free on WordPress.org · Works with WooCommerce · Set up in two minutes
        </p>
      </div>
      {/* Real 4 and 5 star reviews from WordPress.org, once there are some. */}
      <Suspense fallback={null}>
        <HeroWpReviews />
      </Suspense>
    </>
  );
}
