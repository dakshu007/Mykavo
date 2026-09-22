import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { RecentSignups } from "@/components/dashboard/recent-signups";
import { getRecentSignups } from "@/lib/admin/recent-signups";

export const metadata: Metadata = {
  title: "Users",
  robots: { index: false },
};

async function SignupsPanel() {
  return <RecentSignups report={await getRecentSignups()} />;
}

function SignupsSkeleton() {
  return <p className="py-4 text-sm text-ink-secondary">Loading users…</p>;
}

/**
 * Users - who has signed up for this MyKavo installation.
 *
 * Operator-only, and `notFound()` rather than a "not allowed" page, matching
 * All Usage: a customer has no reason to learn that an admin view exists, and
 * a 403 tells them it does. The gate here is UX; the page reads nothing a
 * customer could reach anyway.
 *
 * Separate from All Usage because they answer different questions. That page
 * is "what is this costing"; this one is "is anybody using it". Sharing a
 * screen made the second easy to miss underneath the first.
 */
export default async function UsersPage() {
  const session = await requireSession();
  if (!isPlatformAdmin(session.user.email)) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <Suspense fallback={<SignupsSkeleton />}>
        <SignupsPanel />
      </Suspense>
    </div>
  );
}
