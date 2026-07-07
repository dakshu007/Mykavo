import { GitCompareArrows } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";

export default function ChangesPage() {
  return (
    <EmptyState
      icon={GitCompareArrows}
      title="No changes detected yet"
      description="Once monitoring is active, every meaningful change — visual, SEO, links, scripts, performance, conversion — appears here with severity and before-and-after views."
    />
  );
}
