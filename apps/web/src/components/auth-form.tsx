"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { track } from "@/lib/analytics";
import { BackupCodesPanel, TotpQr, totpSecretFromUri } from "@/components/two-factor";

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  minLength,
  inputMode,
  placeholder,
  autoFocus,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  minLength?: number;
  inputMode?: "numeric" | "text";
  placeholder?: string;
  autoFocus?: boolean;
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
        inputMode={inputMode}
        placeholder={placeholder}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-field border border-line bg-card px-4 text-[15px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
      />
    </div>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
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

type Step =
  | "credentials" // email + password form
  | "totp" // login: enter authenticator code
  | "enroll" // signup: scan QR + confirm first code
  | "backup"; // signup: show one-time backup codes

export function AuthForm({
  mode,
  googleEnabled = false,
  redirectTo,
}: {
  mode: "login" | "signup";
  googleEnabled?: boolean;
  /** Same-origin relative path to return to after auth (validated server-side). */
  redirectTo?: string;
}) {
  const router = useRouter();
  const target = redirectTo ?? "/dashboard";
  // Keep the invite (or other) return path when hopping between login/signup.
  const nextQuery = redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : "";
  const [step, setStep] = useState<Step>("credentials");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);
  const [totpUri, setTotpUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  function finish() {
    router.push(target);
    router.refresh();
  }

  async function continueWithGoogle() {
    if (googleLoading) return;
    setGoogleLoading(true);
    setError("");
    if (mode === "signup") track("account_created", { provider: "google" });
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: target,
    });
    if (result.error) {
      setError(result.error.message ?? "Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
    // On success the browser is redirected to Google.
  }

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    if (mode === "login") {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      // Enrolled accounts get a second step instead of a session.
      const data = result.data as { twoFactorRedirect?: boolean } | null;
      if (data?.twoFactorRedirect) {
        setStep("totp");
        setLoading(false);
        return;
      }
      finish();
      return;
    }

    // Signup: create the account, then immediately start TOTP enrollment.
    const result = await authClient.signUp.email({ name, email, password });
    if (result.error) {
      setError(result.error.message ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }
    track("account_created");
    const enable = await authClient.twoFactor.enable({ password });
    if (enable.error || !enable.data) {
      // Account exists and is signed in — don't strand the user on an
      // enrollment error; they can enable 2FA from Settings.
      finish();
      return;
    }
    setTotpUri(enable.data.totpURI);
    setBackupCodes(enable.data.backupCodes);
    setStep("enroll");
    setLoading(false);
  }

  async function submitLoginCode(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    const result = useBackupCode
      ? await authClient.twoFactor.verifyBackupCode({ code: code.trim() })
      : await authClient.twoFactor.verifyTotp({ code: code.trim(), trustDevice });
    if (result.error) {
      setError(result.error.message ?? "That code didn't work. Try again.");
      setLoading(false);
      return;
    }
    finish();
  }

  async function submitEnrollCode(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    const result = await authClient.twoFactor.verifyTotp({ code: code.trim() });
    if (result.error) {
      setError(result.error.message ?? "That code didn't match. Try again.");
      setLoading(false);
      return;
    }
    setStep("backup");
    setLoading(false);
  }

  /* ------------------------- login: TOTP challenge ------------------------ */
  if (step === "totp") {
    return (
      <form onSubmit={submitLoginCode} className="space-y-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-panel px-4 py-3">
          <ShieldCheck className="size-4.5 shrink-0 text-primary" aria-hidden />
          <p className="text-[13px] leading-5 text-ink-secondary">
            Two-factor authentication is on for this account. Enter the code from your
            authenticator app.
          </p>
        </div>
        <Field
          id="totp-code"
          label={useBackupCode ? "Backup code" : "6-digit code"}
          type="text"
          value={code}
          onChange={setCode}
          autoComplete="one-time-code"
          inputMode={useBackupCode ? "text" : "numeric"}
          placeholder={useBackupCode ? "xxxxx-xxxxx" : "123456"}
          autoFocus
        />
        {!useBackupCode && (
          <label className="flex items-center gap-2 text-[13px] text-ink-secondary">
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
              className="size-4 accent-[var(--fx-primary)]"
            />
            Trust this device for 30 days
          </label>
        )}
        {error && (
          <p className="text-sm text-critical-strong" role="alert">
            {error}
          </p>
        )}
        <SubmitButton loading={loading}>Verify and sign in</SubmitButton>
        <button
          type="button"
          onClick={() => {
            setUseBackupCode((v) => !v);
            setCode("");
            setError("");
          }}
          className="w-full text-center text-[13px] font-medium text-ink-secondary hover:text-ink"
        >
          {useBackupCode ? "Use an authenticator code instead" : "Lost your device? Use a backup code"}
        </button>
      </form>
    );
  }

  /* ---------------------- signup: scan QR + first code -------------------- */
  if (step === "enroll") {
    return (
      <form onSubmit={submitEnrollCode} className="space-y-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-panel px-4 py-3">
          <ShieldCheck className="size-4.5 shrink-0 text-primary" aria-hidden />
          <p className="text-[13px] leading-5 text-ink-secondary">
            Secure your account: scan this QR code with Google Authenticator (or any TOTP app),
            then enter the 6-digit code it shows.
          </p>
        </div>
        <TotpQr uri={totpUri} />
        <p className="break-all text-center text-[12px] text-ink-faint">
          Can&apos;t scan? Enter this key manually: <span className="font-mono">{totpSecretFromUri(totpUri)}</span>
        </p>
        <Field
          id="enroll-code"
          label="6-digit code"
          type="text"
          value={code}
          onChange={setCode}
          autoComplete="one-time-code"
          inputMode="numeric"
          placeholder="123456"
          autoFocus
        />
        {error && (
          <p className="text-sm text-critical-strong" role="alert">
            {error}
          </p>
        )}
        <SubmitButton loading={loading}>Activate two-factor auth</SubmitButton>
        <button
          type="button"
          onClick={finish}
          className="w-full text-center text-[13px] font-medium text-ink-faint hover:text-ink-secondary"
        >
          Set up later in Settings
        </button>
      </form>
    );
  }

  /* --------------------- signup: one-time backup codes -------------------- */
  if (step === "backup") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-panel px-4 py-3">
          <ShieldCheck className="size-4.5 shrink-0 text-primary" aria-hidden />
          <p className="text-[13px] leading-5 text-ink-secondary">
            Two-factor authentication is on. One last thing — save your backup codes.
          </p>
        </div>
        <BackupCodesPanel codes={backupCodes} />
        <button
          type="button"
          onClick={finish}
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-[15px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
        >
          I saved my codes — continue
        </button>
      </div>
    );
  }

  /* --------------------------- credentials form --------------------------- */
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
      <form onSubmit={submitCredentials} className="space-y-4">
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
          <p className="text-sm text-critical-strong" role="alert">
            {error}
          </p>
        )}
        <SubmitButton loading={loading}>
          {mode === "signup" ? "Create account" : "Sign in"}
        </SubmitButton>
        <p className="text-center text-sm text-ink-secondary">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <Link
                href={`/login${nextQuery}`}
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </Link>
            </>
          ) : (
            <>
              New to MyKavo?{" "}
              <Link
                href={`/signup${nextQuery}`}
                className="font-medium text-primary hover:underline"
              >
                Create an account
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
