"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { BackupCodesPanel, TotpQr, totpSecretFromUri } from "@/components/two-factor";

/**
 * Settings → Security: enable or disable TOTP two-factor authentication.
 * Enabling walks through QR scan → code confirmation → one-time backup
 * codes. Both directions require the account password (server-enforced by
 * Better Auth). Only meaningful for email/password accounts — Google users
 * carry their own 2FA.
 */
export function TwoFactorCard({
  enabled,
  hasPassword,
}: {
  enabled: boolean;
  hasPassword: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "password" | "verify" | "backup" | "disable">(
    "idle",
  );
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setPhase("idle");
    setPassword("");
    setCode("");
    setTotpUri("");
    setBackupCodes([]);
    setError("");
    setLoading(false);
  }

  async function startEnable(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    const result = await authClient.twoFactor.enable({ password });
    if (result.error || !result.data) {
      setError(result.error?.message ?? "Couldn't start enrollment. Check your password.");
      setLoading(false);
      return;
    }
    setTotpUri(result.data.totpURI);
    setBackupCodes(result.data.backupCodes);
    setPhase("verify");
    setLoading(false);
  }

  async function confirmCode(e: React.FormEvent) {
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
    setPhase("backup");
    setLoading(false);
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    const result = await authClient.twoFactor.disable({ password });
    if (result.error) {
      setError(result.error.message ?? "Couldn't disable two-factor auth.");
      setLoading(false);
      return;
    }
    reset();
    router.refresh();
  }

  if (!hasPassword) {
    return (
      <p className="text-sm leading-6 text-ink-secondary">
        You sign in with Google — two-factor authentication is managed by your Google account.
      </p>
    );
  }

  const passwordField = (
    <div>
      <label htmlFor="tf-password" className="mb-1.5 block text-[13px] font-medium text-ink">
        Account password
      </label>
      <input
        id="tf-password"
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="h-11 w-full max-w-sm rounded-field border border-line bg-card px-4 text-[14px] text-ink focus:border-primary focus:outline-none"
      />
    </div>
  );

  const errorLine = error && (
    <p className="text-sm text-critical-strong" role="alert">
      {error}
    </p>
  );

  if (phase === "verify") {
    return (
      <form onSubmit={confirmCode} className="space-y-4">
        <p className="text-sm leading-6 text-ink-secondary">
          Scan with Google Authenticator (or any TOTP app), then enter the 6-digit code it shows.
        </p>
        <TotpQr uri={totpUri} />
        <p className="break-all text-[12px] text-ink-faint">
          Manual key: <span className="font-mono">{totpSecretFromUri(totpUri)}</span>
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="tf-code" className="mb-1.5 block text-[13px] font-medium text-ink">
              6-digit code
            </label>
            <input
              id="tf-code"
              type="text"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-11 w-36 rounded-field border border-line bg-card px-4 font-mono text-[14px] text-ink focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Activate
          </button>
          <button
            type="button"
            onClick={reset}
            className="h-11 rounded-full px-4 text-sm font-medium text-ink-secondary hover:text-ink"
          >
            Cancel
          </button>
        </div>
        {errorLine}
      </form>
    );
  }

  if (phase === "backup") {
    return (
      <div className="space-y-4">
        <BackupCodesPanel codes={backupCodes} />
        <button
          type="button"
          onClick={() => {
            reset();
            router.refresh();
          }}
          className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
        >
          I saved my codes — done
        </button>
      </div>
    );
  }

  if (phase === "password" || phase === "disable") {
    const disabling = phase === "disable";
    return (
      <form onSubmit={disabling ? disable : startEnable} className="space-y-4">
        <p className="text-sm leading-6 text-ink-secondary">
          {disabling
            ? "Confirm your password to turn off two-factor authentication."
            : "Confirm your password to start setting up your authenticator app."}
        </p>
        {passwordField}
        {errorLine}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {disabling ? "Disable two-factor auth" : "Continue"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="h-11 rounded-full px-4 text-sm font-medium text-ink-secondary hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        {enabled ? (
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />
        ) : (
          <ShieldOff className="mt-0.5 size-5 shrink-0 text-ink-faint" aria-hidden />
        )}
        <div>
          <p className="text-sm font-medium text-ink">
            Two-factor authentication is {enabled ? "on" : "off"}
          </p>
          <p className="mt-0.5 text-[13px] leading-5 text-ink-secondary">
            {enabled
              ? "Signing in requires a code from your authenticator app."
              : "Add a Google Authenticator code to every sign-in."}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPhase(enabled ? "disable" : "password")}
        className={`rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
          enabled
            ? "border border-line text-ink-secondary hover:border-critical hover:text-critical-strong"
            : "bg-primary text-primary-contrast hover:bg-primary-hover"
        }`}
      >
        {enabled ? "Disable" : "Enable"}
      </button>
    </div>
  );
}
