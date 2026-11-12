import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@mykavo/database";
import { displayPersonName } from "@mykavo/shared";
import { requireSession, getCurrentMembership } from "@/lib/session";
import { canMutate } from "@/lib/team";
import { recordSignupAttribution } from "@/lib/attribution/record";
import { SignupTracker } from "@/components/analytics/signup-tracker";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { WelcomeOnboarding } from "@/components/onboarding/welcome-onboarding";

export const metadata: Metadata = {
  title: "Welcome",
  robots: { index: false },
};

/**
 * The first-run page: a brand-new account lands here (after its email code,
 * or its first Google sign-in) and adds its first website before it ever
 * sees an empty dashboard.
 *
 * Only for someone who can add a website and has none: anyone else (an
 * account with websites, a viewer invited into a team) goes straight on to
 * the dashboard, so this page can never trap or confuse a returning user.
 */
export default async function WelcomePage() {
  const session = await requireSession();
  const { workspace, role } = await getCurrentMembership(session.user.id, session.user.name);
  if (!canMutate(role)) redirect("/dashboard");
  const websites = await prisma.website.count({ where: { workspaceId: workspace.id } });
  if (websites > 0) redirect("/dashboard");

  // Same once-only signup record the dashboard keeps, so a new account is
  // counted with its source even if it never skips ahead to the dashboard.
  const newSignup = await recordSignupAttribution(session.user);
  const firstName = displayPersonName(session.user.name, session.user.email).split(/\s+/)[0] ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {newSignup ? <SignupTracker userId={session.user.id} {...newSignup} /> : null}
      <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link href="/dashboard" aria-label="MyKavo dashboard" className="inline-flex">
          <Logo markSize={28} className="gap-2.5" wordmarkClassName="text-lg" />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden text-[13px] font-medium text-ink-secondary hover:text-ink sm:inline"
          >
            Skip for now
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 pb-12 pt-4 sm:px-8 lg:pb-20">
        <WelcomeOnboarding firstName={firstName} />
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-2 px-5 py-5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint sm:px-8">
        <span>Know what changed. Fix what matters.</span>
        <span>Signed in as {session.user.email}</span>
      </footer>
    </div>
  );
}
