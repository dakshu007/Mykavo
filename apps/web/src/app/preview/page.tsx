import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { DashboardPreview } from "@/components/preview/dashboard-preview";
import { WaitlistForm } from "@/components/waitlist-form";

export const metadata: Metadata = {
  title: "Dashboard Preview — Fluxen",
  description:
    "Explore the Fluxen dashboard: multi-website monitoring overview, change feed, and before-and-after change details. Sample data preview.",
  alternates: { canonical: "/preview" },
};

export default function PreviewPage() {
  return (
    <>
      <MarketingNav />
      <main className="mx-auto max-w-300 px-5 py-14 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="label-micro mb-3">Product preview</p>
          <h1 className="text-4xl font-semibold tracking-tight text-ink">
            Every website. One dashboard.
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-ink-secondary">
            This is a preview with sample data. Switch between screens to see how Fluxen surfaces
            what changed, where, and how much it matters.
          </p>
        </div>
        <DashboardPreview />
        <div className="mx-auto mt-14 max-w-xl text-center" id="waitlist">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Want this for your websites?
          </h2>
          <p className="mb-6 mt-2 text-[15px] text-ink-secondary">
            Join the waitlist and be first in when monitoring seats open.
          </p>
          <WaitlistForm source="preview" align="center" />
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
