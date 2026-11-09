import type { Metadata } from "next";
import { withSocial } from "@/lib/social-metadata";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { TRIAL_DAYS, TRIAL_MAX_WEBSITES } from "@mykavo/shared";
import { auth, googleEnabled } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { safeNextPath } from "@/lib/team";

export const metadata: Metadata = withSocial({
  title: "Create your account",
  description: "Create a free MyKavo account and start monitoring your first website.",
  robots: { index: false },
});

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; provider?: string }>;
}) {
  // Only same-origin relative paths - never an open redirect.
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect(next ?? "/dashboard");

  return (
    <>
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">Create account</p>
      <h1 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink">
        Start watching.
      </h1>
      <p className="mb-8 mt-2 text-[15px] leading-6 text-ink-secondary">
        Includes a {TRIAL_DAYS}-day Pro trial on up to {TRIAL_MAX_WEBSITES} websites, then the Free plan unless you upgrade. No credit card required.
      </p>
      <AuthForm
        mode="signup"
        googleEnabled={googleEnabled}
        redirectTo={next ?? undefined}
        autoGoogle={params.provider === "google"}
      />
    </>
  );
}
