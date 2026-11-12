"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { BackupCodesPanel, TotpQr, totpSecretFromUri } from "@/components/two-factor";
import { OtpInput } from "@/components/auth/otp-input";
import { EMAIL_CODE_EXPIRES_IN_SECONDS, EMAIL_CODE_LENGTH, EMAIL_CODE_RESEND_COOLDOWN_SECONDS } from "@/lib/email-code";

/** Where a brand-new account goes once it is in: the first-run page. */
const FIRST_RUN_PATH = "/welcome";

/** The plugin's terse errors, in the form's voice. */
function codeErrorMessage(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("expired")) return "That code has expired. Send a new one below.";
  if (m.includes("too many")) return "Too many wrong tries for this code. Send a new one below.";
  if (m.includes("invalid")) return "That code isn't right. Check the email and try again.";
  return message || "That code didn't work. Try again.";
}

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
        className="h-12 w-full rounded-xl border border-line bg-card px-4 text-[15px] text-ink transition-shadow placeholder:text-ink-faint focus:border-ink focus:shadow-[0_0_0_3px_var(--color-primary-soft)] focus:outline-none"
      />
    </div>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-ink bg-primary text-[15px] font-semibold text-[#16181d] shadow-[3px_3px_0_var(--color-ink)] transition-[transform,box-shadow,background-color] duration-150 hover:-translate-x-px hover:-translate-y-px hover:bg-primary-hover hover:shadow-[4px_4px_0_var(--color-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60 motion-reduce:transition-none"
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
  | "verify" // new account: enter the 6-digit code emailed to it
  | "totp" // login: enter authenticator code
  | "enroll" // signup: scan QR + confirm first code
  | "backup"; // signup: show one-time backup codes

export function AuthForm({
  mode,
  heading,
  googleEnabled = false,
  redirectTo,
  autoGoogle = false,
}: {
  mode: "login" | "signup";
  /** The page's own heading, shown above every step but the code step (which has its own). */
  heading: { eyebrow: string; title: string; subtitle: React.ReactNode };
  googleEnabled?: boolean;
  /** Same-origin relative path to return to after auth (validated server-side). */
  redirectTo?: string;
  /**
   * Start the Google handoff on arrival, for visitors who clicked a
   * "Continue with Google" button on the marketing site. Without this the
   * button would be a small lie: it promises Google and delivers a form.
   */
  autoGoogle?: boolean;
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
  const [notice, setNotice] = useState("");
  // When the code step may ask for another code (client side of the cooldown).
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  function finish() {
    // Signup only finishes after the code step, so it is always a brand-new
    // account: it starts on the first-run page, unless it came with
    // somewhere to go (an invite link).
    router.push(mode === "signup" ? (redirectTo ?? FIRST_RUN_PATH) : target);
    router.refresh();
  }

  // Ticks the resend countdown while the code step is open.
  useEffect(() => {
    if (step !== "verify") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [step]);
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));

  async function sendCode(): Promise<void> {
    setError("");
    setNotice("");
    const result = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "email-verification" });
    if (result.error) {
      // Still cooling down: a code is already on its way, which is fine.
      if (result.error.status === 429) {
        setNotice(result.error.message ?? "A code is already on its way.");
        setResendAt(Date.now() + EMAIL_CODE_RESEND_COOLDOWN_SECONDS * 1000);
        return;
      }
      setError(result.error.message ?? "We could not send a code just now. Try again in a minute.");
      return;
    }
    setNotice(`We sent a new code to ${email.trim()}.`);
    setResendAt(Date.now() + EMAIL_CODE_RESEND_COOLDOWN_SECONDS * 1000);
  }

  function openVerify(codeAlreadySent: boolean) {
    setStep("verify");
    setCode("");
    setError("");
    setNotice("");
    setResendAt(codeAlreadySent ? Date.now() + EMAIL_CODE_RESEND_COOLDOWN_SECONDS * 1000 : 0);
    setNow(Date.now());
    setLoading(false);
  }

  async function continueWithGoogle() {
    if (googleLoading) return;
    setGoogleLoading(true);
    setError("");
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: target,
      // A first Google sign-in is a new account: first-run page, unless an
      // invite link set somewhere to go.
      ...(redirectTo ? {} : { newUserCallbackURL: FIRST_RUN_PATH }),
    });
    if (result.error) {
      setError(result.error.message ?? "Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
    // On success the browser is redirected to Google.
  }

  // Fires once. The ref guard matters because React mounts effects twice in
  // development, and a second call would start a second OAuth handoff.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!autoGoogle || !googleEnabled || autoStarted.current) return;
    autoStarted.current = true;
    void continueWithGoogle();
    // continueWithGoogle is stable for the life of this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGoogle, googleEnabled]);

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    if (mode === "login") {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        // A new account that never typed its code: the password was right,
        // so take them to the code screen and send a fresh code.
        if (result.error.code === "EMAIL_NOT_VERIFIED") {
          openVerify(false);
          await sendCode();
          return;
        }
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

    // Signup: create the account. It has no session until the code from
    // its inbox is typed in (the server sends that code on signup).
    const result = await authClient.signUp.email({ name, email, password });
    if (result.error) {
      setError(result.error.message ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }
    openVerify(true);
  }

  async function submitEmailCode(e?: React.FormEvent, typed?: string) {
    e?.preventDefault();
    const otp = typed ?? code;
    if (loading || otp.length !== EMAIL_CODE_LENGTH) return;
    setLoading(true);
    setError("");
    setNotice("");
    const result = await authClient.emailOtp.verifyEmail({ email: email.trim(), otp });
    if (result.error) {
      setError(codeErrorMessage(result.error.message));
      setCode("");
      setLoading(false);
      return;
    }
    // Signed in now. A new signup goes on to set up two-factor auth, as
    // signup always has; a sign-in that only needed the code is done.
    if (mode === "login") {
      router.push(redirectTo ?? FIRST_RUN_PATH);
      router.refresh();
      return;
    }
    const enable = await authClient.twoFactor.enable({ password });
    if (enable.error || !enable.data) {
      // Account exists and is signed in - don't strand the user on an
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

  const head = (
    <div className="mb-8">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">{heading.eyebrow}</p>
      <h1 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink">{heading.title}</h1>
      <div className="mt-2 text-[15px] leading-6 text-ink-secondary">{heading.subtitle}</div>
    </div>
  );
  const withHead = (node: React.ReactNode) => (
    <>
      {head}
      {node}
    </>
  );

  /* ------------------ new account: the code from the inbox ---------------- */
  if (step === "verify") {
    const minutes = Math.round(EMAIL_CODE_EXPIRES_IN_SECONDS / 60);
    return (
      <form onSubmit={(e) => void submitEmailCode(e)} className="space-y-5">
        <div>
          <span
            aria-hidden
            className="mb-5 inline-flex size-12 items-center justify-center rounded-2xl border-[1.5px] border-ink bg-primary text-[#16181d] shadow-[3px_3px_0_var(--color-ink)]"
          >
            <MailCheck className="size-6" />
          </span>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
            {mode === "signup" ? "Almost there / Confirm email" : "Confirm email"}
          </p>
          <h1 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink">Check your email.</h1>
          <p className="mt-2 text-[15px] leading-6 text-ink-secondary">
            We sent a {EMAIL_CODE_LENGTH}-digit code to{" "}
            <span className="font-medium text-ink">{email.trim()}</span>. Enter it below to{" "}
            {mode === "signup" ? "open your account" : "finish signing in"}. It works for {minutes} minutes.
          </p>
        </div>

        <OtpInput
          value={code}
          onChange={(v) => {
            setCode(v);
            if (error) setError("");
          }}
          onComplete={(v) => void submitEmailCode(undefined, v)}
          disabled={loading}
          invalid={Boolean(error)}
          autoFocus
        />

        {error ? (
          <p className="text-sm text-critical-strong" role="alert">
            {error}
          </p>
        ) : notice ? (
          <p className="text-sm text-ink-secondary" role="status">
            {notice}
          </p>
        ) : null}

        <SubmitButton loading={loading}>{mode === "signup" ? "Confirm and continue" : "Confirm and sign in"}</SubmitButton>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-4 text-[13px]">
          <button
            type="button"
            onClick={() => {
              setStep("credentials");
              setCode("");
              setError("");
              setNotice("");
            }}
            className="inline-flex items-center gap-1.5 font-medium text-ink-secondary hover:text-ink"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Use a different email
          </button>
          {resendIn > 0 ? (
            <span className="font-mono text-[12px] text-ink-faint" aria-live="polite">
              Resend in 0:{String(resendIn).padStart(2, "0")}
            </span>
          ) : (
            <button type="button" onClick={() => void sendCode()} className="font-medium text-accent hover:underline">
              Send a new code
            </button>
          )}
        </div>
        <p className="text-[12.5px] leading-5 text-ink-faint">
          Can&apos;t find it? Check spam or promotions for an email from MyKavo.
        </p>
      </form>
    );
  }

  /* ------------------------- login: TOTP challenge ------------------------ */
  if (step === "totp") {
    return withHead(
      <form onSubmit={submitLoginCode} className="space-y-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-card px-4 py-3">
          <ShieldCheck className="size-4.5 shrink-0 text-accent" aria-hidden />
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
    return withHead(
      <form onSubmit={submitEnrollCode} className="space-y-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-card px-4 py-3">
          <ShieldCheck className="size-4.5 shrink-0 text-accent" aria-hidden />
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
    return withHead(
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-card px-4 py-3">
          <ShieldCheck className="size-4.5 shrink-0 text-accent" aria-hidden />
          <p className="text-[13px] leading-5 text-ink-secondary">
            Two-factor authentication is on. One last thing - save your backup codes.
          </p>
        </div>
        <BackupCodesPanel codes={backupCodes} />
        <button
          type="button"
          onClick={finish}
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-[15px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
        >
          I saved my codes - continue
        </button>
      </div>
    );
  }

  /* --------------------------- credentials form --------------------------- */
  return withHead(
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
                className="font-medium text-accent hover:underline"
              >
                Sign in
              </Link>
            </>
          ) : (
            <>
              New to MyKavo?{" "}
              <Link
                href={`/signup${nextQuery}`}
                className="font-medium text-accent hover:underline"
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
