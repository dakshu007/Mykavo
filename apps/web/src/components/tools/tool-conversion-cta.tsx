import Link from "next/link";
import { Check } from "lucide-react";
import { GoogleButton } from "@/components/landing/google-cta";
import { fontDisplay } from "@/components/landing/style";

/**
 * The in-page conversion block for free tools, between the explanation and
 * the FAQ.
 *
 * WHY HERE, AND WHY A SECOND ONE
 * ToolCta already closes the results panel, but it only exists for people who
 * actually ran the tool. Search Console shows real arrivals on these pages -
 * "script checker", "script detector" - and every tool page ended its
 * explanation with the strongest pitch on the site ("the expensive failures
 * are the ones that happen next month") followed by nothing to click at all.
 * A reader persuaded by that paragraph had to go and find the nav.
 *
 * The three proof points are deliberately concrete. "Start free" alone asks
 * somebody to take the cost on trust; naming what free actually includes is
 * what makes it an easy yes.
 */
export function ToolConversionCta({
  heading,
  body,
}: {
  heading: string;
  body: string;
}) {
  return (
    <section className="mx-auto mt-16 max-w-2xl">
      <div className="rounded-2xl border border-[#151515] bg-[#FBFAF3] p-7 shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515] sm:p-9">
        <h2 className={`${fontDisplay} text-2xl leading-tight text-[#151515] sm:text-[28px]`}>
          {heading}
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-[#6B6B60]">{body}</p>

        <ul className="mt-6 grid gap-2.5 sm:grid-cols-3">
          {[
            "Free forever plan",
            "No credit card",
            "Monitoring in minutes",
          ].map((point) => (
            <li key={point} className="flex items-center gap-2 text-[13.5px] text-[#151515]">
              <Check
                className="size-4 shrink-0 rounded-full bg-[#FFD400] p-0.5 text-[#151515]"
                aria-hidden
              />
              {point}
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <GoogleButton />
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center rounded-full border border-[#151515]/20 bg-white px-6 text-[14px] font-semibold text-[#151515] transition-colors hover:border-[#151515]/45"
          >
            Sign up with email
          </Link>
        </div>
      </div>
    </section>
  );
}
