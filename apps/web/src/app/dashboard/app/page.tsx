import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canDownloadApp } from "@mykavo/shared";
import { requireSession } from "@/lib/session";
import { getAppAccessStatus } from "@/lib/app-access";
import { AppDownloadPanel } from "@/components/dashboard/app-download-panel";

export const metadata: Metadata = {
  title: "Android app",
  robots: { index: false },
};

/**
 * The approved user's download page.
 *
 * `notFound()` for everybody else, including somebody whose request is still
 * pending and somebody who was declined. Those two cases are deliberately
 * indistinguishable: a person who was turned down should not meet a "declined"
 * banner every time they look, and a person still waiting is told so by email
 * rather than by a permanent grey panel. Neither learns that the other state
 * exists.
 *
 * requireSession() runs first, so an unauthenticated visit becomes
 * /login?next=... and returns here afterwards - which is what makes the
 * emailed link work for somebody who is not signed in yet.
 */
export default async function AppDownloadPage({
  searchParams,
}: {
  searchParams: Promise<{ download?: string }>;
}) {
  const session = await requireSession();
  const status = await getAppAccessStatus(session.user.email);
  if (!canDownloadApp(status)) notFound();

  const autoStart = (await searchParams).download === "1";

  return (
    <div className="max-w-2xl space-y-6">
      <AppDownloadPanel autoStart={autoStart} />
    </div>
  );
}
