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
    <AuthForm
      mode="login"
      googleEnabled={googleEnabled}
      redirectTo={next ?? undefined}
      autoGoogle={params.provider === "google"}
      heading={{
        eyebrow: "Sign in",
        title: "Welcome back.",
        subtitle: "Your websites kept watch while you were away.",
      }}
    />
  );
}
