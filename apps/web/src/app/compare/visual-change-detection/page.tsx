import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComparisonPage } from "@/components/landing/comparison-page";
import { findComparison } from "@/config/comparisons";

const comparison = findComparison("visual-change-detection");

export const metadata: Metadata = {
  title: comparison?.title,
  description: comparison?.description,
  keywords: comparison?.keywords,
  alternates: { canonical: "/compare/visual-change-detection" },
  openGraph: {
    title: comparison?.title,
    description: comparison?.description,
    url: "/compare/visual-change-detection",
    type: "article",
  },
};

export default function Page() {
  if (!comparison) notFound();
  return <ComparisonPage comparison={comparison} />;
}
