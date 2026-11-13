import type { Metadata } from "next";
import { withSocial } from "@/lib/social-metadata";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
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
    <AuthForm
      mode="signup"
      googleEnabled={googleEnabled}
      redirectTo={next ?? undefined}
      autoGoogle={params.provider === "google"}
      heading={{
        eyebrow: "Create account",
        title: "Start watching.",
        subtitle: (
          <>
            You start on the Free plan and can upgrade any time. No credit card required.
          </>
        ),
      }}
    />
  );
}
