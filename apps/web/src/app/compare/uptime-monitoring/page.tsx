import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComparisonPage } from "@/components/landing/comparison-page";
import { findComparison } from "@/config/comparisons";

const comparison = findComparison("uptime-monitoring");

export const metadata: Metadata = {
  title: comparison?.title,
  description: comparison?.description,
  keywords: comparison?.keywords,
  alternates: { canonical: "/compare/uptime-monitoring" },
  openGraph: {
    title: comparison?.title,
    description: comparison?.description,
    url: "/compare/uptime-monitoring",
    type: "article",
  },
};

export default function Page() {
  if (!comparison) notFound();
  return <ComparisonPage comparison={comparison} />;
}
