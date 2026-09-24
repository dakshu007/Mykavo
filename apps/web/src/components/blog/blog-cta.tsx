import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GoogleIcon } from "@/components/brand/integration-icons";
import { fontDisplay } from "@/components/landing/style";

/**
 * The blog's closing product CTA - the end of every post and the bottom of
 * the blog index. Somebody who has just finished reading is at the highest
 * intent on the page, so the card shows the product rather than describing
 * it: three example changes the way MyKavo reports them, then the signup.
 * The examples are labelled as examples; they are not customer data.
 */

const EXAMPLES: Array<{
  severity: string;
  tone: string;
  title: string;
  page: string;
}> = [
  {
    severity: "Critical",
    tone: "bg-[#FDE2E1] text-[#B42318]",
    title: '"Add to cart" is missing',
    page: "/products/coffee",
  },
  {
    severity: "High",
    tone: "bg-[#FFE8D5] text-[#B54708]",
    title: "Page set to noindex",
    page: "/pricing",
  },
  {
    severity: "Medium",
    tone: "bg-[#FFF4C2] text-[#7A5B00]",
    title: "Title tag changed",
    page: "/",
  },
];

export function BlogCta({ showMorePosts = true }: { showMorePosts?: boolean }) {
  return (
    <aside className="mt-8 overflow-hidden rounded-[28px] border border-[#151515] bg-[#151515] shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515]">
      <div className="grid grid-cols-1 items-center gap-10 px-5 py-12 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <div className="min-w-0 text-center lg:text-left">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FFD400]">
            {"// mykavo //"}
          </p>
          <h2
            className={`${fontDisplay} mt-4 text-4xl leading-[1.05] text-[#E9EBDF] sm:text-5xl`}
          >
            Website monitoring,
            <br />
            <span className="text-[#FFD400]">page by page.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-7 text-[#9C9E93] lg:mx-0">
            MyKavo watches every page that matters - titles, canonicals,
            noindex, screenshots, scripts, links and your buy buttons - and
            tells you the moment one changes or breaks, with before-and-after
            proof.
          </p>

          <ul className="mx-auto mt-6 flex w-fit flex-col gap-2 text-left sm:flex-row sm:gap-5 lg:mx-0">
            {[
              "Free forever plan",
              "No credit card",
              "Monitoring in minutes",
            ].map((point) => (
              <li
                key={point}
                className="flex items-center gap-2 text-[13px] font-medium text-[#E9EBDF]"
              >
                <span
                  className="size-1.5 rounded-full bg-[#FFD400]"
                  aria-hidden
                />
                {point}
              </li>
            ))}
          </ul>

          <div className="mx-auto mt-7 flex w-full max-w-xs flex-col overflow-hidden rounded-2xl border border-[#FFD400]/40 sm:w-fit sm:max-w-none sm:flex-row sm:rounded-full lg:mx-0">
            <Link
              href="/signup?provider=google"
              className="flex items-center justify-center gap-2.5 bg-white px-6 py-3.5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#FFF3B0]"
            >
              <GoogleIcon className="size-[18px]" />
              Continue with Google
            </Link>
            <Link
              href="/signup"
              className="bg-white/[0.06] px-6 py-3.5 text-center text-sm font-semibold text-[#E9EBDF] transition-colors hover:bg-white/[0.12]"
            >
              Use email
            </Link>
          </div>

          <p className="mt-5 text-[13px] text-[#9C9E93]">
            <Link
              href="/pricing"
              className="text-[#E9EBDF] underline underline-offset-4 hover:text-[#FFD400]"
            >
              See plans
            </Link>
            {showMorePosts && (
              <>
                {" "}
                or{" "}
                <Link
                  href="/blog"
                  className="text-[#E9EBDF] underline underline-offset-4 hover:text-[#FFD400]"
                >
                  read more posts
                </Link>
              </>
            )}
            .
          </p>
        </div>

        {/* Product proof: what an alert actually looks like. */}
        <figure className="min-w-0 rounded-2xl border border-white/10 bg-white p-4 text-left shadow-[0_24px_50px_-20px_rgba(0,0,0,0.6)]">
          <figcaption className="flex items-center justify-between px-1 pb-3">
            <span className="text-[13px] font-semibold text-[#151515]">
              Needs attention
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B6B60]">
              Example
            </span>
          </figcaption>
          <ul className="divide-y divide-black/10 rounded-xl border border-black/10">
            {EXAMPLES.map((e) => (
              <li key={e.title} className="flex items-center gap-3 px-3 py-3">
                <span
                  className={`w-[70px] shrink-0 rounded-full px-2 py-0.5 text-center font-mono text-[10px] font-semibold uppercase ${e.tone}`}
                >
                  {e.severity}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold text-[#151515]">
                    {e.title}
                  </span>
                  <span className="block font-mono text-[11.5px] text-[#6B6B60]">
                    {e.page}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-black/10 p-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#B42318]">
                Before
              </p>
              <p className="mt-1 font-mono text-[11.5px] text-[#151515]">
                index, follow
              </p>
            </div>
            <div className="rounded-lg border border-black/10 p-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#067647]">
                Now
              </p>
              <p className="mt-1 font-mono text-[11.5px] text-[#151515]">
                noindex
              </p>
            </div>
          </div>
          <Link
            href="/preview"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-[#FFD400] py-2 text-[13px] font-semibold text-[#151515]"
          >
            See the dashboard
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </figure>
      </div>
    </aside>
  );
}
