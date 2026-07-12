"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  cycleThemePreference,
  readStoredThemePreference,
  setThemePreference,
  subscribeToThemePreference,
  type ThemePreference,
} from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System theme", icon: Monitor },
  { value: "light", label: "Light theme", icon: Sun },
  { value: "dark", label: "Dark theme", icon: Moon },
];

/** Server renders "system"; the client store takes over after hydration. */
function getServerSnapshot(): ThemePreference {
  return "system";
}

function useThemePreference(): ThemePreference {
  return useSyncExternalStore(
    subscribeToThemePreference,
    readStoredThemePreference,
    getServerSnapshot,
  );
}

/**
 * Three-state segmented theme control (System / Light / Dark) — dashboard
 * sidebar bottom area. Icon-only buttons, labelled for screen readers.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const preference = useThemePreference();

  return (
    <div
      role="group"
      aria-label="Color theme"
      className={cn("inline-flex rounded-full bg-surface p-1", className)}
    >
      {OPTIONS.map((option) => {
        const active = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setThemePreference(option.value)}
            aria-pressed={active}
            aria-label={option.label}
            title={option.label}
            className={cn(
              "inline-flex h-7 flex-1 items-center justify-center rounded-full px-2.5 transition-colors",
              active
                ? "bg-card text-ink shadow-card"
                : "text-ink-faint hover:text-ink",
            )}
          >
            <option.icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Compact icon button for the marketing nav — cycles system → light → dark,
 * showing the current preference's icon.
 */
export function ThemeToggleCompact({ className }: { className?: string }) {
  const preference = useThemePreference();
  const current = OPTIONS.find((o) => o.value === preference) ?? OPTIONS[0];
  const next = OPTIONS.find((o) => o.value === cycleThemePreference(preference)) ?? OPTIONS[0];
  const Icon = current.icon;

  return (
    <button
      type="button"
      onClick={() => setThemePreference(next.value)}
      aria-label={`${current.label} — switch to ${next.label.toLowerCase()}`}
      title={current.label}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-ink/5 hover:text-ink",
        className,
      )}
    >
      <Icon className="size-4.5" aria-hidden />
    </button>
  );
}
