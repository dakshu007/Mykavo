/* eslint-disable @next/next/no-img-element -- tiny static brand SVGs, below the fold; the image optimizer adds nothing for vectors. */
import { eyebrowOnDark } from "./style";

/**
 * "Supported by" - a quiet, static row of the companies whose programmes
 * support MyKavo, on a dark ink band.
 *
 * Honesty rules (same as the "Works with" strip): these companies support
 * MyKavo, they are not customers, so the label never says "trusted by" or
 * "used by". The logos are each company's own published marks (white
 * versions for dark backgrounds, the Claude spark and Moda mark in their own
 * colours), never redrawn. Files live in /public/brand/supported-by.
 */

type Supporter = {
  name: string;
  href: string;
  /** The logo, sized by height so every mark sits on one optical line. */
  logo: React.ReactNode;
};

const SUPPORTERS: Supporter[] = [
  {
    name: "Claude",
    href: "https://claude.ai",
    logo: <img src="/brand/supported-by/claude.svg" alt="Claude" width={129} height={28} className="h-7 w-auto" />,
  },
  {
    name: "ElevenLabs",
    href: "https://elevenlabs.io",
    logo: (
      <img src="/brand/supported-by/elevenlabs.svg" alt="ElevenLabs" width={148} height={19} className="h-[19px] w-auto" />
    ),
  },
  {
    name: "Linear",
    href: "https://linear.app",
    logo: <img src="/brand/supported-by/linear.svg" alt="Linear" width={112} height={28} className="h-7 w-auto" />,
  },
  {
    name: "Moda",
    href: "https://moda.app",
    logo: (
      <span className="inline-flex items-center gap-2.5">
        <img src="/brand/supported-by/moda.png" alt="" width={30} height={30} className="size-[30px]" />
        <span className="text-[22px] font-semibold tracking-[-0.02em] text-white">Moda</span>
      </span>
    ),
  },
  {
    name: "ClickHouse",
    href: "https://clickhouse.com",
    logo: (
      <span className="inline-flex items-center gap-2.5">
        <img src="/brand/supported-by/clickhouse-symbol.svg" alt="" width={24} height={24} className="size-6" />
        <span className="text-[21px] font-semibold tracking-[-0.015em] text-white">ClickHouse</span>
      </span>
    ),
  },
];

export function SupportedBy() {
  return (
    <section aria-labelledby="supported-by-title" className="bg-[#151515] pb-16 sm:pb-20">
      {/* Sits right under the dark "Works with" band: a hairline keeps them
          one calm logo zone with two clear parts. */}
      <div className="mx-auto max-w-6xl border-t border-white/10 px-5 pt-14 sm:pt-16 lg:px-8">
        <p id="supported-by-title" className={`${eyebrowOnDark} text-center`}>
          {"// supported by //"}
        </p>
        <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-14 gap-y-9 sm:justify-between sm:gap-x-10">
          {SUPPORTERS.map((s) => (
            <li key={s.name}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.name}
                className="flex h-10 items-center opacity-85 transition-opacity duration-200 hover:opacity-100 focus-visible:rounded-md focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFD400]"
              >
                {s.logo}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
