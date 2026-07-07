import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Fluxen dashboard.",
  robots: { index: false },
};

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold tracking-tight text-ink">Welcome back</h1>
      <p className="mb-6 text-sm text-ink-secondary">Sign in to your Fluxen dashboard.</p>
      <AuthForm mode="login" />
    </>
  );
}
