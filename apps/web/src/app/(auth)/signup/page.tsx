import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth, googleEnabled } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { safeNextPath } from "@/lib/team";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create a free MyKavo account and start monitoring your first website.",
  robots: { index: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Only same-origin relative paths - never an open redirect.
  const next = safeNextPath((await searchParams).next);
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect(next ?? "/dashboard");

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold tracking-tight text-ink">
        Create your account
      </h1>
      <p className="mb-6 text-sm text-ink-secondary">
        Free plan included - no credit card required.
      </p>
      <AuthForm mode="signup" googleEnabled={googleEnabled} redirectTo={next ?? undefined} />
    </>
  );
}
