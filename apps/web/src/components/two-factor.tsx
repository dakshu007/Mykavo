"use client";

import { useEffect, useState } from "react";
import { toDataURL } from "qrcode";

/**
 * Shared TOTP enrollment pieces used by the signup flow and the Settings
 * security card: QR render of the otpauth:// URI (scanned by Google
 * Authenticator or any TOTP app), manual-entry secret fallback, and the
 * one-time backup-codes panel.
 */

/** Pull the base32 secret out of an otpauth:// URI for manual entry. */
export function totpSecretFromUri(uri: string): string {
  try {
    return new URL(uri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

export function TotpQr({ uri, size = 176 }: { uri: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    toDataURL(uri, { width: size * 2, margin: 1 }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [uri, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="mx-auto animate-pulse rounded-xl bg-ink/5"
        aria-hidden
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local data URL
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt="QR code for your authenticator app"
      className="mx-auto rounded-xl border border-line bg-white p-2"
    />
  );
}

export function BackupCodesPanel({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable - codes remain visible to copy by hand.
    }
  }

  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <p className="text-[13px] font-medium text-ink">
        Backup codes - store these somewhere safe.
      </p>
      <p className="mt-1 text-[12px] leading-5 text-ink-secondary">
        Each code signs you in once if you lose access to your authenticator app. They are shown
        only now.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[13px] text-ink">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <button
        type="button"
        onClick={copyAll}
        className="mt-3 rounded-full border border-line px-4 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-ink-faint"
      >
        {copied ? "Copied ✓" : "Copy all"}
      </button>
    </div>
  );
}
