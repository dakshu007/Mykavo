import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create a free Fluxen account and start monitoring your first website.",
  robots: { index: false },
};

export default async function SignupPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold tracking-tight text-ink">
        Create your account
      </h1>
      <p className="mb-6 text-sm text-ink-secondary">
        Free plan included — no credit card required.
      </p>
      <AuthForm mode="signup" />
    </>
  );
}
