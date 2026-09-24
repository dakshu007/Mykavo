import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { WP_PLUGIN_PAGE_PATH } from "@/config/wordpress-plugin";
import { eyebrow, fontDisplay } from "./style";
import { WpPluginDownload } from "./wp-plugin-download";
import { WpUpdateAnimation } from "./wp-update-animation";

const points = [
  "A check after every plugin, theme and WordPress update - automatic ones too",
  "The update that broke something, named on every change",
  "Before-and-after screenshots and one-click decisions in wp-admin",
  "Nothing added to the pages your visitors load",
];

/** Homepage band for the WordPress plugin; the full story is on its own page. */
export function WordPressPluginSection() {
  return (
    <section id="wordpress" className="border-y border-black/10 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div>
            <p className={`${eyebrow} mb-4`}>{"// for wordpress //"}</p>
            <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
              Update WordPress
              <br />
              <span className="text-[#6B6B60]">without fear.</span>
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-7 text-[#6B6B60]">
              Updates are the number one way WordPress sites break. The free MyKavo plugin checks
              your pages the moment an update finishes and tells you whether it broke anything -
              and which update it was.
            </p>
            <ul className="mt-8 space-y-3.5">
              {points.map((t) => (
                <li key={t} className="flex items-start gap-3 text-[15px] text-[#151515]/90">
                  <CheckCircle2
                    className="mt-0.5 size-5 shrink-0 rounded-full bg-[#FFD400] p-0.5 text-[#151515]"
                    aria-hidden
                  />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <WpPluginDownload placement="homepage" />
              <Link
                href={WP_PLUGIN_PAGE_PATH}
                className="inline-flex items-center gap-2 px-2 py-3 text-sm font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4"
              >
                See everything it does
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
          <Link
            href={WP_PLUGIN_PAGE_PATH}
            aria-label="MyKavo for WordPress - see everything the plugin does"
            className="block min-w-0 overflow-hidden rounded-[18px] border-2 border-[#151515] bg-[#FBFAF6] shadow-[10px_10px_0_#FFD400] transition-transform hover:-translate-y-0.5"
          >
            <WpUpdateAnimation />
          </Link>
        </div>
      </div>
    </section>
  );
}
