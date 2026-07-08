"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { track } from "@/lib/analytics";

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  minLength,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  minLength?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-field border border-line bg-card px-4 text-[15px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
      />
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function AuthForm({
  mode,
  googleEnabled = false,
}: {
  mode: "login" | "signup";
  googleEnabled?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  async function continueWithGoogle() {
    if (googleLoading) return;
    setGoogleLoading(true);
    setError("");
    if (mode === "signup") track("account_created", { provider: "google" });
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
    if (result.error) {
      setError(result.error.message ?? "Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
    // On success the browser is redirected to Google.
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    const result =
      mode === "signup"
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });

    if (result.error) {
      setError(result.error.message ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    if (mode === "signup") track("account_created");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={continueWithGoogle}
            disabled={googleLoading || loading}
            className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-line bg-card text-[15px] font-medium text-ink transition-colors hover:border-ink-faint disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <GoogleMark />
            )}
            Continue with Google
          </button>
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[13px] text-ink-faint">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}
      <form onSubmit={submit} className="space-y-4">
        {mode === "signup" && (
          <Field
            id="name"
            label="Name"
            type="text"
            value={name}
            onChange={setName}
            autoComplete="name"
          />
        )}
      <Field
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
      />
      <Field
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        minLength={8}
      />
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {mode === "signup" ? "Create account" : "Sign in"}
      </button>
      <p className="text-center text-sm text-ink-secondary">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New to Fluxen?{" "}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Create an account
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
