/**
 * Crash guard: makes startup crashes visible and unrepeatable.
 *
 * Two mechanisms, both backed by SYNCHRONOUS SecureStore writes (async
 * storage cannot be trusted to flush before a dying process exits):
 *
 * 1. Last-crash record - a global JS error handler persists the message and
 *    stack of any fatal error before the OS kills the app.
 * 2. Boot sentinel - "pending" is written when the UI starts mounting and
 *    cleared once the app has been alive for a few seconds (or is sent to
 *    the background, i.e. a normal exit). If a launch finds the sentinel
 *    still pending, the PREVIOUS launch died before stabilizing.
 *
 * When either signal fires, the root layout renders a safe-mode screen that
 * shows the recorded error (screenshot it and report it) and offers a full
 * reset - so a crash loop can never lock the user out of the app.
 */

import { safeSecureStorage } from "./secure-storage";

const CRASH_KEY = "mykavo-last-crash";
const SENTINEL_KEY = "mykavo-boot-state";

/** Keep well under native secure-store value limits. */
const MAX_CRASH_LENGTH = 1600;

export interface CrashRecord {
  message: string;
  stack: string;
  at: string;
}

interface ErrorUtilsLike {
  getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
}

/** Install the global fatal-error recorder. Safe to call more than once. */
export function installCrashGuard(): void {
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!errorUtils?.setGlobalHandler) return;
  const previous = errorUtils.getGlobalHandler?.();
  errorUtils.setGlobalHandler((error, isFatal) => {
    try {
      if (isFatal) recordCrash(error);
    } catch {
      // Recording must never interfere with the original handler.
    }
    previous?.(error, isFatal);
  });
}

export function recordCrash(error: unknown): void {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
  const stack = error instanceof Error && error.stack ? error.stack : "";
  const record: CrashRecord = {
    message: message.slice(0, 300),
    stack: stack.slice(0, MAX_CRASH_LENGTH - 400),
    at: new Date().toISOString(),
  };
  safeSecureStorage.setItem(CRASH_KEY, JSON.stringify(record).slice(0, MAX_CRASH_LENGTH));
}

export function readLastCrash(): CrashRecord | null {
  const raw = safeSecureStorage.getItem(CRASH_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CrashRecord>;
    if (typeof parsed.message !== "string") return null;
    return {
      message: parsed.message,
      stack: typeof parsed.stack === "string" ? parsed.stack : "",
      at: typeof parsed.at === "string" ? parsed.at : "",
    };
  } catch {
    return null;
  }
}

export function clearLastCrash(): void {
  safeSecureStorage.setItem(CRASH_KEY, "");
}

/** True when the previous launch died before reaching a stable state. */
export function wasLastBootInterrupted(): boolean {
  return safeSecureStorage.getItem(SENTINEL_KEY) === "pending";
}

export function markBootPending(): void {
  safeSecureStorage.setItem(SENTINEL_KEY, "pending");
}

/** Call when the app has proven stable OR is exiting normally. */
export function markBootStable(): void {
  safeSecureStorage.setItem(SENTINEL_KEY, "");
}
