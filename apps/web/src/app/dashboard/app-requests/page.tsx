import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { getAppRequests } from "@/lib/app-access";
import { AppRequestsTable } from "@/components/dashboard/app-requests-table";

export const metadata: Metadata = {
  title: "Android app requests",
  robots: { index: false },
};

async function Queue() {
  return <AppRequestsTable report={await getAppRequests()} />;
}

/**
 * The Android app approval queue. Operator only.
 *
 * `notFound()` rather than a "not allowed" page, matching All Usage and
 * Users: a customer has no reason to learn that an approval queue exists, and
 * a 403 tells them it does. The gate here is UX - every app-access API
 * re-checks the same allowlist server-side.
 */
export default async function AppRequestsPage() {
  const session = await requireSession();
  if (!isPlatformAdmin(session.user.email)) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <Suspense
        fallback={<p className="py-4 text-sm text-ink-secondary">Loading requests…</p>}
      >
        <Queue />
      </Suspense>
    </div>
  );
}
