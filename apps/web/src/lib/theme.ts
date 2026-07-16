/**
 * Theme preference plumbing (light / dark / follow-the-system).
 *
 * The CSS in globals.css owns the actual colors: dark values apply when the
 * OS prefers dark (and no explicit choice was made) or when <html> carries
 * data-theme="dark". These helpers manage the explicit choice: localStorage
 * persistence, the data-theme attribute, and a subscribable store for React
 * (useSyncExternalStore in components/theme-toggle.tsx).
 *
 * Keep the pure functions here in sync with the inline boot script in
 * app/layout.tsx, which re-implements readStoredThemePreference +
 * applyThemePreference in ~5 lines so the attribute is stamped before paint.
 */

export const THEME_STORAGE_KEY = "mykavo-theme";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_PREFERENCES: readonly ThemePreference[] = [
  "system",
  "light",
  "dark",
];

/** Anything unexpected (old values, tampering, null) falls back to system. */
export function parseThemePreference(raw: unknown): ThemePreference {
  return raw === "light" || raw === "dark" ? raw : "system";
}

/** The theme that actually renders for a preference + OS state. */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

/**
 * data-theme attribute value for a preference; null = remove the attribute
 * (CSS falls back to prefers-color-scheme).
 */
export function themeAttributeValue(preference: ThemePreference): ResolvedTheme | null {
  return preference === "system" ? null : preference;
}

/** Next preference for a single-button cycling toggle: system → light → dark. */
export function cycleThemePreference(current: ThemePreference): ThemePreference {
  const index = THEME_PREFERENCES.indexOf(current);
  return THEME_PREFERENCES[(index + 1) % THEME_PREFERENCES.length];
}

// ---------------------------------------------------------------------------
// Browser-only store (no-ops on the server).
// ---------------------------------------------------------------------------

/** Same-document change signal - localStorage's "storage" event only fires in OTHER tabs. */
const THEME_CHANGE_EVENT = "mykavo-theme-change";

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    return parseThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

/** Stamp (or clear) data-theme on <html> so the CSS overrides kick in. */
export function applyThemePreference(preference: ThemePreference): void {
  if (typeof document === "undefined") return;
  const value = themeAttributeValue(preference);
  if (value) document.documentElement.setAttribute("data-theme", value);
  else document.documentElement.removeAttribute("data-theme");
}

export function setThemePreference(preference: ThemePreference): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Persistence unavailable (private mode etc.) - still apply for this page.
  }
  applyThemePreference(preference);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/** Subscribe to preference changes from this tab and others. */
export function subscribeToThemePreference(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === THEME_STORAGE_KEY) {
      // Another tab changed it - mirror the attribute here too.
      applyThemePreference(readStoredThemePreference());
      onChange();
    }
  };
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
