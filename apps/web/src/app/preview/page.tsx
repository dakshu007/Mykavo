import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { DashboardPreview } from "@/components/preview/dashboard-preview";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Dashboard Preview - MyKavo",
  description:
    "Explore the MyKavo dashboard: multi-website monitoring overview, change feed, and before-and-after change details. Sample data preview.",
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
            This is a preview with sample data. Switch between screens to see how MyKavo surfaces
            what changed, where, and how much it matters.
          </p>
        </div>
        <DashboardPreview />
        <div className="mx-auto mt-14 max-w-xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Want this for your websites?
          </h2>
          <p className="mb-6 mt-2 text-[15px] text-ink-secondary">
            Create a free account - no credit card required.
          </p>
          <ButtonLink href="/signup" size="lg">
            Start Monitoring Free
          </ButtonLink>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
