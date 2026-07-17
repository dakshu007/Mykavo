import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { DashboardPreview } from "@/components/preview/dashboard-preview";

export const metadata: Metadata = {
  title: "Dashboard Preview",
  description:
    "Explore the MyKavo dashboard: multi-website monitoring overview, change feed, and before-and-after change details. Sample data preview.",
  alternates: { canonical: "/preview" },
};

export default function PreviewPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <LandingNav />
      <main className="mx-auto max-w-300 px-5 pb-24 pt-32 sm:pt-36 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className={`${eyebrow} mb-4`}>{"// product preview //"}</p>
          <h1 className={`${fontDisplay} text-4xl leading-[1.1] text-[#151515] sm:text-5xl`}>
            Every website.{" "}
            <span className="relative inline-block whitespace-nowrap">
              <span
                aria-hidden
                className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
              />
              <span className="relative">One dashboard.</span>
            </span>
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
            This is a preview with sample data. Switch between screens to see how MyKavo surfaces
            what changed, where, and how much it matters.
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[#151515] bg-white shadow-[8px_8px_0_#FFD400,8px_8px_0_1px_#151515]">
          <DashboardPreview />
        </div>
        <div className="mx-auto mt-16 max-w-xl text-center">
          <h2 className={`${fontDisplay} text-2xl text-[#151515] sm:text-3xl`}>
            Want this for your websites?
          </h2>
          <p className="mb-7 mt-2 text-[15px] text-[#6B6B60]">
            Create a free account - no credit card required.
          </p>
          <Link
            href="/signup"
            className="inline-flex rounded-full border border-[#151515] bg-[#FFD400] px-7 py-3.5 text-sm font-semibold text-[#151515] shadow-[3px_3px_0_#151515] transition-colors hover:bg-[#ffe14d]"
          >
            Start Monitoring Free
          </Link>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
