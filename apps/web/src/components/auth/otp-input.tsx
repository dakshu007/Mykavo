"use client";

import { useRef } from "react";
import { cleanEmailCode, EMAIL_CODE_LENGTH } from "@/lib/email-code";
import { cn } from "@/lib/utils";

/**
 * Six boxes for a 6-digit code. Typing moves to the next box, Backspace on an
 * empty box goes back, the arrow keys move, and pasting the whole code (or
 * the browser's one-time-code autofill) fills every box at once. The value is
 * one string of digits; the boxes are only how it is shown.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  invalid = false,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Called with the full code as soon as the last digit is in. */
  onComplete?: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: EMAIL_CODE_LENGTH }, (_, i) => value[i] ?? "");

  function focus(i: number) {
    const el = refs.current[Math.max(0, Math.min(EMAIL_CODE_LENGTH - 1, i))];
    el?.focus();
    el?.select();
  }

  function commit(next: string) {
    const clean = cleanEmailCode(next);
    onChange(clean);
    if (clean.length === EMAIL_CODE_LENGTH) onComplete?.(clean);
  }

  function setDigitAt(i: number, input: string) {
    const typed = cleanEmailCode(input);
    if (!typed) return;
    // More than one digit at once: a paste or autofill into this box.
    if (typed.length > 1) {
      const next = (value.slice(0, i) + typed).slice(0, EMAIL_CODE_LENGTH);
      commit(next);
      focus(next.length);
      return;
    }
    const chars = digits.slice();
    chars[i] = typed;
    const next = chars.join("").slice(0, EMAIL_CODE_LENGTH);
    commit(next);
    if (i < EMAIL_CODE_LENGTH - 1) focus(i + 1);
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) {
        commit(value.slice(0, i) + value.slice(i + 1));
      } else if (i > 0) {
        commit(value.slice(0, i - 1) + value.slice(i));
        focus(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focus(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focus(i + 1);
    }
  }

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="6-digit code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          // The first box takes the browser's one-time-code autofill.
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of ${EMAIL_CODE_LENGTH}`}
          aria-invalid={invalid || undefined}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          // Room for a pasted code; setDigitAt spreads it across the boxes.
          maxLength={EMAIL_CODE_LENGTH}
          value={d}
          onChange={(e) => setDigitAt(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          onPaste={(e) => {
            e.preventDefault();
            setDigitAt(i, e.clipboardData.getData("text"));
          }}
          className={cn(
            "h-14 w-full min-w-0 rounded-xl border bg-card text-center font-mono text-[24px] font-semibold text-ink transition-[border-color,box-shadow] focus:border-ink focus:shadow-[0_0_0_3px_var(--color-primary-soft)] focus:outline-none disabled:opacity-60 sm:h-16 sm:text-[26px]",
            invalid ? "border-critical" : d ? "border-ink" : "border-line",
          )}
        />
      ))}
    </div>
  );
}
