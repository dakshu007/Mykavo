import { Bell } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";

export default function NotificationsPage() {
  return (
    <EmptyState
      icon={Bell}
      title="No notifications yet"
      description="Email alerts for critical and high-severity changes arrive with scheduled monitoring (Phase 7). You'll configure recipients and severity preferences here."
    />
  );
}
