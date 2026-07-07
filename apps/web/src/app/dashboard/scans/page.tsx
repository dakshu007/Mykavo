import { History } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";

export default function ScansPage() {
  return (
    <EmptyState
      icon={History}
      title="No scans yet"
      description="Scan history — trigger type, duration, pages scanned, failures, and detected changes — appears here after your first baseline scan."
    />
  );
}
