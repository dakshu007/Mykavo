import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";

/**
 * Shared shell for standalone marketing pages (legal, support, about).
 * v4 landing design: warm paper canvas, island nav, Poppins display h1,
 * and a readable long-form content column. The `prose` wrapper styles the
 * usual long-form tags so page bodies stay plain semantic HTML.
 */
export function MarketingPageShell({
  eyebrowText,
  title,
  intro,
  updated,
  children,
}: {
  /** Mono eyebrow label, e.g. "legal" (rendered as `// legal //`). */
  eyebrowText: string;
  title: React.ReactNode;
  intro?: string;
  /** "Last updated" date line for legal documents. */
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <LandingNav />
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-32 sm:pt-36 lg:px-8">
        <p className={`${eyebrow} mb-4`}>{`// ${eyebrowText} //`}</p>
        <h1 className={`${fontDisplay} text-4xl leading-[1.08] text-[#151515] sm:text-5xl`}>
          {title}
        </h1>
        {intro && <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">{intro}</p>}
        {updated && (
          <p className="mt-4 inline-flex rounded-full border border-black/15 bg-white px-4 py-1.5 font-mono text-[12px] font-semibold text-[#6B6B60]">
            Last updated: {updated}
          </p>
        )}
        <div
          className="mt-10 space-y-4 text-[15px] leading-7 text-[#3d3d38]
            [&_h2]:mt-10 [&_h2]:text-[22px] [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-[#151515]
            [&_h3]:mt-6 [&_h3]:text-[17px] [&_h3]:font-semibold [&_h3]:text-[#151515]
            [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6
            [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-6
            [&_a]:font-medium [&_a]:text-[#151515] [&_a]:underline [&_a]:decoration-[#FFD400] [&_a]:decoration-2 [&_a]:underline-offset-4
            [&_strong]:text-[#151515]
            [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-black/10 [&_th]:bg-[#F3F1E6] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-[13px] [&_td]:border [&_td]:border-black/10 [&_td]:px-3 [&_td]:py-2 [&_td]:text-[13px]"
        >
          {children}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
