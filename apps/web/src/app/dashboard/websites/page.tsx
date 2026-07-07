import { Globe } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";

export default function WebsitesPage() {
  return (
    <EmptyState
      icon={Globe}
      title="No websites yet"
      description="Adding websites — with safe URL validation, page discovery, and monitored-page selection — ships in the next release (Phase 2)."
    />
  );
}
