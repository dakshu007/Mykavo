"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { track } from "@/lib/analytics";
import { monitorableUrl, signupHref } from "@/lib/attribution/monitor-link";
import { fontDisplay } from "@/components/landing/style";

/**
 * "Type your site, start monitoring it": the in-content CTA for blog posts,
 * guides and landing pages.
 *
 * WHY A URL BOX AND NOT ANOTHER BUTTON
 * Search visitors read the AI Overview, get their answer and leave; a generic
 * "Start free" asks them to imagine the product. Typing their own domain is a
 * small, concrete step about their site, and it carries through: sign-up
 * lands on Add website with the address filled in (signupHref), so the next
 * screen after the account is their first baseline, not an empty dashboard.
 *
 * `from` is the attribution placement (e.g. "blog:overview"), recorded with
 * the sign-up so we can see which placement converts.
 */
export function MonitorUrlCta({
  from,
  heading = "Is anything on your site quietly broken right now?",
  body = "Enter your website. MyKavo saves how your key pages look and work today, re-checks them on a schedule and emails you when something important changes.",
  className = "",
}: {
  from: string;
  heading?: string;
  body?: string;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const raw = value.trim();
    const url = monitorableUrl(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!raw || !url || !url.includes(".")) {
      setError("Enter a website address, like example.com");
      return;
    }
    track("cta_clicked", { cta: "monitor_url", placement: from });
    router.push(signupHref({ url, from: from.slice(0, 60), google: false }));
  }

  return (
    <section aria-label="Start monitoring your website" className={className}>
      <div className="rounded-2xl border-2 border-[#151515] bg-[#151515] p-6 text-[#F5F5F0] shadow-[6px_6px_0_#FFD400] sm:p-8">
        {/* "!" so page prose rules (MarketingPageShell styles every h2 and ul it
            contains) cannot turn this heading dark on the dark card. */}
        <h2 className={`${fontDisplay} mt-0! text-[22px]! leading-tight! font-medium! text-[#F5F5F0]! sm:text-[26px]!`}>{heading}</h2>
        <p className="mt-2.5 max-w-2xl text-[14.5px] leading-6 text-[#B9BBB0]">{body}</p>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-2.5 sm:flex-row" noValidate>
          <label htmlFor={`monitor-url-${from}`} className="sr-only">
            Your website address
          </label>
          <input
            id={`monitor-url-${from}`}
            type="text"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            placeholder="yourwebsite.com"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `monitor-url-${from}-error` : undefined}
            className="h-12 w-full min-w-0 shrink-0 rounded-full border-2 sm:w-auto sm:flex-1 border-[#F5F5F0]/20 bg-[#F5F5F0] px-5 text-[15px] text-[#151515] placeholder:text-[#8A8C80] focus-visible:border-[#FFD400] focus-visible:outline-none"
          />
          <button
            type="submit"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#FFD400] px-6 text-[15px] font-semibold text-[#151515] shadow-[3px_3px_0_#F5F5F0] transition-all hover:-translate-y-0.5 hover:bg-[#ffe14d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD400]"
          >
            Start monitoring free
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </form>
        {error && (
          <p id={`monitor-url-${from}-error`} role="alert" className="mt-2 text-[13px] text-[#FFB4A8]">
            {error}
          </p>
        )}
        <ul className="mt-4 flex list-none! flex-wrap gap-x-5 gap-y-1.5 pl-0! text-[12.5px] text-[#B9BBB0] *:my-0!">
          {["Free plan, no credit card", "14-day Pro trial included", "Set up in about a minute"].map((p) => (
            <li key={p} className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-[#FFD400]" aria-hidden />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
