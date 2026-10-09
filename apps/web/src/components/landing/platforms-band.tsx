import { ArrowRight } from "lucide-react";
import { PLATFORMS, HOMEPAGE_BAND_IDS, PLATFORMS_PAGE_PATH, STATUS_LABEL } from "@/config/platforms";
import { eyebrow, fontDisplay } from "./style";
import { PlatformLogo } from "./platform-marks";
import { TrackedLink } from "./tracked-link";

/**
 * Homepage band that points at /platforms: the real logos of where MyKavo
 * works, each linking to its own card on that page, plus one clear way on to
 * the full list. Logos are used nominatively (see platform-marks.tsx).
 */
export function PlatformsBand() {
  const items = HOMEPAGE_BAND_IDS.map((id) => PLATFORMS.find((p) => p.id === id)).filter(
    (p): p is NonNullable<typeof p> => Boolean(p),
  );
  return (
    <section aria-labelledby="platforms-band-title" className="border-y border-black/10 bg-[#F3F1E6]">
      <div className="mx-auto max-w-6xl px-5 py-14 lg:px-8 lg:py-16">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <p className={`${eyebrow} mb-3`}>{"// platforms //"}</p>
            <h2 id="platforms-band-title" className={`${fontDisplay} text-3xl leading-[1.08] text-[#151515] sm:text-4xl`}>
              Works where you work.
              <br />
              <span className="text-[#6B6B60]">One MyKavo underneath.</span>
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-7 text-[#6B6B60]">
              The web app, WordPress, Chrome, your AI assistant and more - one account, the same quiet alerts.
            </p>
            <TrackedLink
              href={PLATFORMS_PAGE_PATH}
              event="platforms_cta_clicked"
              eventProps={{ placement: "homepage_band", target: "all_platforms" }}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#151515] bg-[#151515] px-6 py-3.5 text-sm font-semibold text-[#F5F5F0] shadow-[4px_4px_0_#FFD400] transition-colors hover:bg-[#2a2a2a]"
            >
              See every platform
              <ArrowRight className="size-4" aria-hidden />
            </TrackedLink>
          </div>
          <ul className="flex flex-wrap gap-3 lg:justify-end" aria-label="Platforms MyKavo works on">
            {items.map((p) => (
              <li key={p.id}>
                <TrackedLink
                  href={`${PLATFORMS_PAGE_PATH}#${p.id}`}
                  event="platform_clicked"
                  eventProps={{ platform: p.id, placement: "homepage_band", status: p.status }}
                  className="group inline-flex items-center gap-3 rounded-2xl border border-[#151515] bg-white py-2.5 pl-3 pr-4 shadow-[3px_3px_0_#151515] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#151515]"
                >
                  <PlatformLogo id={p.id} className="size-7" />
                  <span className="flex flex-col leading-tight">
                    <span className="text-[15px] font-semibold text-[#151515]">{p.name}</span>
                    {p.status !== "live" && (
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[#6B6B60]">
                        {STATUS_LABEL[p.status]}
                      </span>
                    )}
                  </span>
                </TrackedLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
