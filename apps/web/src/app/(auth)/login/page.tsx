import type { Metadata } from "next";
import { withSocial } from "@/lib/social-metadata";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth, googleEnabled } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { safeNextPath } from "@/lib/team";

export const metadata: Metadata = withSocial({
  title: "Sign in",
  description: "Sign in to your MyKavo dashboard.",
  robots: { index: false },
});

export default async function LoginPage({
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
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">Sign in</p>
      <h1 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink">Welcome back.</h1>
      <p className="mb-8 mt-2 text-[15px] text-ink-secondary">Your websites kept watch while you were away.</p>
      <AuthForm
        mode="login"
        googleEnabled={googleEnabled}
        redirectTo={next ?? undefined}
        autoGoogle={params.provider === "google"}
      />
    </>
  );
}
